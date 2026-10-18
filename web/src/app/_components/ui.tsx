import type { ReactNode } from "react";
import { errorText } from "@/lib/errors";

// Hover styles only apply on devices that can hover (Tailwind v4 default), press feedback works everywhere.
export const input =
  "w-full rounded-xl border border-line bg-surface px-4 py-3 text-base text-ink shadow-sm outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted/70 focus:border-accent focus:ring-4 focus:ring-accent/20";
export const button =
  "inline-flex min-h-11 items-center justify-center rounded-xl bg-ink px-5 py-2.5 text-base font-medium text-bg transition-[transform,opacity] duration-150 ease-out hover:opacity-90 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-60";
export const ghost =
  "inline-flex min-h-9 items-center justify-center rounded-xl border border-line bg-surface px-3.5 py-2 text-sm font-medium text-ink transition-[transform,background-color] duration-150 ease-out hover:bg-surface-2 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-60";

export function Page({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-5 p-4 sm:p-6">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {children}
    </main>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3 rounded-2xl border border-line bg-surface p-4 shadow-sm sm:p-5">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

export function Banner({ error, info }: { error?: string; info?: string }) {
  const text = errorText(error) ?? info;
  if (!text) return null;
  return (
    <p
      role={error ? "alert" : "status"}
      className={`rounded-xl border p-3 text-sm ${error ? "border-bad/30 bg-bad/10 text-bad" : "border-ok/30 bg-ok/10 text-ok"}`}
    >
      {text}
    </p>
  );
}
