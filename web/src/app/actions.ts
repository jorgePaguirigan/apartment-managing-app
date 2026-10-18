"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safe-next";
import { errorCode } from "@/lib/errors";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

function fail(message: string, to = "/"): never {
  redirect(`${to}?error=${errorCode(message)}`);
}

// Runs a database call; on error shows the message, on success refreshes the page.
async function done(error: { message: string } | null, to = "/") {
  if (error) fail(error.message, to);
  revalidatePath("/");
}

export async function signIn(formData: FormData) {
  const email = str(formData, "email");
  const next = safeNext(str(formData, "next"));
  const h = await headers();
  const origin = h.get("origin") ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error) fail(error.message, "/login");
  redirect("/login?sent=1");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
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

export async function decideClaim(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("decide_claim", { p_claim: str(formData, "claim"), p_accept: str(formData, "accept") === "1" });
  await done(error);
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
  const { data: me } = await supabase.from("member").select("household_id").single();
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
