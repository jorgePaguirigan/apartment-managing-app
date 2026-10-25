"use client";

import { useRef, useState, type DragEvent, type ReactNode } from "react";
import { useFlip, useLocal } from "./reorder";
import { addGroup, deleteDeed, editDeed, moveDeed, reorderGroups, saveDeed, setDeedActive } from "../actions";
import { ConfirmButton } from "./confirm-button";
import { SeeMore } from "./see-more";
import { SubmitButton } from "./submit-button";
import { Chip, Icon, arrow, button, ghost, input } from "./ui";

export type Deed = { id: string; name: string; points: number; active: boolean; group_id: string | null };
export type Group = { id: string; name: string };
type Section = { id: string | null; name: string; deeds: Deed[] };

const CAP = 20; // deed rows shown before See more

const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

// Catalog grouped by deed_group. The admin drags a deed by its handle onto another group (a "Move to" select on touch
// screens and keyboards, since HTML drag needs a mouse) and orders groups with the up/down arrows on each header.
// Moves show at once and the server catches up.
export function Catalog({ groups, deeds }: { groups: Group[]; deeds: Deed[] }) {
  const [view, setView] = useLocal(deeds, (ds) => ds.map((d) => `${d.id}:${d.group_id}`).join());
  const [order, setOrder] = useLocal(groups, (gs) => gs.map((g) => g.id).join());
  const [dropped, setDropped] = useState<string | null>(null); // FLIP key of what the user just carried; it lands where dropped
  const [drag, setDrag] = useState<Deed | null>(null);
  const [over, setOver] = useState<string | null | undefined>(undefined);
  const known = new Set(order.map((g) => g.id));
  const sections: Section[] = [
    ...order.map((g) => ({ id: g.id, name: g.name, deeds: view.filter((d) => d.group_id === g.id) })),
    { id: null, name: "Ungrouped", deeds: view.filter((d) => d.group_id === null || !known.has(d.group_id)) },
  ];
  const assign = (id: string, to: string | null, carried = false) => {
    setDropped(carried ? `d${id}` : null);
    setView(view.map((d) => (d.id === id ? { ...d, group_id: to } : d)));
    void moveDeed(id, to);
  };
  // Swap a group with its neighbour; Ungrouped stays last. Both groups slide to their new places.
  const nudge = (id: string, by: -1 | 1) => {
    const ids = order.map((g) => g.id);
    const i = ids.indexOf(id);
    if (i + by < 0 || i + by >= ids.length) return;
    [ids[i], ids[i + by]] = [ids[i + by], ids[i]];
    setDropped(null);
    setOrder(ids.flatMap((g) => order.filter((x) => x.id === g)));
    void reorderGroups(ids);
  };
  const dnd: Dnd = {
    groups: order, drag, over, dropped, assign, nudge,
    start: setDrag, hover: setOver, end: () => { setDrag(null); setOver(undefined); },
  };

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
        {order.length > 0 && (
          <select name="group" aria-label="Group" className={input} defaultValue="">
            <option value="">Ungrouped</option>
            {order.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        )}
        <p className="text-xs text-muted">Positive points can be claimed by housemates. Negative points are penalties only you can enter.</p>
        <SubmitButton className={`${button} w-full`} pendingText="Adding…">Add deed</SubmitButton>
      </form>
    </>
  );
}

type Dnd = {
  groups: Group[]; drag: Deed | null; over: string | null | undefined; dropped: string | null;
  assign: (id: string, to: string | null, carried?: boolean) => void; nudge: (id: string, by: -1 | 1) => void;
  start: (d: Deed) => void; hover: (g: string | null) => void; end: () => void;
};

function Sections({ sections, dnd }: { sections: Section[]; dnd: Dnd }) {
  const root = useRef<HTMLDivElement>(null);
  useFlip(root, "[data-deed], [data-group]", (el) => (el.dataset.deed ? `d${el.dataset.deed}` : `g${el.dataset.group}`), dnd.dropped);

  return (
    <div ref={root} className="space-y-4">
      {sections.map((s, i) => <GroupSection key={s.id ?? "none"} section={s} dnd={dnd} first={i === 0} last={i >= dnd.groups.length - 1} />)}
    </div>
  );
}

function GroupSection({ section: s, dnd, first, last }: { section: Section; dnd: Dnd; first: boolean; last: boolean }) {
  const target = dnd.drag !== null && (dnd.drag.group_id ?? null) !== s.id;
  return (
    <section aria-label={s.name} data-group={s.id ?? undefined}
      onDragOver={target ? (e: DragEvent<HTMLElement>) => { e.preventDefault(); if (dnd.over !== s.id) dnd.hover(s.id); } : undefined}
      onDrop={target ? (e) => { e.preventDefault(); dnd.assign(dnd.drag!.id, s.id, true); dnd.end(); } : undefined}
      className={`-mx-2 rounded-2xl px-2 pb-1 transition-[background-color,outline-color] duration-150 ${!target ? "" : dnd.over === s.id ? "bg-accent/20 outline-2 -outline-offset-2 outline-dashed outline-ink/60!" : "outline-2 -outline-offset-2 outline-dashed outline-ink/20!"}`}>
      <GroupHeading name={s.name} count={s.deeds.length} movable={s.id !== null} first={first} last={last} nudge={(by) => dnd.nudge(s.id!, by)}
        className="border-b border-line pb-1.5 pt-1 font-semibold" />
      <ul className="divide-y divide-line">
        {s.deeds.map((d) => <Row key={d.id} deed={d} dnd={dnd} />)}
        {!s.deeds.length && <li className="py-3 text-sm text-muted">{dnd.drag ? "Drop here" : "Drag deeds here"}</li>}
      </ul>
    </section>
  );
}

// A group's name with up/down arrows to move it. Shared with the housemate's "I did" cards.
export function GroupHeading({ name, count, movable, first, last, nudge, className }: {
  name: string; count?: number; movable: boolean; first: boolean; last: boolean; nudge: (by: -1 | 1) => void; className: string;
}): ReactNode {
  return (
    <h3 className={`flex items-center gap-2 ${className}`}>
      <span className="min-w-0 [overflow-wrap:anywhere]">{name}</span>
      {count !== undefined && <span className="text-xs font-medium text-muted tabular-nums">{count}</span>}
      {movable && (
        <span className="ml-auto flex shrink-0 gap-1 normal-case tracking-normal">
          <button type="button" aria-label={`Move ${name} up`} title="Move up" disabled={first} onClick={() => nudge(-1)} className={arrow}><Icon name="chevron" className="size-4 -rotate-90" /></button>
          <button type="button" aria-label={`Move ${name} down`} title="Move down" disabled={last} onClick={() => nudge(1)} className={arrow}><Icon name="chevron" className="size-4 rotate-90" /></button>
        </span>
      )}
    </h3>
  );
}

function Row({ deed: d, dnd }: { deed: Deed; dnd: Dnd }) {
  const [armed, setArmed] = useState(false); // only the handle starts a drag, so the edit inputs stay selectable
  const [editing, setEditing] = useState(false);
  const lifted = dnd.drag?.id === d.id;
  return (
    <li data-deed={d.id} draggable={armed}
      onDragStart={(e) => { e.stopPropagation(); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", d.name); dnd.start(d); }}
      onDragEnd={() => { setArmed(false); dnd.end(); }}
      className={`removable -mx-2 flex flex-wrap items-center gap-3 rounded-xl px-2 py-2 transition-[opacity,transform,background-color] duration-150 [@media(hover:hover)]:hover:bg-surface-2/60 ${lifted ? "scale-[0.98] opacity-40" : ""}`}>
      <div className="flex min-w-0 flex-1 items-stretch gap-2">
        {/* The handle spans the name and Edit lines, so it is an easy target. */}
        <button type="button" aria-label={`Drag ${d.name}`} onPointerDown={() => { setArmed(true); addEventListener("pointerup", () => setArmed(false), { once: true }); }}
          className="-ml-1 grid w-9 shrink-0 cursor-grab place-items-center self-stretch rounded-xl text-muted transition-[transform,color,background-color] duration-150 ease-out hover:bg-surface-2 hover:text-ink active:scale-95 active:cursor-grabbing [@media(hover:none)]:hidden">
          <Icon name="grip" className="size-5" />
        </button>
        <div className="min-w-0 py-0.5">
          <span className={`block break-words ${d.active ? "" : "text-muted line-through"}`}>{d.name}</span>
          <button type="button" aria-expanded={editing} onClick={() => setEditing(!editing)}
            className="-ml-0.5 mt-0.5 inline-flex items-center gap-0.5 rounded-md text-xs text-muted transition-colors duration-150 hover:text-ink">
            <Icon name="chevron" className={`size-3.5 transition-transform duration-150 ease-out ${editing ? "rotate-90" : ""}`} />Edit
          </button>
        </div>
      </div>
      <Chip tone={d.points > 0 ? "points" : "bad"} className="px-3 py-1 text-sm">{signed(d.points)}</Chip>
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
      {editing && (
        <div className="reveal basis-full space-y-2">
          <form action={editDeed} className="flex gap-2">
            <input type="hidden" name="deed" value={d.id} />
            <input name="name" defaultValue={d.name} required aria-label="Deed name" className={`${input} min-w-0 flex-1`} />
            <input name="points" type="number" inputMode="numeric" defaultValue={d.points} required aria-label="Points" className={`${input} min-w-0 w-24! shrink-0`} />
            <SubmitButton className={ghost} pendingText="…">Save</SubmitButton>
          </form>
          <ConfirmButton label="Delete" pendingText="Deleting…" action={deleteDeed} name="deed" value={d.id} className="w-full"
            prompt={`Delete ${d.name}? It leaves the catalog. Points already scored for it stay.`} />
        </div>
      )}
    </li>
  );
}
