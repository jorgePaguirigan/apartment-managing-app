"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, useTransition, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { activities, activity, type ActivityDay, type ActivityView } from "../actions";
import { Icon } from "./ui";

export type Measure = "deeds" | "points";
// A range is the current week, month, year or 12 months moved `step` of them back (negative) or forward. activity() turns it
// into days in SQL, so stepping never does date arithmetic here and always lands on the same date it left.
export type Range = { view: ActivityView; step: number };
const VIEWS: [ActivityView, string][] = [["week", "Week"], ["month", "Month"], ["year", "Year"], ["last_12_months", "12 months"]];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Days arrive as plain "2026-11-20" dates from activity(); UTC keeps formatting from shifting them a day.
const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-US", { ...o, timeZone: "UTC" });
const fullDay = fmt({ weekday: "short", month: "short", day: "numeric", year: "numeric" });
const monthShort = fmt({ month: "short" });
const monthYear = fmt({ month: "long", year: "numeric" });
const shortDay = fmt({ month: "short", day: "numeric" });
const dayYear = fmt({ month: "short", day: "numeric", year: "numeric" });
const at = (day: string) => new Date(`${day}T00:00:00Z`);
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
const describe = (d: ActivityDay) => `${plural(d.deeds, "deed")}, ${plural(d.points, "point")}`;

function rangeText({ view, step }: Range, first: string, last: string) {
  if (view === "last_12_months") return step === 0 ? "in the last 12 months" : `${dayYear.format(at(first))} – ${dayYear.format(at(last))}`;
  if (view === "year") return `in ${first.slice(0, 4)}`;
  if (view === "month") return `in ${monthYear.format(at(first))}`;
  return `${shortDay.format(at(first))} – ${first.slice(0, 7) === last.slice(0, 7) ? last.slice(8).replace(/^0/, "") : shortDay.format(at(last))}`;
}

// The range on show and the one the switch shows. The switch answers at once; the grid follows when its data arrives.
// Only the latest request counts, and one that comes back empty or fails puts the switch back on what is shown.
export function useRange<T>(initial: T, load: (r: Range) => Promise<T | null>, start0: Range = { view: "last_12_months", step: 0 }) {
  const [shown, setShown] = useState({ range: start0, data: initial, n: 0 });
  const [want, setWant] = useState<Range | null>(null);
  const [loading, start] = useTransition();
  const latest = useRef(0);
  const go = (range: Range) => {
    const n = ++latest.current;
    setWant(range);
    start(async () => {
      try {
        const data = await load(range);
        if (n === latest.current && data) setShown({ range, data, n });
      } catch {
        // Offline or a server error: keep what is shown; the switch falls back to it below.
      } finally {
        if (n === latest.current) setWant(null);
      }
    });
  };
  return { shown, range: want ?? shown.range, loading, go };
}

// Range switch, ‹ Today ›, and the measure. `first` is the first day on show, `firstDay` the household's first entry.
export function ActivityBar({ range, go, measure, setMeasure, first, firstDay }: {
  range: Range; go: (r: Range) => void; measure: Measure; setMeasure: (m: Measure) => void; first: string; firstDay: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div role="group" aria-label="Range" className="relative grid w-full grid-cols-4 rounded-full bg-surface-2 p-0.5 sm:w-auto">
        <span aria-hidden className="absolute inset-y-0.5 left-0.5 w-[calc(25%-0.0625rem)] rounded-full bg-ink transition-transform duration-[220ms] ease-[var(--ease-out-strong)] motion-reduce:transition-none"
          style={{ transform: `translateX(${VIEWS.findIndex(([v]) => v === range.view) * 100}%)` }} />
        {VIEWS.map(([v, label]) => (
          <button key={v} type="button" aria-pressed={range.view === v} onClick={() => v !== range.view && go({ view: v, step: 0 })}
            className={`relative z-10 min-h-9 whitespace-nowrap rounded-full px-1 text-[0.8125rem] font-semibold max-[359px]:px-0 max-[359px]:text-xs max-[359px]:tracking-tight sm:px-3 sm:text-sm transition-[color,transform] duration-150 ease-out select-none active:scale-[0.96] ${range.view === v ? "text-bg" : "text-muted [@media(hover:hover)]:hover:text-ink"}`}>
            {label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1">
        <button type="button" aria-label="Previous" disabled={first <= firstDay} onClick={() => go({ ...range, step: range.step - 1 })} className={stepper}>
          <Icon name="chevron" className="size-4 rotate-180" />
        </button>
        <button type="button" disabled={range.step === 0} onClick={() => go({ ...range, step: 0 })}
          className="min-h-9 rounded-full px-3 text-sm font-semibold text-ink transition-[transform,background-color,opacity] duration-150 ease-out select-none [@media(hover:hover)]:hover:bg-surface-2 active:scale-[0.96] disabled:pointer-events-none disabled:opacity-40">
          Today
        </button>
        <button type="button" aria-label="Next" disabled={range.step >= 0} onClick={() => go({ ...range, step: range.step + 1 })} className={stepper}>
          <Icon name="chevron" className="size-4" />
        </button>
      </div>
      <label className="relative ml-auto">
        <span className="sr-only">Measure</span>
        <select value={measure} onChange={(e) => setMeasure(e.target.value as Measure)}
          className="min-h-9 appearance-none rounded-full border border-line bg-transparent py-1 pl-3.5 pr-8 font-semibold text-ink outline-none transition-[border-color,transform] duration-150 ease-out [@media(hover:hover)]:hover:border-muted active:scale-[0.97] focus-visible:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink">
          <option value="deeds">Deeds</option>
          <option value="points">Points</option>
        </select>
        <Icon name="chevron" className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 rotate-90 text-muted" />
      </label>
    </div>
  );
}

// One member's days for a range: the total, the grid, its tooltip and keyboard moves. `children` goes before the total
// (the leaderboard puts a name there). `animate` wipes a new range in, `delay` ms late; the first one just appears.
// Colours scale to the busiest day on show, or to `scale` when several grids are compared.
export function ActivityGrid({ days, range, measure, animate, loading, legend = true, delay = 0, scale, children }: {
  days: ActivityDay[]; range: Range; measure: Measure; animate: boolean; loading: boolean; legend?: boolean; delay?: number; scale?: number; children?: ReactNode;
}) {
  const [active, setActive] = useState<number | null>(null);
  const [tip, setTip] = useState({ i: 0, left: 0, top: 0, keyboard: false }); // kept after closing, so it fades out where it was
  const box = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const first = days[0], last = days.at(-1);
  const year = range.view === "year" || range.view === "last_12_months";

  // A new range or measure closes the tooltip.
  const [seen, setSeen] = useState({ days, measure });
  if (seen.days !== days || seen.measure !== measure) { setSeen({ days, measure }); setActive(null); }

  // Long grids open on today: phones scroll so today's column is in view.
  useLayoutEffect(() => {
    const el = scroller.current, today = el?.querySelector<HTMLElement>("[data-today]");
    if (el && today) el.scrollLeft = today.offsetLeft - el.clientWidth + today.offsetWidth * 3;
  }, [days, measure]);

  // A tap outside the grid closes the tooltip.
  useEffect(() => {
    if (active === null) return;
    const close = (e: globalThis.PointerEvent) => { if (!box.current?.contains(e.target as Node)) setActive(null); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [active]);

  if (!first || !last) return null;
  const max = scale ?? busiest(days, measure);
  const level = (d: ActivityDay) => (d.future || d[measure] <= 0 ? 0 : Math.min(4, Math.ceil((d[measure] / max) * 4)));
  const total = days.reduce((s, d) => s + d[measure], 0);
  const today = first.today;
  const lastPast = days.findLastIndex((d) => !d.future);
  const lead = first.weekday;
  const cols = Math.ceil((lead + days.length) / 7);
  const cellAt = (i: number) => box.current?.querySelector<HTMLElement>(`[data-i="${i}"]`);

  // Tooltip sits above the cell, kept inside the grid. Its left is a share of the width, so a narrower screen (a phone
  // turning) never leaves it past the edge. Keyboard moves jump it there without animating.
  const show = (i: number | null, keyboard = false) => {
    const cell = i === null ? null : cellAt(i), b = box.current?.getBoundingClientRect();
    if (i === null || !cell || !b || days[i].future) return setActive(null);
    const r = cell.getBoundingClientRect();
    setTip({ i, left: ((r.left - b.left + r.width / 2) / b.width) * 100, top: r.top - b.top - 6, keyboard });
    setActive(i);
  };
  const cellFrom = (e: PointerEvent) => {
    const i = (e.target as HTMLElement).closest<HTMLElement>("[data-i]")?.dataset.i;
    return i === undefined ? null : Number(i);
  };
  // Arrows move a day or a week; they stop at today instead of stepping into the future.
  const keys = (e: KeyboardEvent) => {
    const step = { ArrowRight: year ? 7 : 1, ArrowLeft: year ? -7 : -1, ArrowDown: year ? 1 : 7, ArrowUp: year ? -1 : -7 }[e.key];
    if (e.key === "Escape") return show(null);
    if (!step || lastPast < 0) return;
    e.preventDefault();
    const from = active ?? lastPast;
    const to = Math.min(lastPast, Math.max(0, from + step));
    cellAt(to)?.scrollIntoView({ block: "nearest", inline: "nearest" });
    show(to, true);
  };

  const tipDay = days[tip.i];
  const cellProps = (d: ActivityDay, i: number) => ({
    "data-i": i, "data-day": d.day, "data-level": level(d),
    "data-today": d.day === today || undefined, "data-future": d.future || undefined, "data-active": active === i || undefined,
  });
  const wipe = animate ? "heat-in" : "";
  const wipeStyle = animate && delay ? { animationDelay: `${delay}ms` } : undefined;

  return (
    <div ref={box} className="relative space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">{/* the total drops below a long name instead of squeezing it */}
          {children}
          <p data-testid="activity-total" className="text-sm text-muted">
            <span className="display text-base font-bold text-ink">{plural(total, measure === "deeds" ? "deed" : "point")}</span>{" "}
            <span className="whitespace-nowrap">{rangeText(range, first.day, last.day)}</span>
          </p>
        </div>
        {legend && <Legend />}
      </div>

      <div tabIndex={0} role="group" aria-label="Activity by day. Arrow keys move between days."
        onKeyDown={keys} onBlur={() => show(null)}
        onPointerOver={(e) => e.pointerType === "mouse" && show(cellFrom(e))} onPointerLeave={(e) => e.pointerType === "mouse" && show(null)}
        onPointerUp={(e) => { if (e.pointerType !== "mouse") { const i = cellFrom(e); show(i === active ? null : i); } }}
        className={`rounded-xl outline-offset-4 transition-opacity duration-150 ${loading ? "opacity-50" : ""}`}>
        {year ? (
          <div ref={scroller} data-testid="activity-scroll" className="heat-scroll relative -mx-1 px-1 pb-1 pt-0.5" onScroll={() => active !== null && show(null)}>
            <div key={`${range.view}${first.day}`} className={`grid gap-[3px] text-[0.6875rem] text-muted ${wipe}`}
              style={{ ...wipeStyle, width: "100%", minWidth: "min-content", gridTemplateColumns: `1.75rem repeat(${cols}, minmax(var(--min), 14px))` }}>
              {Array.from({ length: cols }, (_, c) => {
                const inCol = days.slice(Math.max(0, c * 7 - lead), (c + 1) * 7 - lead);
                const firstOf = inCol.find((d) => d.day.endsWith("-01"));
                const label = firstOf ?? (c === 0 && !days.slice(0, 21 - lead).some((d) => d.day.endsWith("-01")) ? first : null);
                return label && <span key={c} className="whitespace-nowrap leading-4" style={{ gridColumn: c + 2, gridRow: 1 }}>{monthShort.format(at(label.day))}</span>;
              })}
              {/* Weekday labels stay put while a phone scrolls the weeks under them. */}
              <span aria-hidden className="sticky left-0 z-10 -ml-1 bg-surface" style={{ gridColumn: 1, gridRow: "1 / 9" }} />
              {[1, 3, 5].map((w) => <span key={w} className="sticky left-0 z-10 self-center leading-none" style={{ gridColumn: 1, gridRow: w + 2 }}>{WEEKDAYS[w]}</span>)}
              {days.map((d, i) => (
                <span key={d.day} {...cellProps(d, i)} className="heat-cell aspect-square"
                  style={{ gridColumn: Math.floor((lead + i) / 7) + 2, gridRow: ((lead + i) % 7) + 2 }} />
              ))}
            </div>
          </div>
        ) : (
          <div key={`${range.view}${first.day}`} style={wipeStyle} className={`mx-auto grid max-w-xl grid-cols-7 gap-1.5 sm:gap-2 ${wipe}`}>
            {WEEKDAYS.map((w) => <span key={w} className="text-center text-xs font-medium text-muted">{w}</span>)}
            {range.view === "month" && Array.from({ length: lead }, (_, i) => <span key={`lead${i}`} />)}
            {days.map((d, i) => (
              <span key={d.day} {...cellProps(d, i)}
                className={`heat-cell flex min-w-0 flex-col rounded-lg! p-1 sm:p-2 ${range.view === "week" ? "aspect-[3/4] justify-between" : "aspect-square"}`}>
                <span className="text-xs font-semibold tabular-nums sm:text-sm">{Number(d.day.slice(8))}</span>
                {range.view === "week" && !d.future && (
                  <span className={`display whitespace-nowrap font-bold leading-none ${String(d[measure]).length > 3 ? "text-xs sm:text-lg" : String(d[measure]).length > 2 ? "text-sm sm:text-2xl" : "text-lg sm:text-2xl"}`}>{d[measure]}</span>
                )}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* The same numbers as a list for screen readers, and keyboard moves read out here (the tooltip itself stays silent). */}
      <ul className="sr-only">
        {days.filter((d) => d.deeds > 0).map((d) => <li key={d.day}>{fullDay.format(at(d.day))}: {describe(d)}</li>)}
      </ul>
      <p aria-live="polite" className="sr-only">{active !== null && tip.keyboard && tipDay ? `${fullDay.format(at(tipDay.day))}: ${describe(tipDay)}` : ""}</p>

      <div aria-hidden className="heat-tip pointer-events-none absolute z-20 w-max max-w-[11rem] rounded-xl bg-ink px-3 py-2 text-center text-bg shadow-[0_10px_24px_-12px_rgb(0_0_0/0.5)]"
        data-hidden={active === null || undefined} data-instant={tip.keyboard || undefined} style={{ left: `clamp(5.5rem, ${tip.left}%, calc(100% - 5.5rem))`, top: tip.top }}>
        {tipDay && <>
          <p className="text-sm font-semibold">{describe(tipDay)}</p>
          <p className="text-xs opacity-70">{fullDay.format(at(tipDay.day))}</p>
        </>}
      </div>
    </div>
  );
}

const busiest = (days: ActivityDay[], measure: Measure) => Math.max(0, ...days.map((d) => d[measure]));

const Legend = () => (
  <div aria-hidden className="flex items-center gap-1 text-xs text-muted">
    Less {[0, 1, 2, 3, 4].map((l) => <span key={l} data-level={l} className="heat-cell size-2.5" />)} More
  </div>
);

function ActivityCard({ titleId, children }: { titleId: string; children: ReactNode }) {
  return (
    <section aria-labelledby={titleId} className="rise space-y-3">
      <h2 id={titleId} className="eyebrow px-1">Activity</h2>
      <div className="heat space-y-4 rounded-[1.75rem] border border-line bg-surface/95 p-4 shadow-[var(--shadow)] sm:p-5">{children}</div>
    </section>
  );
}

// Home: one housemate's heatmap with its own bar.
export function Activity({ memberId, initial, timeZone }: { memberId: string; initial: ActivityDay[]; timeZone: string }) {
  const titleId = useId();
  const [measure, setMeasure] = useState<Measure>("deeds");
  const { shown, range, loading, go } = useRange(initial, async (r) => {
    const days = await activity(memberId, r.view, r.step);
    return days.length ? days : null;
  });
  const days = shown.data, first = days[0];
  if (!first) return null;
  return (
    <ActivityCard titleId={titleId}>
      <ActivityBar range={range} go={go} measure={measure} setMeasure={setMeasure} first={first.day} firstDay={first.first_day} />
      <ActivityGrid days={days} range={shown.range} measure={measure} animate={shown.n > 0} loading={loading} />
      <p className="text-xs text-muted">Days follow the household time zone ({timeZone}).</p>
    </ActivityCard>
  );
}

// Leaderboard: every scored housemate's heatmap under one shared bar, in leaderboard order. It opens on `start`, the
// range of the period pill, and the bar moves them all together.
export function ActivityBoard({ members, initial, start, timeZone }: {
  members: { id: string; name: string; avatar: ReactNode }[]; initial: ActivityDay[][]; start: Range; timeZone: string;
}) {
  const titleId = useId();
  const [measure, setMeasure] = useState<Measure>("deeds");
  const { shown, range, loading, go } = useRange(initial, async (r) => {
    const all = await activities(members.map((m) => m.id), r.view, r.step);
    return all.some((d) => d.length) ? all : null;
  }, start);
  const first = shown.data.find((d) => d.length)?.[0];
  if (!first) return null;
  const scale = Math.max(...shown.data.map((d) => busiest(d, measure))); // one scale, so the same colour means the same amount
  return (
    <ActivityCard titleId={titleId}>
      <ActivityBar range={range} go={go} measure={measure} setMeasure={setMeasure} first={first.day} firstDay={first.first_day} />
      <div className="flex justify-end"><Legend /></div>
      <ul className="divide-y divide-line">
        {members.map((m, i) => (
          <li key={m.id} className="py-4 first:pt-0 last:pb-0" aria-label={m.name}>
            <ActivityGrid days={shown.data[i]} range={shown.range} measure={measure} animate={shown.n > 0} loading={loading} legend={false} delay={i * 40} scale={scale}>
              <span className="flex min-w-0 items-center gap-2">{m.avatar}<span className="truncate font-semibold">{m.name}</span></span>
            </ActivityGrid>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted">Days follow the household time zone ({timeZone}).</p>
    </ActivityCard>
  );
}

const stepper =
  "grid size-9 place-items-center rounded-full border border-line text-ink transition-[transform,background-color,opacity] duration-150 ease-out [@media(hover:hover)]:hover:bg-surface-2 active:scale-[0.96] disabled:pointer-events-none disabled:opacity-35";
