"use client";

import { useEffect, useRef, useState } from "react";
import { Chip, Icon } from "../_components/ui";

export type CatalogDeed = { id: string; name: string; area: string | null; points: number };
// free: can be added to this cell; here: already in this cell; taken: on this day in another cell (`by` says whose).
export type Item = { deed: CatalogDeed; state: "free" | "here" | "taken"; by?: string };

const WIDTH = 320;
const CLOSE_MS = 120;
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

// A Google Calendar style popover for one board cell: one column of catalog chores with a checkbox each. It grows out of the cell
// (a bottom sheet on phones), stays open so several chores can be ticked, and closes on Esc, the X, or a press outside.
export function CellPopup({ rect, title, items, onPick, onClose, trigger }: {
  rect: DOMRect; title: string; items: Item[]; onPick: (d: CatalogDeed) => void; onClose: () => void; trigger: HTMLElement;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [closing, setClosing] = useState(false);
  const [sheet] = useState(() => matchMedia("(max-width: 639px)").matches);

  const close = (refocus: boolean) => {
    if (closing) return;
    setClosing(true);
    if (refocus) trigger.focus();
    setTimeout(onClose, reduced() ? 0 : CLOSE_MS);
  };
  const closeRef = useRef(close);
  useEffect(() => { closeRef.current = close; });

  useEffect(() => {
    ref.current?.querySelector<HTMLInputElement>("input:not(:disabled)")?.focus({ preventScroll: true });
    const down = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!ref.current?.contains(t) && !(t as Element).closest?.(".cell-add")) closeRef.current(false); // a cell button reopens itself
    };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") closeRef.current(true); };
    const away = (e: Event) => { if (!sheet && !ref.current?.contains(e.target as Node)) closeRef.current(false); }; // the cell moved: close (a phone sheet is not tied to the cell, and browser bars fire resize)
    document.addEventListener("pointerdown", down);
    document.addEventListener("keydown", key);
    addEventListener("scroll", away, { capture: true, passive: true });
    addEventListener("resize", away);
    return () => {
      document.removeEventListener("pointerdown", down);
      document.removeEventListener("keydown", key);
      removeEventListener("scroll", away, { capture: true });
      removeEventListener("resize", away);
    };
  }, [sheet]);

  const place = (() => {
    if (sheet) return {};
    const maxH = Math.min(448, innerHeight - 16);
    let left = rect.right + 8;
    if (left + WIDTH > innerWidth - 8) left = rect.left - 8 - WIDTH; // no room on the right: open to the left of the cell
    left = Math.max(8, Math.min(left, innerWidth - WIDTH - 8));
    const top = Math.max(8, Math.min(rect.top, innerHeight - maxH - 8));
    return { left, top, width: WIDTH, maxHeight: maxH, "--ox": `${rect.left + rect.width / 2 - left}px`, "--oy": `${Math.min(rect.top + rect.height / 2, rect.top + 40) - top}px` } as React.CSSProperties;
  })();

  const move = (e: React.KeyboardEvent<HTMLUListElement>) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const boxes = [...e.currentTarget.querySelectorAll<HTMLInputElement>("input:not(:disabled)")];
    const at = boxes.indexOf(document.activeElement as HTMLInputElement);
    boxes[(at + (e.key === "ArrowDown" ? 1 : -1) + boxes.length) % boxes.length]?.focus();
    e.preventDefault();
  };

  return (
    <>
      {sheet && <div aria-hidden className="cell-scrim" data-closing={closing || undefined} />}
      <div ref={ref} role="dialog" aria-label={`Add a chore: ${title}`} data-sheet={sheet || undefined} data-closing={closing || undefined} style={place}
        className="cell-pop fixed z-50 flex flex-col overflow-hidden border border-line bg-surface text-ink max-sm:inset-x-0 max-sm:bottom-0 max-sm:max-h-[75dvh] max-sm:rounded-t-3xl sm:rounded-3xl">
        <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-3">
          <p className="min-w-0">
            <span className="eyebrow block">Add a chore</span>
            <span className="block truncate font-semibold">{title}</span>
          </p>
          <button type="button" onClick={() => close(true)} aria-label="Close" className="cell-x grid size-10 shrink-0 place-items-center rounded-full text-muted"><Icon name="x" className="size-5" /></button>
        </div>
        {items.length === 0 ? <p className="p-6 text-center text-sm text-muted">The catalog has no chores yet.</p> : (
          <ul onKeyDown={move} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-2 max-sm:pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
            {items.map(({ deed, state, by }) => (
              <li key={deed.id}>
                <label data-state={state} className="cell-row flex min-h-12 items-center gap-3 rounded-2xl px-2 py-1.5">
                  <input type="checkbox" className="peer sr-only" checked={state !== "free"} disabled={state === "taken"}
                    onChange={() => state === "free" && onPick(deed)} />
                  <span className="cell-box grid size-5 shrink-0 place-items-center rounded-md border-2 border-line text-bg peer-checked:border-ink peer-checked:bg-ink peer-focus-visible:ring-4 peer-focus-visible:ring-accent">
                    <svg aria-hidden viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{deed.name}</span>
                    <span className="block truncate text-xs text-muted">{state === "taken" ? `${by} has this` : state === "here" ? "In this cell" : deed.area ?? "No group"}</span>
                  </span>
                  <Chip tone="muted">{deed.points} pts</Chip>
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
