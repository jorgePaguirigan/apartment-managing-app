"use client";

import { startTransition, useOptimistic, useState } from "react";
import { addChore, removeChore } from "../actions";
import { Chip, Icon, ghost } from "../_components/ui";

export type Scheduled = { id: string; deedId: string | null; name: string; area: string | null; weekday: number; points: number };
export type CatalogDeed = { id: string; name: string; area: string | null; points: number };

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const WEEK = [7, 1, 2, 3, 4, 5, 6]; // the week starts on Sunday; a chore's weekday stays 1 = Monday to 7 = Sunday
const LEAVE_MS = 180; // as long as the leaving transition in globals.css

type Move = { kind: "add"; deed: CatalogDeed; weekday: number } | { kind: "remove"; chore: Scheduled; deed: CatalogDeed | null };

// Two parts: the chores on the schedule (Remove) and the catalog deeds that are not (Add). A card leaves its part,
// then shows up in the other one; the server action runs behind the move, so the card never waits for it.
export function ChoresCard({ scheduled, catalog, todayWeekday }: { scheduled: Scheduled[]; catalog: CatalogDeed[]; todayWeekday: number }) {
  const [state, move] = useOptimistic({ scheduled, catalog }, (s, m: Move) => {
    if (m.kind === "add")
      return { scheduled: [...s.scheduled, { id: `new-${m.deed.id}-${m.weekday}`, deedId: m.deed.id, name: m.deed.name, area: m.deed.area, weekday: m.weekday, points: m.deed.points }], catalog: s.catalog.filter((d) => d.id !== m.deed.id) };
    return { scheduled: s.scheduled.filter((c) => c.id !== m.chore.id), catalog: m.deed ? [...s.catalog, m.deed].sort((a, b) => a.name.localeCompare(b.name)) : s.catalog };
  });
  const [leaving, setLeaving] = useState<string | null>(null);
  const [days, setDays] = useState<Record<string, number>>({});
  const [fresh, setFresh] = useState<string | null>(null);

  const leave = (id: string, run: () => void) => {
    setLeaving(id);
    setTimeout(() => { setLeaving(null); startTransition(run); }, matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : LEAVE_MS);
  };
  const add = (d: CatalogDeed) => {
    const weekday = days[d.id] ?? todayWeekday;
    leave(d.id, async () => { setFresh(`${d.id}:${weekday}`); move({ kind: "add", deed: d, weekday }); await addChore(d.id, weekday); });
  };
  const remove = (c: Scheduled) => leave(keyOf(c), async () => {
    if (c.deedId) setFresh(c.deedId);
    move({ kind: "remove", chore: c, deed: c.deedId ? { id: c.deedId, name: c.name, area: c.area, points: c.points } : null });
    await removeChore(c.id);
  });
  const sorted = [...state.scheduled].sort((a, b) => WEEK.indexOf(a.weekday) - WEEK.indexOf(b.weekday) || a.name.localeCompare(b.name));

  return (
    <div className="space-y-5">
      <Part icon="calendar" title="On the schedule" count={sorted.length} empty="Nothing is scheduled. Add a chore from the catalog below.">
        {sorted.map((c) => (
          <Slot key={keyOf(c)} leaving={leaving === keyOf(c)} fresh={fresh === keyOf(c)}>
            <Card name={c.name} sub={`${DAY_NAMES[c.weekday - 1]}${c.area ? ` · ${c.area}` : ""}`} points={c.points}>
              <button type="button" onClick={() => remove(c)} aria-label={`Remove ${c.name} on ${DAY_NAMES[c.weekday - 1]}`} className={`${ghost} chore-act`}>
                <Icon name="x" className="size-4" />Remove
              </button>
            </Card>
          </Slot>
        ))}
      </Part>

      <Part icon="plus" title="From the catalog" count={state.catalog.length} empty="Every catalog chore is on the schedule.">
        {state.catalog.map((d) => (
          <Slot key={d.id} leaving={leaving === d.id} fresh={fresh === d.id}>
            <Card name={d.name} sub={d.area ?? "No group"} points={d.points}>
              <select aria-label={`Day for ${d.name}`} value={days[d.id] ?? todayWeekday} onChange={(e) => setDays({ ...days, [d.id]: Number(e.target.value) })}
                className="chore-day min-h-10 rounded-full border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-ink focus:ring-4 focus:ring-accent">
                {WEEK.map((v) => <option key={v} value={v}>{DAY_NAMES[v - 1].slice(0, 3)}</option>)}
              </select>
              <button type="button" onClick={() => add(d)} aria-label={`Add ${d.name} on ${DAY_NAMES[(days[d.id] ?? todayWeekday) - 1]}`} className="chore-add chore-act inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-[#16171b]">
                <Icon name="plus" className="size-4" />Add
              </button>
            </Card>
          </Slot>
        ))}
      </Part>
    </div>
  );
}

// A scheduled chore keeps its key when the server swaps its temporary id for the real one, so it does not blink.
const keyOf = (c: Scheduled) => (c.deedId ? `${c.deedId}:${c.weekday}` : c.id);

function Part({ icon, title, count, empty, children }: { icon: "calendar" | "plus"; title: string; count: number; empty: string; children: React.ReactNode }) {
  return (
    <section aria-label={title} className="space-y-2">
      <h3 className="eyebrow flex items-center gap-2 px-1"><Icon name={icon} className="size-3.5" />{title}
        <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[0.7rem] tracking-normal tabular-nums">{count}</span>
      </h3>
      {count === 0 ? <p className="rounded-2xl border border-dashed border-line p-4 text-center text-sm text-muted">{empty}</p> : <ul className="space-y-2">{children}</ul>}
    </section>
  );
}

// The grid-rows trick folds a leaving card to nothing without animating height.
function Slot({ leaving, fresh, children }: { leaving: boolean; fresh: boolean; children: React.ReactNode }) {
  return <li className="chore-slot" data-leaving={leaving || undefined} data-fresh={fresh || undefined}><div className="chore-fold">{children}</div></li>;
}

function Card({ name, sub, points, children }: { name: string; sub: string; points: number; children: React.ReactNode }) {
  return (
    <div className="chore-card flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-2xl border border-line bg-surface p-3">
      <span className="min-w-0 flex-1 basis-40">
        <span className="block truncate font-semibold">{name}</span>
        <span className="block truncate text-xs text-muted">{sub}</span>
      </span>
      <Chip tone="muted">{points} pts</Chip>
      <span className="flex items-center gap-2">{children}</span>
    </div>
  );
}
