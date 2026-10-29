"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safe-next";
import { errorCode } from "@/lib/errors";
import { lastAccount } from "@/lib/last-account";
import type { Period } from "@/lib/period";
import type { HistoryRow } from "./_components/history-list";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

function fail(message: string, to = "/"): never {
  redirect(`${to}${to.includes("?") ? "&" : "?"}error=${errorCode(message)}`);
}

// The caller's household, for inserts into tables admins write directly. Every member row returned is in the same household.
async function householdId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase.from("member").select("household_id").limit(1).single();
  if (!data) fail("no household");
  return data.household_id as string;
}

// Runs a database call; on error shows the message, on success refreshes the page.
async function done(error: { message: string } | null, to = "/") {
  if (error) fail(error.message, to);
  revalidatePath("/");
}

// Google is the only sign-in. Supabase sends the person to Google, then back to /auth/callback.
export async function signInWithGoogle(formData: FormData) {
  const next = safeNext(str(formData, "next"));
  const h = await headers();
  const origin = h.get("origin") ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const last = formData.get("remembered") ? await lastAccount() : null;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      queryParams: last ? { login_hint: last.email } : { prompt: "select_account" },
    },
  });
  if (error || !data.url) fail(error?.message ?? "bad link", `/login?next=${encodeURIComponent(next)}`);
  redirect(data.url);
}

// Magic link: Supabase emails a one-time link that lands on /auth/callback like Google does.
export async function signInWithEmail(formData: FormData) {
  const next = safeNext(str(formData, "next"));
  const email = str(formData, "email").toLowerCase();
  const back = `/login?next=${encodeURIComponent(next)}`;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail("invalid email", back);
  const h = await headers();
  const origin = h.get("origin") ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error) fail(error.message, back);
  redirect(`${back}&sent=1`);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// Admins who opted in as housemates flip between the two views; the choice lives in a cookie.
export async function switchView() {
  const jar = await cookies();
  jar.set("view", jar.get("view")?.value === "housemate" ? "admin" : "housemate", { path: "/", maxAge: 60 * 60 * 24 * 365 });
  revalidatePath("/", "layout");
}

export async function setAlsoHousemate(formData: FormData) {
  const supabase = await createClient();
  await done((await supabase.rpc("set_also_housemate", { p_on: formData.get("on") === "1" })).error);
  revalidatePath("/", "layout");
}

// Accepts a pasted invite link or just its code.
export async function openInvite(formData: FormData) {
  const code = str(formData, "invite").split("/").filter(Boolean).pop();
  if (!code) fail("invite not found");
  redirect(`/join/${encodeURIComponent(code)}`);
}

export async function createHousehold(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_household", {
    p_name: str(formData, "name"),
    p_display_name: str(formData, "display_name"),
    p_timezone: str(formData, "timezone") || "Asia/Manila",
  });
  await done(error);
}

export async function joinHousehold(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("join_household", {
    p_code: str(formData, "code"),
    p_display_name: str(formData, "display_name"),
  });
  await done(error, `/join/${encodeURIComponent(str(formData, "code"))}`);
  redirect("/");
}

export async function submitClaim(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_claim", { p_deed: str(formData, "deed"), p_note: str(formData, "note") || null });
  await done(error);
}

export async function submitCustomClaim(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_custom_claim", { p_title: str(formData, "title"), p_note: str(formData, "note") || null });
  await done(error);
}

// `points` is only sent for custom claims, where the admin sets them.
export async function decideClaim(formData: FormData) {
  const supabase = await createClient();
  const points = str(formData, "points");
  const { error } = await supabase.rpc("decide_claim", {
    p_claim: str(formData, "claim"),
    p_accept: str(formData, "accept") === "1",
    p_points: points ? Number(points) : null,
  });
  await done(error);
}

// Accepts every waiting catalog claim. Custom claims are skipped: the admin has to set their points.
export async function acceptAll() {
  const supabase = await createClient();
  const { data } = await supabase.from("claim").select("id").eq("status", "pending").not("deed_id", "is", null);
  for (const { id } of data ?? []) {
    const { error } = await supabase.rpc("decide_claim", { p_claim: id, p_accept: true });
    if (error && !error.message.includes("already decided")) fail(error.message);
  }
  revalidatePath("/");
}

// The confirm page behind the Accept and Reject buttons in an admin email. The token in the link is the only credential.
export async function decideByLink(formData: FormData) {
  const token = str(formData, "token");
  if (!/^[0-9a-f]{64}$/.test(token)) redirect("/login");
  const supabase = await createClient();
  const { error } = await supabase.rpc("decide_claim_by_token", { p_token: token, p_accept: formData.get("accept") === "1" });
  if (error) fail(error.message, `/decide/${token}`);
  redirect(`/decide/${token}`);
}

// The admin's choice of when housemates get the claim emails: right away, or at set times, with optional quiet hours.
export async function saveSchedule(formData: FormData) {
  const supabase = await createClient();
  const instant = str(formData, "mode") !== "times";
  const quiet = instant && formData.get("quiet") === "on";
  const times = instant && !quiet ? [] : formData.getAll("time").map(String).filter(Boolean);
  const { error } = await supabase.rpc("set_send_schedule", {
    p_instant: instant, p_times: times,
    p_quiet_from: quiet ? str(formData, "quiet_from") : null, p_quiet_until: quiet ? str(formData, "quiet_until") : null,
  });
  await done(error);
}

export async function award(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("award", { p_member: str(formData, "member"), p_deed: str(formData, "deed") });
  await done(error);
}

// `deed` is a penalty id, or "other" with a typed `title`.
export async function submitReport(formData: FormData) {
  const supabase = await createClient();
  const deed = str(formData, "deed");
  const { error } = await supabase.rpc("submit_report", {
    p_subject: str(formData, "subject"),
    p_deed: deed === "other" ? null : deed,
    p_title: deed === "other" ? str(formData, "title") : null,
    p_anonymous: formData.get("anonymous") === "on",
  });
  await done(error);
}

// `points` is a positive number of points to take off, only sent for typed demerits.
export async function decideReport(formData: FormData) {
  const supabase = await createClient();
  const points = str(formData, "points");
  const { error } = await supabase.rpc("decide_report", {
    p_report: str(formData, "report"),
    p_accept: str(formData, "accept") === "1",
    p_points: points ? -Math.abs(Number(points)) : null,
  });
  await done(error);
}

export async function removeHousemate(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("remove_housemate", { p_member: str(formData, "member") });
  await done(error);
  revalidatePath("/", "layout"); // the leaderboard, schedule and budget pages the admin visited must not keep showing them
}

export async function makeAdmin(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("make_admin", { p_member: str(formData, "member") });
  await done(error);
  revalidatePath("/", "layout");
}

export async function createInvite() {
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_invite", { p_role: "housemate" });
  await done(error);
}

export async function revokeInvite(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("revoke_invite", { p_code: str(formData, "code") });
  await done(error);
}

export async function saveDeed(formData: FormData) {
  const points = Number(str(formData, "points"));
  if (!Number.isInteger(points) || points === 0) fail("invalid points");
  const supabase = await createClient();
  const household = await householdId(supabase);
  const { error } = await supabase.from("deed").insert({
    household_id: household,
    name: str(formData, "name"),
    points,
    kind: points > 0 ? "good" : "penalty",
    group_id: str(formData, "group") || null,
  });
  await done(error);
}

// Past score entries keep the points they were created with, so editing is always safe.
export async function editDeed(formData: FormData) {
  const points = Number(str(formData, "points"));
  if (!Number.isInteger(points) || points === 0) fail("invalid points");
  const supabase = await createClient();
  const { error } = await supabase.from("deed")
    .update({ name: str(formData, "name"), points, kind: points > 0 ? "good" : "penalty" })
    .eq("id", str(formData, "deed"));
  await done(error);
}

export async function deleteEntry(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_entry", { p_entry: str(formData, "entry") });
  await done(error);
}

export async function addGroup(formData: FormData) {
  const supabase = await createClient();
  const { count } = await supabase.from("deed_group").select("id", { count: "exact", head: true });
  const { error } = await supabase.from("deed_group").insert({ household_id: await householdId(supabase), name: str(formData, "name"), position: count ?? 0 });
  await done(error);
}

// Called by the catalog when the admin drops a deed on a group. null means Ungrouped.
export async function moveDeed(deed: string, group: string | null) {
  const supabase = await createClient();
  const { error } = await supabase.from("deed").update({ group_id: group }).eq("id", deed);
  await done(error);
}

// Called by the catalog after the admin drags a group: ids in their new order.
export async function reorderGroups(ids: string[]) {
  const supabase = await createClient();
  const results = await Promise.all(ids.map((id, position) => supabase.from("deed_group").update({ position }).eq("id", id)));
  await done(results.find((r) => r.error)?.error ?? null);
}

// A member's own order of catalog groups for their "I did…" cards. Never changes the admin's catalog.
export async function setMyGroupOrder(ids: string[]) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_my_group_order", { p_ids: ids });
  await done(error);
}

// The deed leaves the catalog; past entries keep its name and points.
export async function deleteDeed(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_deed", { p_deed: str(formData, "deed") });
  await done(error);
}

export async function setDeedActive(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("deed").update({ active: str(formData, "active") === "1" }).eq("id", str(formData, "deed"));
  await done(error);
}

// The schedule page has its own cache entry and error banner.
// Dibs can come from Home's Available chores too, so errors go back to whichever page sent the form.
function doneSchedule(error: { message: string } | null, from?: FormData) {
  if (error) fail(error.message, from && str(from, "from") === "/" ? "/" : "/schedule");
  revalidatePath("/schedule");
  revalidatePath("/");
}

export async function dibChore(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("dib_chore", { p_instance: str(formData, "instance") });
  doneSchedule(error, formData);
}

export async function undibChore(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("undib_chore", { p_instance: str(formData, "instance") });
  doneSchedule(error);
}

export async function completeChore(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("complete_chore", { p_instance: str(formData, "instance") });
  doneSchedule(error);
}

// Called by the board when the admin drops a card on a housemate. null means back to unassigned.
export async function assignChore(instance: string, member: string | null) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("assign_chore", { p_instance: instance, p_member: member });
  doneSchedule(error);
}

export async function saveChore(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("upsert_chore", {
    p_id: str(formData, "id") || null,
    p_name: str(formData, "name"),
    p_area: str(formData, "area") || null,
    p_weekday: Number(str(formData, "weekday")),
    p_weight: Number(str(formData, "weight")),
    p_deed: str(formData, "deed") || null,
    p_active: str(formData, "active") !== "0",
  });
  doneSchedule(error);
}

function doneBudget(error: { message: string } | null) {
  if (error) fail(error.message, "/budget");
  revalidatePath("/budget");
}

export async function saveCategory(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("upsert_category", {
    p_id: str(formData, "id") || null,
    p_name: str(formData, "name"),
    p_amount: Number(str(formData, "amount")),
    p_active: formData.has("active") ? str(formData, "active") !== "0" : null, // absent: leave as is
  });
  doneBudget(error);
}

export async function logSpend(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("log_spend", {
    p_category: str(formData, "category"),
    p_amount: Number(str(formData, "amount")),
    p_note: str(formData, "note") || null,
  });
  doneBudget(error);
}

// One housemate's scored entries, newest first, for the leaderboard cards. Read through the same household read policy as the
// rest of the app, so nobody outside the household (or a removed member) comes back with rows.
export async function memberHistory(memberId: string, period: Period): Promise<HistoryRow[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("member_history", { p_member: memberId, p_period: period });
  return ((data ?? []) as { id: string; points: number; title: string | null; source: "claim" | "admin"; created_at: string; deleted_at: string | null; report_note: string | null }[])
    .map((e) => ({ id: e.id, title: e.title ?? "", at: e.created_at, note: e.report_note, status: e.source === "claim" ? "accepted" : "awarded", points: e.points, deleted: !!e.deleted_at }));
}
