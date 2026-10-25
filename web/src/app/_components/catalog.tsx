"use client";

import { startTransition, useLayoutEffect, useOptimistic, useRef, useState } from "react";
import { addGroup, deleteDeed, editDeed, moveDeed, saveDeed, setDeedActive } from "../actions";
import { ConfirmButton } from "./confirm-button";
import { SeeMore } from "./see-more";
import { SubmitButton } from "./submit-button";
import { Chip, Icon, button, ghost, input } from "./ui";

export type Deed = { id: string; name: string; points: number; active: boolean; group_id: string | null };
export type Group = { id: string; name: string };
type Section = { id: string | null; name: string; deeds: Deed[] };

const CAP = 20; // deed rows shown before See more
const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

// Catalog grouped by deed_group. The admin drags a row by its handle onto another group; the move shows at once and
// the server catches up. Touch screens and keyboards get a "Move to" select instead, since HTML drag needs a mouse.
export function Catalog({ groups, deeds }: { groups: Group[]; deeds: Deed[] }) {
  const [view, move] = useOptimistic(deeds, (ds, m: { id: string; to: string | null }) => ds.map((d) => (d.id === m.id ? { ...d, group_id: m.to } : d)));
  const [drag, setDrag] = useState<Deed | null>(null);
  const [over, setOver] = useState<string | null | undefined>(undefined);
  const known = new Set(groups.map((g) => g.id));
  const sections: Section[] = [
    ...groups.map((g) => ({ id: g.id, name: g.name, deeds: view.filter((d) => d.group_id === g.id) })),
    { id: null, name: "Ungrouped", deeds: view.filter((d) => d.group_id === null || !known.has(d.group_id)) },
  ];
  const assign = (id: string, to: string | null) => startTransition(async () => { move({ id, to }); await moveDeed(id, to); });
  const dnd: Dnd = { groups, drag, over, assign, start: setDrag, hover: setOver, end: () => { setDrag(null); setOver(undefined); } };

  // Fill groups in order until CAP rows; groups past the cap wait for See more. Empty groups stay visible as drop targets.
  let room = CAP;
  const capped = sections.map((s) => { const shown = s.deeds.slice(0, Math.max(room, 0)); room -= s.deeds.length; return { ...s, deeds: shown, cut: shown.length < s.deeds.length }; })
    .filter((s) => s.deeds.length || (!s.cut && s.id !== null));

  return (
    <>
      <Sections sections={capped} dnd={dnd} />
      {view.length > CAP && <SeeMore title="Catalog" total={view.length}><Sections sections={sections.filter((s) => s.deeds.length || s.id !== null)} dnd={dnd} /></SeeMore>}
      <form action={addGroup} className="flex gap-2 border-t border-line pt-3">
        <input name="name" required maxLength={40} placeholder="New group, e.g. Kitchen" aria-label="Group name" className={`${input} min-w-0 flex-1`} />
        <SubmitButton className={`${ghost} min-h-12 shrink-0 px-4`} pendingText="Adding…"><Icon name="plus" className="size-4" />Add group</SubmitButton>
      </form>
      <form action={saveDeed} className="space-y-2 border-t border-line pt-3">
        <div className="flex gap-2">
          <input name="name" placeholder="New deed" required aria-label="Deed name" className={`${input} min-w-0 flex-1`} />
          <input name="points" type="number" inputMode="numeric" placeholder="±pts" required aria-label="Points" className={`${input} min-w-0 w-24! shrink-0`} />
        </div>
        {groups.length > 0 && (
          <select name="group" aria-label="Group" className={input} defaultValue="">
            <option value="">Ungrouped</option>
            {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        )}
        <p className="text-xs text-muted">Positive points can be claimed by housemates. Negative points are penalties only you can enter.</p>
        <SubmitButton className={`${button} w-full`} pendingText="Adding…">Add deed</SubmitButton>
      </form>
    </>
  );
}

type Dnd = {
  groups: Group[]; drag: Deed | null; over: string | null | undefined;
  assign: (id: string, to: string | null) => void; start: (d: Deed) => void; hover: (g: string | null) => void; end: () => void;
};

function Sections({ sections, dnd }: { sections: Section[]; dnd: Dnd }) {
  const root = useRef<HTMLDivElement>(null);
  const last = useRef(new Map<string, number>());
  // Rows that changed place slide from where they were (FLIP), so a dropped deed settles into its group instead of jumping.
  useLayoutEffect(() => {
    const box = root.current;
    if (!box) return;
    const base = box.getBoundingClientRect().top;
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const now = new Map<string, number>();
    box.querySelectorAll<HTMLElement>("[data-deed]").forEach((el) => {
      const top = el.getBoundingClientRect().top - base;
      const was = last.current.get(el.dataset.deed!);
      if (!still && was !== undefined && Math.abs(was - top) > 1)
        el.animate([{ transform: `translateY(${was - top}px)` }, { transform: "none" }], { duration: 320, easing: "cubic-bezier(0.23, 1, 0.32, 1)" });
      now.set(el.dataset.deed!, top);
    });
    last.current = now;
  });

  return (
    <div ref={root} className="space-y-4">
      {sections.map((s) => {
        const key = s.id ?? "none";
        const target = dnd.drag !== null && (dnd.drag.group_id ?? null) !== s.id;
        return (
          <section key={key} aria-label={s.name}
            onDragOver={target ? (e) => { e.preventDefault(); if (dnd.over !== s.id) dnd.hover(s.id); } : undefined}
            onDrop={target ? (e) => { e.preventDefault(); dnd.assign(dnd.drag!.id, s.id); dnd.end(); } : undefined}
            className={`-mx-2 rounded-2xl px-2 pb-1 transition-[background-color,outline-color] duration-150 ${!target ? "" : dnd.over === s.id ? "bg-accent/20 outline-2 -outline-offset-2 outline-dashed outline-ink/60!" : "outline-2 -outline-offset-2 outline-dashed outline-ink/20!"}`}>
            <h3 className="flex items-center gap-2 border-b border-line pb-1.5 pt-1 font-semibold">
              {s.name}<span className="text-xs font-medium text-muted tabular-nums">{s.deeds.length}</span>
            </h3>
            <ul className="divide-y divide-line">
              {s.deeds.map((d) => <Row key={d.id} deed={d} dnd={dnd} />)}
              {!s.deeds.length && <li className="py-3 text-sm text-muted">{dnd.drag ? "Drop here" : "Drag deeds here"}</li>}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function Row({ deed: d, dnd }: { deed: Deed; dnd: Dnd }) {
  const [armed, setArmed] = useState(false); // only the handle starts a drag, so the edit inputs stay selectable
  const lifted = dnd.drag?.id === d.id;
  return (
    <li data-deed={d.id} draggable={armed}
      onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", d.name); dnd.start(d); }}
      onDragEnd={() => { setArmed(false); dnd.end(); }}
      className={`removable flex flex-wrap items-center gap-3 py-2.5 transition-[opacity,transform] duration-150 ${lifted ? "scale-[0.98] opacity-40" : ""}`}>
      <button type="button" aria-label={`Drag ${d.name}`} onPointerDown={() => setArmed(true)} onPointerUp={() => setArmed(false)}
        className="-ml-1 grid size-8 shrink-0 cursor-grab place-items-center rounded-lg text-muted transition-[transform,color,background-color] duration-150 ease-out hover:bg-surface-2 hover:text-ink active:scale-90 active:cursor-grabbing [@media(hover:none)]:hidden">
        <Icon name="grip" className="size-4" />
      </button>
      <span className={`min-w-0 flex-1 break-words ${d.active ? "" : "text-muted line-through"}`}>{d.name}</span>
      <Chip tone={d.points > 0 ? "points" : "bad"}>{signed(d.points)}</Chip>
      {!d.active && (
        <form action={setDeedActive}>
          <input type="hidden" name="deed" value={d.id} />
          <SubmitButton name="active" value="1" pendingText="…" className={ghost}>Show</SubmitButton>
        </form>
      )}
      {dnd.groups.length > 0 && (
        <select aria-label={`Move ${d.name} to group`} value={d.group_id ?? ""} onChange={(e) => dnd.assign(d.id, e.target.value || null)}
          className={`${input} basis-full py-2 text-sm sr-only focus:not-sr-only [@media(hover:none)]:not-sr-only`}>
          <option value="">Ungrouped</option>
          {dnd.groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      )}
      <details className="basis-full">
        <summary className="cursor-pointer text-xs text-muted transition-colors duration-150 hover:text-ink">Edit</summary>
        <div className="reveal mt-2 space-y-2">
          <form action={editDeed} className="flex gap-2">
            <input type="hidden" name="deed" value={d.id} />
            <input name="name" defaultValue={d.name} required aria-label="Deed name" className={`${input} min-w-0 flex-1`} />
            <input name="points" type="number" inputMode="numeric" defaultValue={d.points} required aria-label="Points" className={`${input} min-w-0 w-24! shrink-0`} />
            <SubmitButton className={ghost} pendingText="…">Save</SubmitButton>
          </form>
          <ConfirmButton label="Delete" pendingText="Deleting…" action={deleteDeed} name="deed" value={d.id} className="w-full"
            prompt={`Delete ${d.name}? It leaves the catalog. Points already scored for it stay.`} />
        </div>
      </details>
    </li>
  );
}
