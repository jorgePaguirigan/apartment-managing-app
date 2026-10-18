"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safe-next";
import { errorCode } from "@/lib/errors";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

function fail(message: string, to = "/"): never {
  redirect(`${to}${to.includes("?") ? "&" : "?"}error=${errorCode(message)}`);
}

// Runs a database call; on error shows the message, on success refreshes the page.
async function done(error: { message: string } | null, to = "/") {
  if (error) fail(error.message, to);
  revalidatePath("/");
}

// Email and password: no email round trip, so no email rate limit. The session cookie keeps people signed in on that browser.
async function authenticate(formData: FormData, signUp: boolean) {
  const email = str(formData, "email");
  const password = String(formData.get("password") ?? "");
  const next = safeNext(str(formData, "next"));
  const back = `/login?mode=${signUp ? "signup" : "signin"}&next=${encodeURIComponent(next)}`;
  if (signUp && password.length < 8) fail("weak password", back);
  const h = await headers();
  const origin = h.get("origin") ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const supabase = await createClient();
  const { data, error } = signUp
    ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` } })
    : await supabase.auth.signInWithPassword({ email, password });
  if (error) fail(error.message, back);
  // No session after sign-up means the project still requires email confirmation.
  if (signUp && !data.session) redirect("/login?sent=1");
  redirect(next);
}

export async function signIn(formData: FormData) {
  await authenticate(formData, false);
}

export async function signUp(formData: FormData) {
  await authenticate(formData, true);
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
  const { data: me } = await supabase.from("member").select("household_id").limit(1).single(); // everyone returned is in the same household
  if (!me) fail("no household");
  const { error } = await supabase.from("deed").insert({
    household_id: me.household_id,
    name: str(formData, "name"),
    points,
    kind: points > 0 ? "good" : "penalty",
  });
  await done(error);
}

export async function setDeedActive(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("deed").update({ active: str(formData, "active") === "1" }).eq("id", str(formData, "deed"));
  await done(error);
}
