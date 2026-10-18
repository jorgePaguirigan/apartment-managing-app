import { getMe } from "@/lib/me";
import { createHousehold, signOut } from "./actions";
import { Banner, Page, Section, button, input, ghost } from "./_components/ui";
import { Landing } from "./_components/landing";
import { AppShell } from "./_components/app-shell";
import { AdminView } from "./_components/admin-view";
import { HousemateView } from "./_components/housemate-view";

export default async function Home({ searchParams }: PageProps<"/">) {
  const { error, sent } = await searchParams;
  const { signedIn, me } = await getMe();
  if (!signedIn) return <Landing error={error as string | undefined} sent={!!sent} />;

  if (!me) {
    return (
      <Page title="Welcome">
        <Banner error={error as string | undefined} />
        <Section title="Start a household">
          <p className="text-sm text-muted">You become its admin. To join an existing one, open the invite link you were sent.</p>
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

  return (
    <AppShell me={me} active="home">
      <Banner error={error as string | undefined} />
      {me.role === "admin" ? (
        <>
          <h1 className="rise text-3xl font-semibold tracking-tight">Hi, {me.name}</h1>
          <AdminView />
        </>
      ) : (
        <HousemateView me={me} />
      )}
    </AppShell>
  );
}
