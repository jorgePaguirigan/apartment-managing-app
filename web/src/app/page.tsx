import { getMe } from "@/lib/me";
import { Banner } from "./_components/ui";
import { Onboarding } from "./_components/onboarding";
import { Landing } from "./_components/landing";
import { AppShell } from "./_components/app-shell";
import { AdminView } from "./_components/admin-view";
import { HousemateView } from "./_components/housemate-view";

export default async function Home({ searchParams }: PageProps<"/">) {
  const { error } = await searchParams;
  const { signedIn, me } = await getMe();
  if (!signedIn) return <Landing error={error as string | undefined} />;

  if (!me) return <Onboarding error={error as string | undefined} />;

  return (
    <AppShell me={me} active="home">
      <Banner error={error as string | undefined} />
      {me.role === "admin" ? (
        <>
          <h1 className="rise display text-4xl font-extrabold">Hi, {me.name}</h1>
          <AdminView />
        </>
      ) : (
        <HousemateView me={me} />
      )}
    </AppShell>
  );
}
