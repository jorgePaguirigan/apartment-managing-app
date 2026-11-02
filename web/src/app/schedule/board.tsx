"use client";

import { startTransition, useMemo, useOptimistic, useState } from "react";
import { addChoreToCell, assignChore, dibChore, undibChore } from "../actions";
import { Avatar, Chip, Icon, ghost } from "../_components/ui";
import { SubmitButton } from "../_components/submit-button";
import { CellPopup, type CatalogDeed, type Item } from "./cell-popup";

export type Card = {
  id: string; deedId: string | null; choreDay: number; name: string; area: string | null; points: number; weekday: number;
  assignee: string | null; source: string | null; claimed: boolean; status: string | null;
};
export type Housemate = { id: string; name: string };

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
// The week starts on Sunday, but a chore's weekday stays 1 = Monday to 7 = Sunday.
const weekdayOf = (col: number) => (col === 0 ? 7 : col);
// Columns are Sunday to Saturday, so a column's date is the week start plus its index. ISO dates compare as text.
const rowDate = (weekStart: string, col: number) => new Date(Date.parse(`${weekStart}T00:00:00Z`) + col * 86_400_000).toISOString().slice(0, 10);
const small = `${ghost} min-h-8 px-2.5 py-1 text-xs`;

// "2026-10-18" (a Sunday) plus n days, as a day number. Plain date arithmetic, no time zone involved.
const dayLabel = (weekStart: string, n: number) =>
  new Intl.DateTimeFormat("en", { day: "numeric", timeZone: "UTC" }).format(new Date(Date.parse(`${weekStart}T00:00:00Z`) + n * 86_400_000));

function Hidden({ id }: { id: string }) {
  return <input type="hidden" name="instance" value={id} />;
}

// Columns are the days of the week, rows are housemates (plus Unassigned).
// The admin drags cards between columns. The menu on a card is for touch screens and keyboards, so it only shows there.
// The admin edits from today on (the database says which day today is): a card on an earlier day is locked, and a card
// can move to another person and to another day of its week, today or later.
export function Board({ weekStart, today, phase, housemates, cards, meId, isAdmin, catalog, showUnassigned }: {
  weekStart: string; today: string; phase: string; housemates: Housemate[]; cards: Card[]; meId: string; isAdmin: boolean; catalog: CatalogDeed[]; showUnassigned: boolean;
}) {
  type Move = { id: string; to: string | null; weekday: number } | { add: Card };
  const [view, move] = useOptimistic(cards, (cs, m: Move) => "add" in m ? [...cs, m.add] : cs.map((c) => (c.id === m.id ? { ...c, assignee: m.to, weekday: m.weekday } : c)));
  const [pop, setPop] = useState<{ col: number; member: string | null; name: string; rect: DOMRect; trigger: HTMLElement } | null>(null); // the open chore popup
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
  const locked = (col: number) => rowDate(weekStart, col) < today;
  const movable = (c: Card) => isAdmin && !c.claimed && !locked(c.weekday % 7);
  const endDrag = () => { setDrag(null); setOver(null); };
  const assign = (id: string, to: string | null, weekday: number) => startTransition(async () => { move({ id, to, weekday }); await assignChore(id, to, weekday); });
  const nameOf = (id: string | null) => housemates.find((h) => h.id === id)?.name ?? "Unassigned";
  // The popup's list for the open cell: a deed is on a day once (by its chore's day), so one held in another cell is not offered.
  const items = (): Item[] => pop === null ? [] : catalog.map((deed) => {
    const day = weekdayOf(pop.col);
    const held = view.find((k) => k.deedId === deed.id && k.choreDay === day);
    if (!held) return { deed, state: "free" };
    if (held.weekday === day && held.assignee === pop.member) return { deed, state: "here" };
    return { deed, state: "taken", by: `${nameOf(held.assignee)}${held.weekday === day ? "" : ` on ${DAYS[held.weekday % 7]}`}` };
  });
  const pick = (deed: CatalogDeed) => {
    if (pop === null) return;
    const weekday = weekdayOf(pop.col), member = pop.member, id = `new-${deed.id}-${weekday}`;
    setLanded(id);
    startTransition(async () => {
      move({ add: { id, deedId: deed.id, choreDay: weekday, name: deed.name, area: deed.area, points: deed.points, weekday, assignee: member, source: member ? "admin" : null, claimed: false, status: null } });
      await addChoreToCell(deed.id, weekday, member, weekStart);
    });
  };

  return (
    <div className="relative overflow-x-auto rounded-3xl border border-line bg-surface-2">
      <table className="w-full min-w-max border-collapse text-left">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 w-36 bg-bg p-2" />
            {DAYS.map((d, i) => (
              <th key={d} scope="col" data-locked={locked(i) || undefined} className="min-w-44 p-2 align-bottom">
                <span className="eyebrow flex items-center gap-1">
                  {d}
                  {locked(i) && <Icon name="lock" className="size-3" />}
                </span>
                <span className="display text-lg font-bold tabular-nums">{dayLabel(weekStart, i)}</span>
                {rowDate(weekStart, i) === today && <Chip tone="points">Today</Chip>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {columns.map((c) => (
            <tr key={c.id ?? "none"} className="border-t border-line">
              <th scope="row" className="sticky left-0 z-10 bg-bg p-2 text-left align-top">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  {c.id ? <Avatar name={c.name} className="size-7" /> : null}
                  <span className="truncate">{c.name}</span>
                  {c.id === meId && <Chip tone="points">You</Chip>}
                </span>
              </th>
              {DAYS.map((d, i) => {
                const target = drag !== null && !locked(i) && (drag.weekday !== weekdayOf(i) || drag.assignee !== c.id);
                const cell = `${i}|${c.id}`;
                return (
                  <td key={d} data-locked={locked(i) || undefined} onDragOver={target ? (e) => { e.preventDefault(); if (over !== cell) setOver(cell); } : undefined}
                    onDrop={target ? (e) => { e.preventDefault(); setLanded(drag.id); assign(drag.id, c.id, weekdayOf(i)); endDrag(); } : undefined}
                    data-drop={target ? (over === cell ? "over" : "ready") : undefined} className="board-cell p-1.5 align-top">
                    <div className="flex min-h-24 flex-col gap-1.5">
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
                      </div>
                    ))}
                    {isAdmin && !locked(i) && (
                      <button type="button" aria-haspopup="dialog" aria-expanded={pop?.col === i && pop.member === c.id} aria-label={`Add a chore for ${c.name} on ${d} ${dayLabel(weekStart, i)}`}
                        onClick={(e) => setPop({ col: i, member: c.id, name: `${c.name} · ${d} ${dayLabel(weekStart, i)}`, rect: e.currentTarget.closest("td")!.getBoundingClientRect(), trigger: e.currentTarget })}
                        className="cell-add"><Icon name="plus" className="size-4" /></button>
                    )}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {pop && <CellPopup key={`${pop.col}|${pop.member}`} rect={pop.rect} title={pop.name} items={items()} onPick={pick} onClose={() => setPop((p) => (p === pop ? null : p))} trigger={pop.trigger} />}
    </div>
  );
}
