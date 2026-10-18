import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type Me = { userId: string; role: "admin" | "housemate"; name: string; household: string };

// The signed-in person and their household, fetched once per request. `me` is null until they join or create one.
export const getMe = cache(async (): Promise<{ signedIn: boolean; me: Me | null }> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { signedIn: false, me: null };
  const { data: m } = await supabase
    .from("member")
    .select("role, display_name, household:household_id(name)")
    .maybeSingle();
  if (!m) return { signedIn: true, me: null };
  const household = m.household as unknown as { name: string } | null;
  return { signedIn: true, me: { userId: user.id, role: m.role, name: m.display_name, household: household?.name ?? "Household" } };
});
