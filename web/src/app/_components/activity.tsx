"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, useTransition, type KeyboardEvent, type PointerEvent } from "react";
import { activity, type ActivityDay, type ActivityView } from "../actions";
import { Icon } from "./ui";

type Measure = "deeds" | "points";
const VIEWS: [ActivityView, string][] = [["week", "Week"], ["month", "Month"], ["year", "Year"], ["last_12_months", "12 months"]];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Days arrive as plain "2026-11-20" dates from activity(); UTC keeps formatting and stepping from shifting them a day.
const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-US", { ...o, timeZone: "UTC" });
const fullDay = fmt({ weekday: "short", month: "short", day: "numeric", year: "numeric" });
const monthShort = fmt({ month: "short" });
const monthYear = fmt({ month: "long", year: "numeric" });
const shortDay = fmt({ month: "short", day: "numeric" });
const at = (day: string) => new Date(`${day}T00:00:00Z`);
const addDays = (day: string, n: number) => new Date(at(day).getTime() + n * 86_400_000).toISOString().slice(0, 10);
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
const describe = (d: ActivityDay) => `${plural(d.deeds, "deed")} · ${d.points > 0 ? "+" : ""}${plural(d.points, "point")}`;

function rangeText(view: ActivityView, first: string, last: string) {
  if (view === "last_12_months") return "in the last 12 months";
  if (view === "year") return `in ${first.slice(0, 4)}`;
  if (view === "month") return `in ${monthYear.format(at(first))}`;
  return `${shortDay.format(at(first))} – ${first.slice(0, 7) === last.slice(0, 7) ? last.slice(8).replace(/^0/, "") : shortDay.format(at(last))}`;
}

// A scored member's heatmap: deeds or points per day for a week, a month, a year or the last 12 months.
// `bare` drops the section title and card, for use inside another card (the leaderboard).
export function Activity({ memberId, initial, timeZone, bare = false }: { memberId: string; initial: ActivityDay[]; timeZone: string; bare?: boolean }) {
  const titleId = useId();
  const [shown, setShown] = useState({ view: "last_12_months" as ActivityView, days: initial });
  const [view, setView] = useState<ActivityView>("last_12_months"); // the switch answers at once; the grid follows its data
  const [measure, setMeasure] = useState<Measure>("deeds");
  const [active, setActive] = useState<number | null>(null);
  const [tip, setTip] = useState({ i: 0, left: 0, top: 0 }); // kept after closing, so the tooltip fades out where it was
  const [animate, setAnimate] = useState(false);
  const [loading, start] = useTransition();
  const box = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);

  const { days } = shown;
  const first = days[0], last = days.at(-1);
  const load = (v: ActivityView, anchor: string | null) => {
    setView(v); setActive(null); setTip({ i: 0, left: 0, top: 0 });
    start(async () => {
      const next = await activity(memberId, v, anchor);
      if (next.length) { setShown({ view: v, days: next }); setAnimate(true); }
    });
  };

  // Long grids open on today: phones scroll so today's column is in view.
  useLayoutEffect(() => {
    const el = scroller.current, today = el?.querySelector<HTMLElement>("[data-today]");
    if (el && today) el.scrollLeft = today.offsetLeft - el.clientWidth + today.offsetWidth * 3;
  }, [shown]);

  // A tap outside the card closes the tooltip.
  useEffect(() => {
    if (active === null) return;
    const close = (e: globalThis.PointerEvent) => { if (!box.current?.contains(e.target as Node)) setActive(null); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [active]);

  if (!first || !last) return null;
  const year = shown.view === "year" || shown.view === "last_12_months";
  const max = Math.max(0, ...days.map((d) => d[measure]));
  const level = (d: ActivityDay) => (d.future || d[measure] <= 0 ? 0 : Math.min(4, Math.ceil((d[measure] / max) * 4)));
  const total = days.reduce((s, d) => s + d[measure], 0);
  const today = first.today;
  const prev = addDays(first.day, -1);
  const next = shown.view === "last_12_months" ? [addDays(last.day, 365), today].sort()[0] : addDays(last.day, 1);
  const onToday = shown.view === "last_12_months" ? last.day === today : first.day <= today && today <= last.day;

  const lead = first.weekday;
  const cols = Math.ceil((lead + days.length) / 7);
  const cellAt = (i: number) => box.current?.querySelector<HTMLElement>(`[data-i="${i}"]`);
  // Tooltip sits above the cell, kept inside the card.
  const show = (i: number | null) => {
    const cell = i === null ? null : cellAt(i), b = box.current?.getBoundingClientRect();
    if (i === null || !cell || !b || days[i].future) return setActive(null);
    const r = cell.getBoundingClientRect();
    setTip({ i, left: Math.min(b.width - 90, Math.max(90, r.left - b.left + r.width / 2)), top: r.top - b.top - 6 });
    setActive(i);
  };
  const cellFrom = (e: PointerEvent) => {
    const i = (e.target as HTMLElement).closest<HTMLElement>("[data-i]")?.dataset.i;
    return i === undefined ? null : Number(i);
  };
  const keys = (e: KeyboardEvent) => {
    const step = { ArrowRight: year ? 7 : 1, ArrowLeft: year ? -7 : -1, ArrowDown: year ? 1 : 7, ArrowUp: year ? -1 : -7 }[e.key];
    if (e.key === "Escape") return show(null);
    if (!step) return;
    e.preventDefault();
    const from = active ?? days.findIndex((d) => d.day === today);
    const to = Math.min(days.length - 1, Math.max(0, (from < 0 ? days.length - 1 : from) + step));
    cellAt(to)?.scrollIntoView({ block: "nearest", inline: "nearest" });
    show(to);
  };

  const tipDay = days[tip.i];

  const cellProps = (d: ActivityDay, i: number) => ({
    "data-i": i, "data-day": d.day, "data-level": level(d),
    "data-today": d.day === today || undefined, "data-future": d.future || undefined, "data-active": active === i || undefined,
    className: "heat-cell",
    style: animate ? { animationDelay: `${year ? Math.floor((lead + i) / 7) * 3 : i * 12}ms` } : undefined,
  });

  const body = (
      <div ref={box} role={bare ? "group" : undefined} aria-label={bare ? "Activity" : undefined}
        className={`heat relative space-y-4 ${bare ? "" : "rounded-[1.75rem] border border-line bg-surface/95 p-4 shadow-[var(--shadow)] sm:p-5"}`}>
        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Range" className="relative grid w-full grid-cols-4 rounded-full bg-surface-2 p-0.5 sm:w-auto">
            <span aria-hidden className="absolute inset-y-0.5 left-0.5 w-[calc(25%-0.0625rem)] rounded-full bg-ink transition-transform duration-[220ms] ease-[var(--ease-out-strong)] motion-reduce:transition-none"
              style={{ transform: `translateX(${VIEWS.findIndex(([v]) => v === view) * 100}%)` }} />
            {VIEWS.map(([v, label]) => (
              <button key={v} type="button" aria-pressed={view === v} onClick={() => v !== view && load(v, null)}
                className={`relative z-10 min-h-9 whitespace-nowrap rounded-full px-1 text-[0.8125rem] font-semibold sm:px-3 sm:text-sm transition-[color,transform] duration-150 ease-out select-none active:scale-[0.96] ${view === v ? "text-bg" : "text-muted [@media(hover:hover)]:hover:text-ink"}`}>
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <button type="button" aria-label="Previous" disabled={first.day <= first.first_day} onClick={() => load(shown.view, prev)} className={stepper}>
              <Icon name="chevron" className="size-4 rotate-180" />
            </button>
            <button type="button" disabled={onToday} onClick={() => load(shown.view, null)}
              className="min-h-9 rounded-full px-3 text-sm font-semibold text-ink transition-[transform,background-color,opacity] duration-150 ease-out select-none hover:bg-surface-2 active:scale-[0.96] disabled:pointer-events-none disabled:opacity-40">
              Today
            </button>
            <button type="button" aria-label="Next" disabled={last.day >= today} onClick={() => load(shown.view, next)} className={stepper}>
              <Icon name="chevron" className="size-4" />
            </button>
          </div>
          <label className="relative ml-auto">
            <span className="sr-only">Measure</span>
            <select value={measure} onChange={(e) => { setMeasure(e.target.value as Measure); setActive(null); }}
              className="min-h-9 appearance-none rounded-full border border-line bg-transparent py-1 pl-3.5 pr-8 font-semibold text-ink outline-none transition-[border-color,transform] duration-150 ease-out hover:border-muted active:scale-[0.97] focus-visible:border-ink">
              <option value="deeds">Deeds</option>
              <option value="points">Points</option>
            </select>
            <Icon name="chevron" className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 rotate-90 text-muted" />
          </label>
        </div>

        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p data-testid="activity-total" aria-live="polite" className="text-sm text-muted">
            <span className="display text-base font-bold text-ink">{plural(total, measure === "deeds" ? "deed" : "point")}</span>{" "}
            {rangeText(shown.view, first.day, last.day)}
          </p>
          <div aria-hidden className="flex items-center gap-1 text-xs text-muted">
            Less {[0, 1, 2, 3, 4].map((l) => <span key={l} data-level={l} className="heat-cell size-2.5" />)} More
          </div>
        </div>

        <div tabIndex={0} role="group" aria-label="Activity by day. Arrow keys move between days."
          onKeyDown={keys} onBlur={() => show(null)}
          onPointerOver={(e) => e.pointerType === "mouse" && show(cellFrom(e))} onPointerLeave={(e) => e.pointerType === "mouse" && show(null)}
          onPointerUp={(e) => { if (e.pointerType !== "mouse") { const i = cellFrom(e); show(i === active ? null : i); } }}
          className={`rounded-xl outline-offset-4 transition-opacity duration-150 ${loading ? "opacity-50" : ""}`}>
          {year ? (
            <div ref={scroller} data-testid="activity-scroll" className="heat-scroll relative -mx-1 px-1 pb-1 pt-0.5" onScroll={() => active !== null && show(null)}>
              <div key={`${shown.view}${first.day}`} className={`grid gap-[3px] text-[0.6875rem] text-muted ${animate ? "heat-in" : ""}`}
                style={{ width: "100%", minWidth: "min-content", gridTemplateColumns: `1.75rem repeat(${cols}, minmax(var(--min), 14px))` }}>
                {Array.from({ length: cols }, (_, c) => {
                  const inCol = days.slice(Math.max(0, c * 7 - lead), (c + 1) * 7 - lead);
                  const firstOf = inCol.find((d) => d.day.endsWith("-01"));
                  const label = firstOf ?? (c === 0 && !days.slice(0, 21 - lead).some((d) => d.day.endsWith("-01")) ? first : null);
                  return label && <span key={c} className="whitespace-nowrap leading-4" style={{ gridColumn: c + 2, gridRow: 1 }}>{monthShort.format(at(label.day))}</span>;
                })}
                {/* Weekday labels stay put while a phone scrolls the weeks under them. */}
                <span aria-hidden className="sticky left-0 z-10 -ml-1 bg-[var(--heat-bg,var(--surface))]" style={{ gridColumn: 1, gridRow: "1 / 9" }} />
                {[1, 3, 5].map((w) => <span key={w} className="sticky left-0 z-10 self-center leading-none" style={{ gridColumn: 1, gridRow: w + 2 }}>{WEEKDAYS[w]}</span>)}
                {days.map((d, i) => {
                  const p = cellProps(d, i);
                  return <span key={d.day} {...p} className="heat-cell aspect-square" style={{ ...p.style, gridColumn: Math.floor((lead + i) / 7) + 2, gridRow: ((lead + i) % 7) + 2 }} />;
                })}
              </div>
            </div>
          ) : (
            <div key={`${shown.view}${first.day}`} className={`mx-auto grid max-w-xl grid-cols-7 gap-1.5 sm:gap-2 ${animate ? "heat-in" : ""}`}>
              {WEEKDAYS.map((w) => <span key={w} className="text-center text-xs font-medium text-muted">{w}</span>)}
              {shown.view === "month" && Array.from({ length: lead }, (_, i) => <span key={`lead${i}`} />)}
              {days.map((d, i) => (
                <span key={d.day} {...cellProps(d, i)}
                  className={`heat-cell flex min-w-0 flex-col rounded-lg! p-1 sm:p-2 ${shown.view === "week" ? "aspect-[3/4] justify-between" : "aspect-square"}`}>
                  <span className="text-xs font-semibold tabular-nums sm:text-sm">{Number(d.day.slice(8))}</span>
                  {shown.view === "week" && !d.future && (
                    <span className={`display whitespace-nowrap font-bold leading-none ${String(d[measure]).length > 3 ? "text-xs sm:text-lg" : String(d[measure]).length > 2 ? "text-sm sm:text-2xl" : "text-lg sm:text-2xl"}`}>{d[measure]}</span>
                  )}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* The same numbers as a list, for screen readers. */}
        <ul className="sr-only">
          {days.filter((d) => d.deeds > 0).map((d) => <li key={d.day}>{fullDay.format(at(d.day))}: {describe(d)}</li>)}
        </ul>

        <div role="status" className="heat-tip pointer-events-none absolute z-20 w-max max-w-[11rem] rounded-xl bg-ink px-3 py-2 text-center text-bg shadow-[0_10px_24px_-12px_rgb(0_0_0/0.5)]"
          data-hidden={active === null || undefined} style={{ left: tip.left, top: tip.top }}>
          {tipDay && <>
            <p className="text-sm font-semibold">{describe(tipDay)}</p>
            <p className="text-xs opacity-70">{fullDay.format(at(tipDay.day))}</p>
          </>}
        </div>

        <p className="text-xs text-muted">Days follow the household time zone ({timeZone}).</p>
      </div>
  );
  if (bare) return body;
  return (
    <section aria-labelledby={titleId} className="rise space-y-3">
      <h2 id={titleId} className="eyebrow px-1">Activity</h2>
      {body}
    </section>
  );
}

const stepper =
  "grid size-9 place-items-center rounded-full border border-line text-ink transition-[transform,background-color,opacity] duration-150 ease-out hover:bg-surface-2 active:scale-[0.96] disabled:pointer-events-none disabled:opacity-35";
