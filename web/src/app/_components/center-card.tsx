import type { ReactNode } from "react";
import { Logo } from "./landing";

// Centered card on the landing background, for onboarding and joining.
export function CenterCard({ children }: { children: ReactNode }) {
  return (
    <main className="glow grid min-h-svh place-items-center">
      <div className="pad-safe w-full max-w-md space-y-6">
        <Logo />
        <div className="rise rounded-3xl border border-line bg-surface p-6 shadow-xl shadow-black/5 sm:p-8">{children}</div>
      </div>
    </main>
  );
}
