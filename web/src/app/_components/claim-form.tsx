"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { setMyGroupOrder, submitClaim, submitCustomClaim } from "../actions";
import { useFlip, useLocal } from "./reorder";
import { GroupHeading } from "./catalog";
import { ContributorsPicker } from "./contributors-picker";
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

// One tap sends a claim to the admin. The optional note goes with the next tap.
// Cards follow the catalog groups in this housemate's own order, set with the up/down arrows on each heading; deeds
// with no group come last under Other. Their order never changes the admin's catalog.
export function ClaimForm({ deeds, groups, mates }: { deeds: Deed[]; groups: Group[]; mates: { id: string; name: string }[] }) {
  const ref = useRef<HTMLFormElement>(null);
  const customRef = useRef<HTMLFormElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const [sent, setSent] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [order, setOrder] = useLocal(groups, (gs) => gs.map((g) => g.id).join());
  const known = new Set(order.map((g) => g.id));
  const sections = [
    ...order.map((g) => ({ key: g.id, name: g.name, deeds: deeds.filter((d) => d.group_id === g.id) })),
    { key: "other", name: "Other", deeds: deeds.filter((d) => !d.group_id || !known.has(d.group_id)) },
  ].filter((s) => s.deeds.length);
  const titled = sections.length > 1 || sections[0]?.key !== "other"; // no headings when the admin made no groups
  const movable = sections.filter((s) => s.key !== "other").map((s) => s.key);
  useFlip(list, "[data-group]", (el) => el.dataset.group!, null);

  // Swap a group with its visible neighbour. Groups with no claimable deeds are hidden here; they keep their place
  // after the visible ones so the saved order is complete.
  function nudge(key: string, by: -1 | 1) {
    const keys = [...movable];
    const i = keys.indexOf(key);
    if (i + by < 0 || i + by >= keys.length) return;
    [keys[i], keys[i + by]] = [keys[i + by], keys[i]];
    const ids = [...keys, ...order.map((g) => g.id).filter((id) => !keys.includes(id))];
    setOrder(ids.flatMap((id) => order.filter((g) => g.id === id)));
    void setMyGroupOrder(ids);
  }
  async function action(formData: FormData) {
    setSent(false);
    await submitClaim(formData);
    ref.current?.reset();
    setPicked([]);
    setSent(true);
  }
  async function customAction(formData: FormData) {
    setSent(false);
    await submitCustomClaim(formData);
    customRef.current?.reset();
    setPicked([]);
    setSent(true);
  }
  return (
    <div className="space-y-3">
    {mates.length > 0 && <ContributorsPicker mates={mates} picked={picked} onChange={setPicked} />}
    <form ref={ref} action={action} className="space-y-3">
      {picked.map((id) => <input key={id} type="hidden" name="contributor" value={id} />)}
      <input name="note" placeholder="Add a note (optional)" aria-label="Note for your admin" className={input} />
      <div ref={list} className="space-y-3">
        {sections.map((s) => (
          <div key={s.key} data-group={s.key} className="space-y-2">
            {titled && <GroupHeading name={s.name} movable={s.key !== "other" && movable.length > 1} first={movable[0] === s.key}
              last={movable.at(-1) === s.key} nudge={(by) => nudge(s.key, by)} className="eyebrow px-1 pt-1" />}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {s.deeds.map((d) => <DeedButton key={d.id} deed={d} />)}
            </div>
          </div>
        ))}
      </div>
    </form>
    <form ref={customRef} action={customAction} className="space-y-2 border-t border-line pt-3">
      {picked.map((id) => <input key={id} type="hidden" name="contributor" value={id} />)}
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

