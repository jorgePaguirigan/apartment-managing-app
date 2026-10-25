import { getMe } from "@/lib/me";
import { Banner } from "./_components/ui";
import { Onboarding } from "./_components/onboarding";
import { lastAccount } from "@/lib/last-account";
import { Landing } from "./_components/landing";
import { AppShell } from "./_components/app-shell";
import { AdminView } from "./_components/admin-view";
import { HousemateView } from "./_components/housemate-view";
import { CenterCard } from "./_components/center-card";
import { signOut, setAlsoHousemate } from "./actions";
import { button, ghost } from "./_components/ui";

export default async function Home({ searchParams }: PageProps<"/">) {
  const { error } = await searchParams;
  const { signedIn, me, removed } = await getMe();
  if (!signedIn) return <Landing last={await lastAccount()} error={error as string | undefined} />;

  if (removed) return <Removed />;
  if (!me) return <Onboarding error={error as string | undefined} />;

  return (
    <AppShell me={me} active="home">
      <Banner error={error as string | undefined} />
      {me.role === "admin" ? (
        <>
          <div className="rise flex flex-wrap items-center justify-between gap-3">
            <h1 className="display text-4xl font-extrabold">Hi, {me.name}</h1>
            <form action={setAlsoHousemate}>
              <input type="hidden" name="on" value={me.alsoHousemate ? "0" : "1"} />
              <button className={ghost}>{me.alsoHousemate ? "Stop being a housemate" : "I live here too"}</button>
            </form>
          </div>
          <AdminView />
        </>
      ) : (
        <HousemateView me={me} />
      )}
    </AppShell>
  );
}

function Removed() {
  return (
    <CenterCard>
      <h1 className="display text-3xl font-extrabold">You were removed</h1>
      <p className="mt-2 text-muted">An admin removed you from this household. Your past points stay in its history. Ask the admin if this is a mistake.</p>
      <form action={signOut} className="mt-6"><button className={`${button} w-full`}>Sign out</button></form>
    </CenterCard>
  );
}
