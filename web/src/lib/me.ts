import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type Me = { userId: string; role: "admin" | "housemate"; alsoHousemate: boolean; name: string; household: string };

// The signed-in person and their household, fetched once per request. `me` is null until they join or create one.
export const getMe = cache(async (): Promise<{ signedIn: boolean; me: Me | null; removed?: boolean }> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims(); // proxy.ts already verified the session; no extra network call
  const user = data?.claims && { id: data.claims.sub };
  if (!user) return { signedIn: false, me: null };
  const { data: m } = await supabase
    .from("member")
    .select("role, also_housemate, display_name, household:household_id(name)")
    .eq("user_id", user.id) // members can read each other, so without this a second member makes the query return 2 rows
    .maybeSingle();
  if (!m) return { signedIn: true, me: null };
  if (m.role === "removed") return { signedIn: true, me: null, removed: true }; // every page redirects home, which tells them
  // An admin who opted in as a housemate picks a view; `role` is the view they are in, and alsoHousemate is what shows the switch.
  const view = m.role === "admin" && m.also_housemate && (await cookies()).get("view")?.value === "housemate" ? "housemate" : m.role;
  const household = m.household as unknown as { name: string } | null;
  return { signedIn: true, me: { userId: user.id, role: view, alsoHousemate: m.role === "admin" && m.also_housemate, name: m.display_name, household: household?.name ?? "Household" } };
});

// The household's time zone, fetched once per request however many sections ask for it.
export const getTimeZone = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.from("household").select("timezone").single();
  return data?.timezone ?? "Asia/Manila";
});

// Housemates for the shell's figures and the schedule columns. Pages start it early so it runs beside their other calls; cache() makes the shell reuse it.
export const getHousemates = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.from("member").select("user_id, display_name").eq("scored", true).order("display_name"); // admins only get a figure if they opted in as housemates
  return data ?? [];
});
