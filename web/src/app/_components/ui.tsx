import type { ReactNode } from "react";

export const input = "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-900";
export const button = "rounded-lg bg-zinc-900 px-4 py-2 text-base font-medium text-white active:bg-zinc-700";
export const ghost = "rounded-lg border border-zinc-300 px-3 py-1.5 text-sm";

export function Page({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-md flex-1 space-y-6 p-4">
      <h1 className="text-2xl font-semibold">{title}</h1>
      {children}
    </main>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-medium">{title}</h2>
      {children}
    </section>
  );
}

export function Banner({ error, info }: { error?: string; info?: string }) {
  if (!error && !info) return null;
  return (
    <p role={error ? "alert" : "status"} className={`rounded-lg p-3 text-sm ${error ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}>
      {error ?? info}
    </p>
  );
}
