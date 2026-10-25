"use client";

import { startTransition, useOptimistic, useState } from "react";
import { assignChore, completeChore, dibChore, undibChore } from "../actions";
import { Avatar, Chip, ghost } from "../_components/ui";
import { SubmitButton } from "../_components/submit-button";

export type Card = {
  id: string; name: string; area: string | null; weight: number; weekday: number;
  assignee: string | null; source: string | null; claimed: boolean; status: string | null;
};
export type Housemate = { id: string; name: string };

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const small = `${ghost} min-h-8 px-2.5 py-1 text-xs`;

// "2026-10-19" plus n days, as a day number. Plain date arithmetic, no time zone involved.
const dayLabel = (weekStart: string, n: number) =>
  new Intl.DateTimeFormat("en", { day: "numeric", timeZone: "UTC" }).format(new Date(Date.parse(`${weekStart}T00:00:00Z`) + n * 86_400_000));

function Hidden({ id }: { id: string }) {
  return <input type="hidden" name="instance" value={id} />;
}

// Columns are housemates (plus Unassigned), rows are the days of the week.
// The admin drags cards between columns. The menu on a card is for touch screens and keyboards, so it only shows there.
// A card stays on its own weekday: only who does it changes.
export function Board({ weekStart, phase, housemates, cards, meId, isAdmin, showUnassigned }: {
  weekStart: string; phase: string; housemates: Housemate[]; cards: Card[]; meId: string; isAdmin: boolean; showUnassigned: boolean;
}) {
  const [view, move] = useOptimistic(cards, (cs, m: { id: string; to: string | null }) => cs.map((c) => (c.id === m.id ? { ...c, assignee: m.to } : c)));
  const [drag, setDrag] = useState<Card | null>(null);
  const columns: { id: string | null; name: string }[] = [...housemates, ...(showUnassigned ? [{ id: null, name: "Unassigned" }] : [])];
  const movable = (c: Card) => isAdmin && !c.claimed && phase !== "past";
  const assign = (id: string, to: string | null) => startTransition(async () => { move({ id, to }); await assignChore(id, to); });

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
            <tr key={d} className="border-t border-line">
              <th scope="row" className="sticky left-0 z-10 bg-bg p-2 text-left align-top">
                <span className="eyebrow block">{d}</span>
                <span className="display text-lg font-bold tabular-nums">{dayLabel(weekStart, i)}</span>
              </th>
              {columns.map((c) => {
                const target = drag !== null && drag.weekday === i + 1 && drag.assignee !== c.id;
                return (
                  <td key={c.id ?? "none"} onDragOver={target ? (e) => e.preventDefault() : undefined}
                    onDrop={target ? (e) => { e.preventDefault(); assign(drag.id, c.id); setDrag(null); } : undefined}
                    className={`space-y-1.5 p-1.5 align-top transition-colors duration-150 ${target ? "bg-accent/30 outline-2 -outline-offset-2 outline-dashed outline-ink/40" : ""}`}>
                    {view.filter((k) => k.weekday === i + 1 && k.assignee === c.id).map((k) => (
                      <div key={k.id} draggable={movable(k)} onDragStart={() => setDrag(k)} onDragEnd={() => setDrag(null)}
                        className={`rounded-2xl border border-line bg-surface p-2.5 text-sm ${movable(k) ? "cursor-grab active:cursor-grabbing" : ""} ${drag?.id === k.id ? "opacity-50" : ""}`}>
                        <p className="font-semibold leading-tight">{k.name}</p>
                        <p className="mt-1 flex items-center justify-between gap-2 text-xs text-muted">
                          <span className="truncate">{k.area ?? " "}</span>
                          <span className="flex gap-1">
                            {k.source === "dibs" && <Chip tone="muted">Dibs</Chip>}
                            <Chip tone="muted">{"●".repeat(k.weight)}</Chip>
                          </span>
                        </p>
                        {k.status && <p className="mt-1.5"><Chip tone={k.status === "accepted" ? "ok" : k.status === "pending" ? "warn" : "bad"}>{k.status === "accepted" ? "Done" : k.status === "pending" ? "Waiting for admin" : "Rejected"}</Chip></p>}
                        {movable(k) && (
                          <select aria-label={`Assign ${k.name}`} value={k.assignee ?? ""} onChange={(e) => assign(k.id, e.target.value || null)}
                            className="mt-2 w-full rounded-lg border border-line bg-surface-2 px-2 py-1 text-xs sr-only focus:not-sr-only [@media(hover:none)]:not-sr-only">
                            <option value="">Unassigned</option>
                            {housemates.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
                          </select>
                        )}
                        {!isAdmin && phase !== "past" && k.assignee === null && (
                          <form action={dibChore} className="mt-2"><Hidden id={k.id} /><SubmitButton className={small}>Dibs</SubmitButton></form>
                        )}
                        {!isAdmin && phase !== "past" && k.assignee === meId && k.source === "dibs" && !k.claimed && (
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
