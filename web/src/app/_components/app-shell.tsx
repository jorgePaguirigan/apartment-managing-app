import { Suspense, type ReactNode } from "react";
import { signOut } from "../actions";
import { Roamers } from "./roamers";
import { getHousemates, type Me } from "@/lib/me";
import { PillNav } from "./pill-nav";
import { ThemeToggle } from "./theme-toggle";
import { FiguresToggle } from "./figures-toggle";
import { LiveRefresh } from "./live-refresh";
import { ViewSwitch } from "./view-switch";
import { Avatar, Chip, Icon, type IconName } from "./ui";

type Tab = "home" | "schedule" | "budget" | "leaderboard";
const TABS: { key: Tab; href: string; label: string; icon: IconName }[] = [
  { key: "home", href: "/", label: "Home", icon: "home" },
  { key: "schedule", href: "/schedule", label: "Schedule", icon: "calendar" },
  { key: "budget", href: "/budget", label: "Budget", icon: "wallet" },
  { key: "leaderboard", href: "/leaderboard", label: "Leaderboard", icon: "trophy" },
];

// Top bar everywhere. Tabs sit in the bar on wide screens and float as a pill along the bottom on phones.
export function AppShell({ me, active, children }: { me: Me; active: Tab; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <LiveRefresh />
      <Suspense fallback={null}><ShellRoamers /></Suspense>
      <header className="glass sticky top-0 z-20 bg-bg/70 backdrop-blur-xl backdrop-saturate-150" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="mx-auto flex h-16 w-full max-w-4xl items-center gap-4 px-4 sm:px-6">
          <p className="display min-w-0 flex-1 truncate text-xl font-bold">{me.household}</p>
          <nav aria-label="Main" className="hidden md:block">
            <PillNav id="tabs" items={TABS} active={active} className="flex gap-1 rounded-full bg-surface-2 p-1" linkClass="rounded-full px-4 py-1.5 text-sm font-semibold transition-colors duration-150"
              activeClass="text-bg" idleClass="text-muted hover:text-ink" thumbClass="rounded-full bg-ink" />
          </nav>
          <div className="flex items-center gap-2.5">
            <FiguresToggle />
            <ThemeToggle />
            <span className="hidden min-w-0 items-center gap-2 lg:flex">
              <Avatar name={me.name} className="size-8" />
              <span className="max-w-40 truncate text-sm font-medium">{me.name}</span>
              <Chip tone={me.role === "admin" ? "points" : "muted"}>{me.role}</Chip>
            </span>
            <form action={signOut}>
              <button aria-label="Sign out" title="Sign out" className="grid size-10 place-items-center rounded-full border border-line text-muted transition-[transform,color] duration-150 ease-out hover:text-ink active:scale-[0.94]">
                <Icon name="out" />
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 pt-6 pb-32 sm:px-6 sm:pt-8 md:pb-10">
        {me.alsoHousemate && <div className="rise"><ViewSwitch view={me.role} tall /></div>}
        {children}
      </main>

      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-20 flex justify-center px-4 md:hidden" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
        <PillNav id="dock" items={TABS} active={active} className="flex gap-1 rounded-full bg-ink p-1.5 shadow-lg shadow-black/20" idleLabelClass="sr-only" linkClass="flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold transition-[color,transform] duration-150 ease-out active:scale-[0.96]"
          activeClass="text-[#16171b]" idleClass="text-bg/70" thumbClass="rounded-full bg-accent" />
      </nav>
    </div>
  );
}

// The figures are decoration, so the page does not wait for the housemate list to draw them.
async function ShellRoamers() {
  const housemates = await getHousemates();
  return <Roamers names={housemates.map((h) => h.display_name)} />;
}
