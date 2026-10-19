import type { ReactNode } from "react";
import { Logo } from "./landing";

// Centered card on the paper background, for onboarding and joining.
export function CenterCard({ children }: { children: ReactNode }) {
  return (
    <main className="relative isolate grid min-h-svh place-items-center">
      <div className="pad-safe w-full max-w-md space-y-6">
        <Logo />
        <div className="rise rounded-[2rem] border border-line bg-surface p-6 shadow-[var(--shadow)] sm:p-8">{children}</div>
      </div>
    </main>
  );
}
