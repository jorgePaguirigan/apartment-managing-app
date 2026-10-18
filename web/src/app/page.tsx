import { createClient } from "@/lib/supabase/server";
import { createHousehold, signOut } from "./actions";
import { Banner, Page, Section, button, input, ghost } from "./_components/ui";
import { AdminView } from "./_components/admin-view";
import { HousemateView } from "./_components/housemate-view";

export default async function Home({ searchParams }: PageProps<"/">) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: me } = await supabase.from("member").select("role, display_name, household:household_id(name)").maybeSingle();

  if (!me) {
    return (
      <Page title="Welcome">
        <Banner error={error as string | undefined} />
        <Section title="Start a household">
          <p className="text-sm text-zinc-600">You become its admin. To join an existing one, open the invite link you were sent.</p>
          <form action={createHousehold} className="space-y-3">
            <input name="name" placeholder="Household name" required className={input} />
            <input name="display_name" placeholder="Your name" required className={input} />
            <select name="timezone" defaultValue="Asia/Manila" aria-label="Time zone" className={input}>
              {Intl.supportedValuesOf("timeZone").map((z) => <option key={z}>{z}</option>)}
            </select>
            <button className={button}>Create household</button>
          </form>
        </Section>
        <form action={signOut}><button className={ghost}>Sign out</button></form>
      </Page>
    );
  }

  const household = me.household as unknown as { name: string } | null;
  return (
    <Page title={household?.name ?? "Household"}>
      <Banner error={error as string | undefined} />
      <p className="text-sm text-zinc-600">{me.display_name} · {me.role}</p>
      {me.role === "admin" ? <AdminView /> : <HousemateView />}
      <form action={signOut}><button className={ghost}>Sign out</button></form>
    </Page>
  );
}
