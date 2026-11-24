"use client";

import { useState, type CSSProperties } from "react";

export type Streak = { days: number; today_done: boolean; today_waiting: boolean };

// Fixed particle paths, so every load looks the same and nothing is worked out per frame: [dx, dy, seconds, delay].
const SMOKE = [[3, -18, 2.8, 0], [-4, -17, 2.8, 0.7], [5, -20, 2.8, 1.4], [-2, -16, 2.8, 2.1]];
const SPARKS = [[-5, -20, 1.1, 0], [4, -24, 1.4, 0.25], [-2, -15, 0.9, 0.5], [7, -18, 1.2, 0.7], [-7, -22, 1.5, 0.95], [2, -14, 1.0, 1.15], [-3, -24, 1.3, 1.3]];
// The burst when today starts to count: 12 sparks fanned upward.
const BURST = Array.from({ length: 12 }, (_, k) => {
  const a = -Math.PI / 2 + (k - 5.5) * 0.2, r = 18 + (k * 7) % 12;
  return [Math.round(Math.cos(a) * r), Math.round(Math.sin(a) * r) - 4, 0.6 + (k % 4) * 0.08, (k % 3) * 0.03];
});
const COLORS = ["#ff9a1f", "#ff6a00", "#f0381a", "#c81e0f"];
const path = ([dx, dy, d, delay]: number[], extra?: CSSProperties) =>
  ({ "--dx": `${dx}px`, "--dy": `${dy}px`, "--d": `${d}s`, "--delay": `${delay}s`, ...extra }) as CSSProperties;

// The day streak in the top right of the points banner. Smoke while today has no deed yet, sparks once it counts,
// and one burst when it starts to count while the page is open (a live refresh).
export function StreakPill({ days, today_done: done, today_waiting: waiting }: Streak) {
  const [seen, setSeen] = useState({ days, done });
  const [litFrom, setLitFrom] = useState<number | null>(null);
  if (seen.days !== days || seen.done !== done) {
    if (!seen.done && done) setLitFrom(seen.days);
    setSeen({ days, done });
  }
  const burst = litFrom !== null && done;
  const label = !days ? "No streak" : `${days}-day streak${done ? "" : waiting ? ", today's claim is waiting" : ", today not done yet"}`;

  return (
    <span data-testid="streak" role="img" aria-label={label} title={label} data-fire={done ? "spark" : "smoke"} data-waiting={waiting || undefined}
      className={`streak relative inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full py-1.5 pl-2 pr-3 text-sm font-semibold leading-tight ${days ? "bg-[#16171b] text-[#f3f1ea]" : "streak-cold bg-[#16171b]/10 text-[#16171b]"}`}>
      <span className="streak-fx" aria-hidden>
        {done
          ? <>
              {SPARKS.map((p, k) => <i key={k} className="streak-spark" style={path([p[0], p[1], p[2], p[3] + (burst ? 0.5 : 0)], { "--c": COLORS[k % 4] } as CSSProperties)} />)}
              {burst && BURST.map((p, k) => <i key={`b${k}`} className="streak-spark streak-burst" style={path(p, { "--c": COLORS[(k + 1) % 4] } as CSSProperties)} />)}
            </>
          : SMOKE.map((p, k) => <i key={k} className="streak-puff" style={path(p)} />)}
      </span>
      <svg key={burst ? "lit" : "idle"} className={`streak-flame size-4 shrink-0 ${burst ? "streak-flare" : ""}`} viewBox="0 0 24 24" aria-hidden>
        <path d="M12.6 2.2c.4 2.9-1 4.6-2.5 6.3C8.4 10.4 6.5 12.4 6.5 15.6A5.5 5.5 0 0 0 12 21.5a5.6 5.6 0 0 0 5.5-5.7c0-2.2-.9-3.7-1.9-5 .1 1.6-.5 2.8-1.6 3.3.4-3.5-.3-8.6-1.4-11.9Z" />
      </svg>
      {days ? (
        <span>
          <span className="inline-grid overflow-hidden align-bottom tabular-nums">
            {/* The old number rolls out as a pseudo-element, so the pill's text is only ever the current streak. */}
            {burst && litFrom ? <><span className="streak-out [grid-area:1/1]" data-n={litFrom} /><span className="streak-in [grid-area:1/1]">{days}</span></> : days}
          </span>-day streak
        </span>
      ) : "No streak"}
    </span>
  );
}
