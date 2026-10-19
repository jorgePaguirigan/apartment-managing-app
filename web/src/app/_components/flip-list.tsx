"use client";

import { useEffect, useRef, type ReactNode } from "react";

// Rows keep their place visually when the order changes between visits (e.g. switching leaderboard period):
// each child with data-flip-id slides from where it was. Positions are remembered for 10s in sessionStorage.
export function FlipList({ id, className, children }: { id: string; className?: string; children: ReactNode }) {
  const list = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const rows = [...(list.current?.children ?? [])] as HTMLElement[];
    const now: Record<string, number> = {};
    for (const r of rows) if (r.dataset.flipId) now[r.dataset.flipId] = r.offsetTop;
    try {
      const prev = JSON.parse(sessionStorage.getItem(`flip:${id}`) ?? "null") as { at: number; top: Record<string, number> } | null;
      if (prev && Date.now() - prev.at < 10_000 && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
        for (const r of rows) {
          const from = prev.top[r.dataset.flipId ?? ""];
          const dy = from === undefined ? 0 : from - now[r.dataset.flipId!];
          if (Math.abs(dy) > 1) r.animate([{ transform: `translateY(${dy}px)` }, { transform: "none" }], { duration: 320, easing: "cubic-bezier(0.23, 1, 0.32, 1)" });
        }
      }
      sessionStorage.setItem(`flip:${id}`, JSON.stringify({ at: Date.now(), top: now }));
    } catch {}
  });
  return <ol ref={list} className={className}>{children}</ol>;
}
