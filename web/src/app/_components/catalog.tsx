"use client";

import { useRef, useState, type DragEvent } from "react";
import { useFlip, useLocal } from "./reorder";
import { addGroup, deleteDeed, editDeed, moveDeed, reorderGroups, saveDeed, setDeedActive } from "../actions";
import { ConfirmButton } from "./confirm-button";
import { SeeMore } from "./see-more";
import { SubmitButton } from "./submit-button";
import { Chip, Icon, button, ghost, input } from "./ui";

export type Deed = { id: string; name: string; points: number; active: boolean; group_id: string | null };
export type Group = { id: string; name: string };
type Section = { id: string | null; name: string; deeds: Deed[] };
type Slot = { id: string | null; after: boolean }; // where a dragged group would land: before or after this section

const CAP = 20; // deed rows shown before See more

// The order with `lift` moved before or after `to` (to.id null means the end). Used for the live preview and the drop.
function arrange(ids: string[], lift: string, to: Slot) {
  const rest = ids.filter((id) => id !== lift);
  const at = to.id === null ? rest.length : rest.indexOf(to.id);
  rest.splice(at < 0 ? rest.length : at + (to.id !== null && to.after ? 1 : 0), 0, lift);
  return rest;
}

const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

// Catalog grouped by deed_group. The admin drags a deed by its handle onto another group, or a whole group by its
// header to reorder groups; moves show at once and the server catches up. Touch screens and keyboards get a
// "Move to" select for deeds and up/down buttons for groups, since HTML drag needs a mouse.
export function Catalog({ groups, deeds }: { groups: Group[]; deeds: Deed[] }) {
  const [view, setView] = useLocal(deeds, (ds) => ds.map((d) => `${d.id}:${d.group_id}`).join());
  const [order, setOrder] = useLocal(groups, (gs) => gs.map((g) => g.id).join());
  const [dropped, setDropped] = useState<string | null>(null); // FLIP key of what the user just carried; it lands where dropped
  const [drag, setDrag] = useState<Deed | null>(null);
  const [over, setOver] = useState<string | null | undefined>(undefined);
  const [lift, setLift] = useState<string | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const known = new Set(order.map((g) => g.id));
  // While a group is dragged the others make room live, so the drop itself moves nothing.
  const ids = order.map((g) => g.id);
  const shown = (lift && slot ? arrange(ids, lift, slot) : ids).flatMap((id) => order.filter((g) => g.id === id));
  const sections: Section[] = [
    ...shown.map((g) => ({ id: g.id, name: g.name, deeds: view.filter((d) => d.group_id === g.id) })),
    { id: null, name: "Ungrouped", deeds: view.filter((d) => d.group_id === null || !known.has(d.group_id)) },
  ];
  const assign = (id: string, to: string | null, carried = false) => {
    setDropped(carried ? `d${id}` : null);
    setView(view.map((d) => (d.id === id ? { ...d, group_id: to } : d)));
    void moveDeed(id, to);
  };
  const place = (ids: string[], carried: string | null) => {
    if (ids.join() === order.map((g) => g.id).join()) return;
    setDropped(carried && `g${carried}`);
    setOrder(ids.flatMap((id) => order.filter((g) => g.id === id)));
    void reorderGroups(ids);
  };
  // Drop the lifted group before or after another one; Ungrouped is always last, so dropping there means "to the end".
  const land = (to: Slot) => { if (lift) place(arrange(ids, lift, to), lift); };
  const nudge = (id: string, by: -1 | 1) => {
    const ids = order.map((g) => g.id);
    const i = ids.indexOf(id);
    if (i + by < 0 || i + by >= ids.length) return;
    [ids[i], ids[i + by]] = [ids[i + by], ids[i]];
    place(ids, null);
  };
  const dnd: Dnd = {
    groups: order, drag, over, lift, slot, dropped, assign, land, nudge,
    start: setDrag, hover: setOver, end: () => { setDrag(null); setOver(undefined); },
    lifting: (g) => { setDropped(null); setLift(g); }, aim: setSlot, drop: () => { setLift(null); setSlot(null); },
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
  groups: Group[]; drag: Deed | null; over: string | null | undefined; lift: string | null; slot: Slot | null; dropped: string | null;
  assign: (id: string, to: string | null, carried?: boolean) => void; land: (to: Slot) => void; nudge: (id: string, by: -1 | 1) => void;
  start: (d: Deed) => void; hover: (g: string | null) => void; end: () => void;
  lifting: (g: string) => void; aim: (s: Slot) => void; drop: () => void;
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
  const [armed, setArmed] = useState(false); // only the header starts a group drag
  const deedTarget = dnd.drag !== null && (dnd.drag.group_id ?? null) !== s.id;
  const groupTarget = dnd.lift !== null; // the lifted group's own spot accepts the drop too, so it never snaps back
  const over = (e: DragEvent<HTMLElement>) => {
    if (deedTarget) { e.preventDefault(); if (dnd.over !== s.id) dnd.hover(s.id); }
    if (groupTarget) {
      e.preventDefault();
      if (dnd.lift === s.id) return;
      const r = e.currentTarget.getBoundingClientRect();
      const after = s.id !== null && e.clientY > r.top + r.height / 2;
      if (dnd.slot?.id !== s.id || dnd.slot.after !== after) dnd.aim({ id: s.id, after });
    }
  };
  return (
    <section aria-label={s.name} data-group={s.id ?? undefined} draggable={armed}
      onDragStart={(e) => { if (e.target !== e.currentTarget || !s.id) return; e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", s.name); dnd.lifting(s.id); }}
      onDragEnd={() => { setArmed(false); dnd.drop(); }}
      onDragOver={deedTarget || groupTarget ? over : undefined}
      onDrop={deedTarget || groupTarget ? (e) => {
        e.preventDefault();
        if (deedTarget) { dnd.assign(dnd.drag!.id, s.id, true); dnd.end(); }
        if (groupTarget) { if (dnd.slot) dnd.land(dnd.slot); dnd.drop(); }
      } : undefined}
      className={`-mx-2 rounded-2xl px-2 pb-1 transition-[background-color,outline-color,box-shadow,opacity] duration-150
        ${s.id !== null && dnd.lift === s.id ? "opacity-40" : ""}
        ${!deedTarget ? "" : dnd.over === s.id ? "bg-accent/20 outline-2 -outline-offset-2 outline-dashed outline-ink/60!" : "outline-2 -outline-offset-2 outline-dashed outline-ink/20!"}`}>
      <h3 onPointerDown={s.id ? () => { setArmed(true); addEventListener("pointerup", () => setArmed(false), { once: true }); } : undefined}
        className={`flex items-center gap-2 border-b border-line pb-1.5 pt-1 font-semibold ${s.id ? "cursor-grab select-none active:cursor-grabbing" : ""}`}>
        {s.id && <Icon name="grip" className="size-4 text-muted [@media(hover:none)]:hidden" />}
        <span className="min-w-0 [overflow-wrap:anywhere]">{s.name}</span><span className="text-xs font-medium text-muted tabular-nums">{s.deeds.length}</span>
        {s.id && (
          <span className="ml-auto flex gap-1 [@media(hover:hover)]:sr-only [@media(hover:hover)]:focus-within:not-sr-only" onPointerDown={(e) => e.stopPropagation()}>
            <button type="button" aria-label={`Move ${s.name} up`} disabled={first} onClick={() => dnd.nudge(s.id!, -1)}
              className="grid size-8 place-items-center rounded-full text-muted transition-[transform,color,background-color] duration-150 ease-out hover:bg-surface-2 hover:text-ink active:scale-90 disabled:opacity-30">
              <Icon name="chevron" className="size-4 -rotate-90" />
            </button>
            <button type="button" aria-label={`Move ${s.name} down`} disabled={last} onClick={() => dnd.nudge(s.id!, 1)}
              className="grid size-8 place-items-center rounded-full text-muted transition-[transform,color,background-color] duration-150 ease-out hover:bg-surface-2 hover:text-ink active:scale-90 disabled:opacity-30">
              <Icon name="chevron" className="size-4 rotate-90" />
            </button>
          </span>
        )}
      </h3>
      <ul className="divide-y divide-line">
        {s.deeds.map((d) => <Row key={d.id} deed={d} dnd={dnd} />)}
        {!s.deeds.length && <li className="py-3 text-sm text-muted">{dnd.drag ? "Drop here" : "Drag deeds here"}</li>}
      </ul>
    </section>
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
