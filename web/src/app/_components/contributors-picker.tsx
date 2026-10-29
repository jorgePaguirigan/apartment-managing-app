"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Avatar, Icon } from "./ui";

type Mate = { id: string; name: string };

// "Contributors" dropdown under I did…. Lists the other housemates; the claimer is always counted, so a claim holds at most
// everyone in the house. The panel stays mounted and fades/scales from the trigger (.pop in globals.css) so it can be reopened mid-motion.
export function ContributorsPicker({ mates, picked, onChange }: { mates: Mate[]; picked: string[]; onChange: (ids: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const panel = useId();
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", away); document.removeEventListener("keydown", esc); };
  }, [open]);

  const names = mates.filter((m) => picked.includes(m.id)).map((m) => m.name);
  const toggle = (id: string) => onChange(picked.includes(id) ? picked.filter((p) => p !== id) : [...picked, id]);
  return (
    <div ref={root} className="relative">
      <button type="button" aria-expanded={open} aria-controls={panel} onClick={() => setOpen(!open)}
        className="flex min-h-12 w-full items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-2 text-left transition-[border-color,transform] duration-150 ease-out active:scale-[0.99] [@media(hover:hover)]:hover:border-ink">
        <span className="eyebrow shrink-0">Contributors</span>
        <span className={`min-w-0 flex-1 truncate ${names.length ? "font-semibold" : "text-muted"}`}>{names.length ? `With ${names.join(", ")}` : "Just me"}</span>
        <span className="display shrink-0 rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-bold tabular-nums">{picked.length + 1}/{mates.length + 1}</span>
        <Icon name="chevron" className={`size-4 shrink-0 text-muted transition-transform duration-200 ease-out ${open ? "rotate-90" : ""}`} />
      </button>
      <div id={panel} role="group" aria-label="Contributors" data-open={open} inert={!open}
        className="pop absolute inset-x-0 top-full z-20 mt-2 max-h-72 overflow-y-auto rounded-2xl border border-line bg-surface p-1.5 shadow-[var(--shadow)]">
        <p className="px-3 pb-1 pt-1.5 text-xs text-muted">Who did it with you? Each person gets the full points when your admin accepts.</p>
        {mates.map((m) => (
          <label key={m.id} className="group flex min-h-12 cursor-pointer items-center gap-3 rounded-xl px-3 py-2 transition-[background-color,transform] duration-150 ease-out active:scale-[0.98] [@media(hover:hover)]:hover:bg-surface-2">
            <input type="checkbox" className="peer sr-only" checked={picked.includes(m.id)} onChange={() => toggle(m.id)} />
            <Avatar name={m.name} className="size-8" />
            <span className="min-w-0 flex-1 truncate font-semibold">{m.name}</span>
            <span aria-hidden className="grid size-6 place-items-center rounded-full border border-line text-[#16171b] transition-[background-color,border-color,transform] duration-150 ease-out peer-checked:scale-110 peer-checked:border-transparent peer-checked:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-ink [&>svg]:scale-0 [&>svg]:transition-transform [&>svg]:duration-150 peer-checked:[&>svg]:scale-100">
              <Icon name="check" className="size-3.5" />
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
