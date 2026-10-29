"use client";

import { useOptimistic, useTransition } from "react";
import { setView } from "../actions";

type View = "admin" | "housemate";

// Admin / Housemate segmented control for an admin who also lives there. The thumb slides to the pressed side at once
// (the page follows when the cookie is saved), so the press is answered before the server is.
export function ViewSwitch({ view, tall = false }: { view: View; tall?: boolean }) {
  const [shown, setShown] = useOptimistic(view);
  const [, start] = useTransition();
  const pick = (v: View) => {
    if (v === shown) return;
    start(async () => { setShown(v); await setView(v); });
  };
  return (
    <div role="group" aria-label="View" className="relative inline-grid grid-cols-2 rounded-full bg-surface-2 p-0.5">
      <span aria-hidden className="absolute inset-y-0.5 left-0.5 w-[calc(50%-0.125rem)] rounded-full bg-ink transition-transform duration-[220ms] ease-[var(--ease-out-strong)] motion-reduce:transition-none"
        style={{ transform: shown === "housemate" ? "translateX(100%)" : undefined }} />
      {(["admin", "housemate"] as const).map((v) => (
        <button key={v} type="button" aria-pressed={shown === v} onClick={() => pick(v)}
          className={`relative z-10 rounded-full px-4 text-sm font-semibold capitalize transition-[color,transform] duration-200 ease-out active:scale-[0.96] ${tall ? "min-h-11" : "min-h-9"} ${shown === v ? "text-bg" : "text-muted [@media(hover:hover)]:hover:text-ink"}`}>
          {v}
        </button>
      ))}
    </div>
  );
}
