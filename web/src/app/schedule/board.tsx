"use client";

import { startTransition, useMemo, useOptimistic, useState } from "react";
import { assignChore, completeChore, dibChore, undibChore } from "../actions";
import { Avatar, Chip, Icon, ghost } from "../_components/ui";
import { SubmitButton } from "../_components/submit-button";

export type Card = {
  id: string; name: string; area: string | null; points: number; weekday: number;
  assignee: string | null; source: string | null; claimed: boolean; status: string | null;
};
export type Housemate = { id: string; name: string };

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
// The week starts on Sunday, but a chore's weekday stays 1 = Monday to 7 = Sunday.
const weekdayOf = (row: number) => (row === 0 ? 7 : row);
// Rows are Sunday to Saturday, so a row's date is the week start plus its index. ISO dates compare as text.
const rowDate = (weekStart: string, row: number) => new Date(Date.parse(`${weekStart}T00:00:00Z`) + row * 86_400_000).toISOString().slice(0, 10);
const small = `${ghost} min-h-8 px-2.5 py-1 text-xs`;

// "2026-10-18" (a Sunday) plus n days, as a day number. Plain date arithmetic, no time zone involved.
const dayLabel = (weekStart: string, n: number) =>
  new Intl.DateTimeFormat("en", { day: "numeric", timeZone: "UTC" }).format(new Date(Date.parse(`${weekStart}T00:00:00Z`) + n * 86_400_000));

function Hidden({ id }: { id: string }) {
  return <input type="hidden" name="instance" value={id} />;
}

// Columns are housemates (plus Unassigned), rows are the days of the week.
// The admin drags cards between columns. The menu on a card is for touch screens and keyboards, so it only shows there.
// The admin edits from today on (the database says which day today is): a card on an earlier day is locked, and a card
// can move to another person and to another day of its week, today or later.
export function Board({ weekStart, today, phase, housemates, cards, meId, isAdmin, showUnassigned }: {
  weekStart: string; today: string; phase: string; housemates: Housemate[]; cards: Card[]; meId: string; isAdmin: boolean; showUnassigned: boolean;
}) {
  const [view, move] = useOptimistic(cards, (cs, m: { id: string; to: string | null; weekday: number }) => cs.map((c) => (c.id === m.id ? { ...c, assignee: m.to, weekday: m.weekday } : c)));
  const [drag, setDrag] = useState<Card | null>(null);
  const [over, setOver] = useState<string | null>(null); // the cell under the dragged card
  const [landed, setLanded] = useState<string | null>(null); // the card just dropped: it settles in once, keyboard changes do not animate
  // Cards are grouped once per render instead of filtered for every cell.
  const byCell = useMemo(() => {
    const m = new Map<string, Card[]>();
    for (const k of view) { const key = `${k.weekday}|${k.assignee}`; m.set(key, [...(m.get(key) ?? []), k]); }
    return m;
  }, [view]);
  const columns: { id: string | null; name: string }[] = [...housemates, ...(showUnassigned ? [{ id: null, name: "Unassigned" }] : [])];
  const locked = (row: number) => rowDate(weekStart, row) < today;
  const movable = (c: Card) => isAdmin && !c.claimed && !locked(c.weekday % 7);
  const endDrag = () => { setDrag(null); setOver(null); };
  const assign = (id: string, to: string | null, weekday: number) => startTransition(async () => { move({ id, to, weekday }); await assignChore(id, to, weekday); });

  return (
    <div className="overflow-x-auto rounded-3xl border border-line bg-surface-2">
      <table className="w-full min-w-max border-collapse text-left">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 w-16 bg-bg p-2" />
            {columns.map((c) => (
              <th key={c.id ?? "none"} scope="col" className="min-w-44 p-2 align-bottom">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  {c.id ? <Avatar name={c.name} className="size-7" /> : null}
                  <span className="truncate">{c.name}</span>
                  {c.id === meId && <Chip tone="points">You</Chip>}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DAYS.map((d, i) => (
            <tr key={d} data-locked={locked(i) || undefined} className="border-t border-line">
              <th scope="row" className="sticky left-0 z-10 bg-bg p-2 text-left align-top">
                <span className="eyebrow flex items-center gap-1">
                  {d}
                  {locked(i) && <Icon name="lock" className="size-3" />}
                </span>
                <span className="display text-lg font-bold tabular-nums">{dayLabel(weekStart, i)}</span>
                {rowDate(weekStart, i) === today && <Chip tone="points">Today</Chip>}
              </th>
              {columns.map((c) => {
                const target = drag !== null && !locked(i) && (drag.weekday !== weekdayOf(i) || drag.assignee !== c.id);
                const cell = `${i}|${c.id}`;
                return (
                  <td key={c.id ?? "none"} onDragOver={target ? (e) => { e.preventDefault(); if (over !== cell) setOver(cell); } : undefined}
                    onDrop={target ? (e) => { e.preventDefault(); setLanded(drag.id); assign(drag.id, c.id, weekdayOf(i)); endDrag(); } : undefined}
                    data-drop={target ? (over === cell ? "over" : "ready") : undefined} className="board-cell space-y-1.5 p-1.5 align-top">
                    {(byCell.get(`${weekdayOf(i)}|${c.id}`) ?? []).map((k) => (
                      <div key={k.id} draggable={movable(k)} onDragStart={() => setDrag(k)} onDragEnd={endDrag}
                        data-lifted={drag?.id === k.id || undefined} data-landed={landed === k.id || undefined}
                        className="board-card rounded-2xl border border-line bg-surface p-2.5 text-sm">
                        <p className="font-semibold leading-tight">{k.name}</p>
                        <p className="mt-1 flex items-center justify-between gap-2 text-xs text-muted">
                          <span className="truncate">{k.area ?? " "}</span>
                          <span className="flex gap-1">
                            {k.source === "dibs" && <Chip tone="muted">Dibs</Chip>}
                            {k.points > 0 && <Chip tone="muted">{k.points} pts</Chip>}
                          </span>
                        </p>
                        {k.status && <p className="mt-1.5"><Chip tone={k.status === "accepted" ? "ok" : k.status === "pending" ? "warn" : "bad"}>{k.status === "accepted" ? "Done" : k.status === "pending" ? "Waiting for admin" : "Rejected"}</Chip></p>}
                        {movable(k) && (
                          <select aria-label={`Assign ${k.name}`} value={k.assignee ?? ""} onChange={(e) => assign(k.id, e.target.value || null, k.weekday)}
                            className="mt-2 w-full rounded-lg border border-line bg-surface-2 px-2 py-1 text-xs sr-only focus:not-sr-only [@media(hover:none)]:not-sr-only">
                            <option value="">Unassigned</option>
                            {housemates.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
                          </select>
                        )}
                        {movable(k) && (
                          <select aria-label={`Day for ${k.name}`} value={k.weekday} onChange={(e) => assign(k.id, k.assignee, Number(e.target.value))}
                            className="mt-1.5 w-full rounded-lg border border-line bg-surface-2 px-2 py-1 text-xs sr-only focus:not-sr-only [@media(hover:none)]:not-sr-only">
                            {DAYS.map((n, r) => !locked(r) && <option key={n} value={weekdayOf(r)}>{n}</option>)}
                          </select>
                        )}
                        {!isAdmin && phase !== "past" && k.assignee === null && (
                          <form action={dibChore} className="mt-2"><Hidden id={k.id} /><SubmitButton className={small}>Dibs</SubmitButton></form>
                        )}
                        {!isAdmin && (phase === "early" || phase === "dibs") && k.assignee === meId && k.source === "dibs" && !k.claimed && (
                          <form action={undibChore} className="mt-2"><Hidden id={k.id} /><SubmitButton className={small}>Release</SubmitButton></form>
                        )}
                        {k.assignee === meId && (phase === "current" || phase === "past") && (!k.claimed || k.status === "rejected") && (
                          <form action={completeChore} className="mt-2"><Hidden id={k.id} /><SubmitButton className={small}>I did it</SubmitButton></form>
                        )}
                      </div>
                    ))}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
