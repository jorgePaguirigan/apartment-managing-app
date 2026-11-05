"use client";

import { useRef, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Icon, ghost } from "./ui";

const noop = () => () => {};

// Button that opens the full list in a scrollable modal. Native <dialog>: focus trap, Esc and top layer come free.
// Portaled to <body>: a dialog inherits CSS variables from its DOM parents, and the leader's card (.on-accent) resets the theme to dark ink.
export function SeeMore({ title, total, children }: { title: string; total: number; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const mounted = useSyncExternalStore(noop, () => true, () => false); // no document while rendering on the server
  return (
    <>
      <button type="button" onClick={() => dialog.current?.showModal()} className={`${ghost} w-full`}>See more ({total})</button>
      {mounted && createPortal(<dialog ref={dialog} aria-label={title} onClick={(e) => e.target === dialog.current && dialog.current.close()}
        className="modal m-auto max-h-[min(80dvh,44rem)] w-[min(36rem,calc(100%-2rem))] flex-col rounded-[1.75rem] border border-line bg-surface p-0 text-ink shadow-[var(--shadow)] open:flex">
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
          <h2 className="eyebrow">{title}</h2>
          <button type="button" aria-label="Close" onClick={() => dialog.current?.close()}
            className="grid size-10 place-items-center rounded-full text-muted transition-[transform,color,background-color] duration-150 ease-out hover:bg-surface-2 hover:text-ink active:scale-[0.94]">
            <Icon name="x" />
          </button>
        </div>
        <div className="overflow-y-auto overscroll-contain px-5 py-4">{children}</div>
      </dialog>, document.body)}
    </>
  );
}
