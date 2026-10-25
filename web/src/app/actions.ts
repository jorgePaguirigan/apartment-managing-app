"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safe-next";
import { errorCode } from "@/lib/errors";
import { lastAccount } from "@/lib/last-account";

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

export async function award(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("award", { p_member: str(formData, "member"), p_deed: str(formData, "deed") });
  await done(error);
}

export async function removeHousemate(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("remove_housemate", { p_member: str(formData, "member") });
  await done(error);
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
  const { error } = await supabase.from("deed_group").insert({ household_id: await householdId(supabase), name: str(formData, "name") });
  await done(error);
}

// Called by the catalog when the admin drops a deed on a group. null means Ungrouped.
export async function moveDeed(deed: string, group: string | null) {
  const supabase = await createClient();
  const { error } = await supabase.from("deed").update({ group_id: group }).eq("id", deed);
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
