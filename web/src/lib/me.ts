import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type Me = { userId: string; role: "admin" | "housemate"; name: string; household: string };

// The signed-in person and their household, fetched once per request. `me` is null until they join or create one.
export const getMe = cache(async (): Promise<{ signedIn: boolean; me: Me | null }> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims(); // proxy.ts already verified the session; no extra network call
  const user = data?.claims && { id: data.claims.sub };
  if (!user) return { signedIn: false, me: null };
  const { data: m } = await supabase
    .from("member")
    .select("role, display_name, household:household_id(name)")
    .eq("user_id", user.id) // members can read each other, so without this a second member makes the query return 2 rows
    .maybeSingle();
  if (!m) return { signedIn: true, me: null };
  const household = m.household as unknown as { name: string } | null;
  return { signedIn: true, me: { userId: user.id, role: m.role, name: m.display_name, household: household?.name ?? "Household" } };
});

// Housemates for the shell's figures and the schedule columns. Pages start it early so it runs beside their other calls; cache() makes the shell reuse it.
export const getHousemates = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.from("member").select("user_id, display_name").eq("role", "housemate").order("display_name"); // admins never get a figure
  return data ?? [];
});
