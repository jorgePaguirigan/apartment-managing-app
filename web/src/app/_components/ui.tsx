import type { ReactNode } from "react";
import { errorText } from "@/lib/errors";

// Hover styles only apply on devices that can hover (Tailwind v4 default), press feedback works everywhere.
export const input =
  "w-full rounded-2xl border border-line bg-surface px-4 py-3 text-base text-ink outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted/70 focus:border-ink focus:ring-4 focus:ring-accent";
export const button =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-ink px-5 py-2.5 text-base font-semibold text-bg transition-[transform,opacity] duration-150 ease-out hover:opacity-85 [@media(hover:hover)]:hover:-translate-y-px active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50";
export const ghost =
  "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full border border-line bg-transparent px-3.5 py-2 text-sm font-medium text-ink transition-[transform,background-color] duration-150 ease-out hover:bg-surface-2 [@media(hover:hover)]:hover:-translate-y-px active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50";
// Round icon button for moving a group up or down.
export const arrow =
  "grid size-8 place-items-center rounded-full border border-line text-muted transition-[transform,color,background-color,opacity] duration-150 ease-out hover:bg-surface-2 hover:text-ink active:scale-90 disabled:pointer-events-none disabled:opacity-30";

export const danger =
  "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full bg-bad px-3.5 py-2 text-sm font-semibold text-bg transition-[transform,opacity] duration-150 ease-out hover:opacity-85 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50";

const ICONS = {
  home: "M3 11.5 12 4l9 7.5M5.5 10v9.5h13V10M10 19.5v-5h4v5",
  trophy: "M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4ZM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3",
  calendar: "M5 5h14v15H5zM5 10h14M9 3v4M15 3v4",
  check: "m5 12.5 4.5 4.5L19 7.5",
  x: "M6 6l12 12M18 6 6 18",
  plus: "M12 5v14M5 12h14",
  pencil: "M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4",
  chevron: "m9 6 6 6-6 6",
  grip: "M8 6a1 1 0 1 0 2 0a1 1 0 1 0-2 0M14 6a1 1 0 1 0 2 0a1 1 0 1 0-2 0M8 12a1 1 0 1 0 2 0a1 1 0 1 0-2 0M14 12a1 1 0 1 0 2 0a1 1 0 1 0-2 0M8 18a1 1 0 1 0 2 0a1 1 0 1 0-2 0M14 18a1 1 0 1 0 2 0a1 1 0 1 0-2 0",
  copy: "M9 9h10v10H9zM5 15V5h10",
  share: "M12 4v11M8 8l4-4 4 4M5 14v5h14v-5",
  medal: "M8 3h3l1 4M16 3h-3l-1 4M12 21a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z",
  wash: "M5 3h14v18H5zM5 8h14M12 18a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z",
  wallet: "M4 7h15a1 1 0 0 1 1 1v11H5a1 1 0 0 1-1-1V7Zm0 0V6a2 2 0 0 1 2-2h11M16 14h2",
  out: "M10 5H5v14h5M14 8l4 4-4 4M18 12H9",
  monitor: "M4 5h16v11H4zM9 20h6M12 16v4",
  sun: "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4",
  moon: "M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z",
  star: "m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3Z",
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({ name, className = "size-5" }: { name: IconName; className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={`${className} shrink-0`} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d={ICONS[name]} />
    </svg>
  );
}

export function Section({ title, count, children }: { title: string; count?: number; children: ReactNode }) {
  return (
    <section className="rise space-y-3">
      <h2 className="eyebrow flex items-center gap-2 px-1">
        {title}
        {!!count && <span className="rounded-full bg-accent px-2 py-0.5 text-[0.7rem] tracking-normal text-[#16171b] tabular-nums">{count}</span>}
      </h2>
      <div className="space-y-3 rounded-[1.75rem] border border-line bg-surface/95 p-4 shadow-[var(--shadow)] sm:p-5">{children}</div>
    </section>
  );
}

export function Banner({ error, info }: { error?: string; info?: string }) {
  const text = errorText(error) ?? info;
  if (!text) return null;
  return (
    <p
      role={error ? "alert" : "status"}
      className={`rounded-2xl border p-3.5 text-sm font-medium ${error ? "border-bad/40 bg-bad/10 text-bad" : "border-ok/40 bg-ok/10 text-ok"}`}
    >
      {text}
    </p>
  );
}

const TONES = {
  ok: "bg-ok/15 text-ok",
  bad: "bg-bad/15 text-bad",
  warn: "bg-warn/15 text-warn",
  points: "bg-accent text-[#16171b]",
  muted: "bg-surface-2 text-muted",
};

export function Chip({ tone = "muted", className = "text-xs px-2.5 py-0.5", children }: { tone?: keyof typeof TONES; className?: string; children: ReactNode }) {
  return <span className={`inline-flex items-center gap-1 rounded-full font-semibold tabular-nums ${className} ${TONES[tone]}`}>{children}</span>;
}

// Initial in a pastel circle; the hue comes from the name so it stays the same everywhere.
export function Avatar({ name, className = "size-10" }: { name: string; className?: string }) {
  const hue = [...name].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7);
  return (
    <span aria-hidden style={{ background: `hsl(${hue} 70% 78%)` }} className={`${className} display grid shrink-0 place-items-center rounded-full text-sm font-bold text-[#16171b]`}>
      {name.trim()[0]?.toUpperCase() ?? "?"}
    </span>
  );
}

// Shortcut hint. Hidden on touch screens, where there is no keyboard.
export function Kbd({ children }: { children: ReactNode }) {
  return <kbd aria-hidden className="ml-1 hidden rounded-md border border-current/30 px-1.5 text-xs font-medium opacity-60 [@media(hover:hover)]:inline">{children}</kbd>;
}
