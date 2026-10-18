import Link from "next/link";
import type { ReactNode } from "react";
import { signOut } from "../actions";
import type { Me } from "@/lib/me";
import { Avatar, Chip, ghost } from "./ui";

const TABS = [
  { key: "home", href: "/", label: "Home", icon: <path d="M3 11.5 12 4l9 7.5M5.5 10v9.5h13V10" /> },
  { key: "leaderboard", href: "/leaderboard", label: "Leaderboard", icon: <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4ZM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" /> },
] as const;

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

// Top bar everywhere, tabs in the bar on wide screens and along the bottom on phones.
export function AppShell({ me, active, children }: { me: Me; active: "home" | "leaderboard"; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b border-line bg-bg/80 backdrop-blur-md" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="mx-auto flex h-14 w-full max-w-4xl items-center gap-4 px-4 sm:px-6">
          <p className="min-w-0 flex-1 truncate font-semibold tracking-tight">{me.household}</p>
          <nav aria-label="Main" className="hidden gap-1 md:flex">
            {TABS.map((t) => (
              <Link key={t.key} href={t.href} aria-current={t.key === active ? "page" : undefined}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${t.key === active ? "bg-surface-2 text-ink" : "text-muted hover:text-ink"}`}>
                {t.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2.5">
            <span className="hidden items-center gap-2 sm:flex">
              <Avatar name={me.name} className="size-8" />
              <span className="text-sm font-medium">{me.name}</span>
              <Chip tone={me.role === "admin" ? "warn" : "muted"}>{me.role}</Chip>
            </span>
            <form action={signOut}><button className={ghost}>Sign out</button></form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 space-y-5 px-4 py-5 pb-28 sm:px-6 sm:py-6 md:pb-8">{children}</main>

      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-bg/90 backdrop-blur-md md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <ul className="mx-auto grid max-w-md grid-cols-2">
          {TABS.map((t) => (
            <li key={t.key}>
              <Link href={t.href} aria-current={t.key === active ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-medium transition-[color,transform] duration-150 active:scale-95 ${t.key === active ? "text-accent" : "text-muted"}`}>
                <Icon>{t.icon}</Icon>
                {t.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
