"use client";

import { useRef, useState, type DragEvent } from "react";
import { useFormStatus } from "react-dom";
import { setMyGroupOrder, submitClaim, submitCustomClaim } from "../actions";
import { useFlip, useLocal } from "./reorder";
import { SubmitButton } from "./submit-button";
import { Icon, Kbd, button, input } from "./ui";

type Deed = { id: string; name: string; points: number; group_id: string | null };
type Group = { id: string; name: string };

function DeedButton({ deed }: { deed: Deed }) {
  const { pending, data } = useFormStatus();
  const mine = pending && data?.get("deed") === deed.id;
  return (
    <button type="submit" name="deed" value={deed.id} disabled={pending} aria-busy={mine}
      className="flex min-h-28 flex-col justify-between rounded-2xl border border-line bg-bg p-4 text-left transition-[transform,background-color,border-color] duration-150 ease-out hover:border-ink active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50">
      <span className="font-semibold leading-snug">{mine ? "Sending…" : deed.name}</span>
      <span className="display inline-flex w-fit items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-sm font-bold text-[#16171b]">
        <Icon name="plus" className="size-3.5" />{deed.points}
      </span>
    </button>
  );
}

type Lift = { lift: string | null; slot: { key: string; after: boolean } | null };

// The order with `lift` moved before or after `to` ("other" means the end).
function arrange(ids: string[], lift: string, to: { key: string; after: boolean }) {
  const rest = ids.filter((id) => id !== lift);
  const at = to.key === "other" ? rest.length : rest.indexOf(to.key);
  rest.splice(at < 0 ? rest.length : at + (to.key !== "other" && to.after ? 1 : 0), 0, lift);
  return rest;
}

// One tap sends a claim to the admin. The optional note goes with the next tap.
// Cards follow the catalog groups in this housemate's own order (dragged by the heading, or the arrows on touch
// screens); deeds with no group come last under Other. Their order never changes the admin's catalog.
export function ClaimForm({ deeds, groups }: { deeds: Deed[]; groups: Group[] }) {
  const ref = useRef<HTMLFormElement>(null);
  const customRef = useRef<HTMLFormElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const [sent, setSent] = useState(false);
  const [order, setOrder] = useLocal(groups, (gs) => gs.map((g) => g.id).join());
  const [drag, setDrag] = useState<Lift>({ lift: null, slot: null });
  const [dropped, setDropped] = useState<string | null>(null);
  const known = new Set(order.map((g) => g.id));
  // While a group is dragged the others make room live, so the drop itself moves nothing.
  const shown = drag.lift && drag.slot ? arrange(order.map((g) => g.id), drag.lift, drag.slot).flatMap((id) => order.filter((g) => g.id === id)) : order;
  const sections = [
    ...shown.map((g) => ({ key: g.id, name: g.name, deeds: deeds.filter((d) => d.group_id === g.id) })),
    { key: "other", name: "Other", deeds: deeds.filter((d) => !d.group_id || !known.has(d.group_id)) },
  ].filter((s) => s.deeds.length);
  const titled = sections.length > 1 || sections[0]?.key !== "other"; // no headings when the admin made no groups
  const movable = sections.filter((s) => s.key !== "other").map((s) => s.key);
  useFlip(list, "[data-group]", (el) => el.dataset.group!, dropped);

  function place(keys: string[], carried: string | null) {
    if (keys.join() === movable.join()) return;
    setDropped(carried);
    // Groups with no claimable deeds are hidden here; keep them after the visible ones so the saved order is complete.
    const ids = [...keys, ...order.map((g) => g.id).filter((id) => !keys.includes(id))];
    setOrder(ids.flatMap((id) => order.filter((g) => g.id === id)));
    void setMyGroupOrder(ids);
  }
  function land() {
    if (drag.lift && drag.slot) place(movable, drag.lift); // movable already reflects the live preview
  }
  function nudge(key: string, by: -1 | 1) {
    const keys = [...movable];
    const i = keys.indexOf(key);
    if (i + by < 0 || i + by >= keys.length) return;
    [keys[i], keys[i + by]] = [keys[i + by], keys[i]];
    place(keys, null);
  }
  async function action(formData: FormData) {
    setSent(false);
    await submitClaim(formData);
    ref.current?.reset();
    setSent(true);
  }
  async function customAction(formData: FormData) {
    setSent(false);
    await submitCustomClaim(formData);
    customRef.current?.reset();
    setSent(true);
  }
  return (
    <div className="space-y-3">
    <form ref={ref} action={action} className="space-y-3">
      <input name="note" placeholder="Add a note (optional)" aria-label="Note for your admin" className={input} />
      <div ref={list} className="space-y-3">
        {sections.map((s) => (
          <GroupBlock key={s.key} name={s.name} id={s.key} titled={titled} movable={s.key !== "other" && movable.length > 1}
            first={movable[0] === s.key} last={movable.at(-1) === s.key} drag={drag} land={land} nudge={nudge}
            setDrag={(d) => { if (d.lift && !drag.lift) setDropped(null); setDrag(d); }}>
            {s.deeds.map((d) => <DeedButton key={d.id} deed={d} />)}
          </GroupBlock>
        ))}
      </div>
    </form>
    <form ref={customRef} action={customAction} className="space-y-2 border-t border-line pt-3">
      <label className="block space-y-1.5 text-sm font-semibold">
        <span>Something else? Say what you did<Kbd>⌘+</Kbd></span>
        <span className="flex gap-2">
          <input name="title" data-shortcut="custom-deed" required maxLength={80} placeholder="e.g. Fixed the shelf" className={`${input} font-normal`} />
          <SubmitButton className={`${button} shrink-0`} pendingText="Sending…">Send</SubmitButton>
        </span>
      </label>
      <p className="text-xs text-muted">Your admin picks the points when approving.</p>
    </form>
    <p role="status" className="min-h-5 text-sm font-semibold text-ok">{sent ? "Sent to your admin for approval." : ""}</p>
    </div>
  );
}

function GroupBlock({ id, name, titled, movable, first, last, drag, setDrag, land, nudge, children }: {
  id: string; name: string; titled: boolean; movable: boolean; first: boolean; last: boolean;
  drag: Lift; setDrag: (d: Lift) => void; land: () => void; nudge: (key: string, by: -1 | 1) => void; children: React.ReactNode;
}) {
  const [armed, setArmed] = useState(false); // only the heading starts a drag, so the deed cards stay tappable
  const target = drag.lift !== null; // the lifted group's own spot accepts the drop too, so it never snaps back
  const over = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (drag.lift === id) return;
    const r = e.currentTarget.getBoundingClientRect();
    const after = id !== "other" && e.clientY > r.top + r.height / 2;
    if (drag.slot?.key !== id || drag.slot.after !== after) setDrag({ ...drag, slot: { key: id, after } });
  };
  const arrow = "grid size-8 place-items-center rounded-full text-muted transition-[transform,color,background-color] duration-150 ease-out hover:bg-surface-2 hover:text-ink active:scale-90 disabled:opacity-30";
  return (
    <div data-group={id} draggable={armed}
      onDragStart={(e) => { if (e.target !== e.currentTarget) return; e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", name); setDrag({ lift: id, slot: null }); }}
      onDragEnd={() => { setArmed(false); setDrag({ lift: null, slot: null }); }}
      onDragOver={target ? over : undefined}
      onDrop={target ? (e) => { e.preventDefault(); land(); setDrag({ lift: null, slot: null }); } : undefined}
      className={`-mx-2 space-y-2 rounded-2xl px-2 pb-1 transition-opacity duration-150 ${drag.lift === id ? "opacity-40" : ""}`}>
      {titled && (
        <h3 onPointerDown={movable ? () => { setArmed(true); addEventListener("pointerup", () => setArmed(false), { once: true }); } : undefined}
          className={`eyebrow flex items-center gap-1.5 px-1 pt-1 ${movable ? "cursor-grab select-none active:cursor-grabbing" : ""}`}>
          {movable && <Icon name="grip" className="size-3.5 [@media(hover:none)]:hidden" />}
          <span className="min-w-0 [overflow-wrap:anywhere]">{name}</span>
          {movable && (
            <span className="ml-auto flex gap-1 normal-case tracking-normal [@media(hover:hover)]:sr-only [@media(hover:hover)]:focus-within:not-sr-only" onPointerDown={(e) => e.stopPropagation()}>
              <button type="button" aria-label={`Move ${name} up`} disabled={first} onClick={() => nudge(id, -1)} className={arrow}><Icon name="chevron" className="size-4 -rotate-90" /></button>
              <button type="button" aria-label={`Move ${name} down`} disabled={last} onClick={() => nudge(id, 1)} className={arrow}><Icon name="chevron" className="size-4 rotate-90" /></button>
            </span>
          )}
        </h3>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{children}</div>
    </div>
  );
}
