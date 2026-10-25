"use client";

import { useLayoutEffect, useRef, useState, type RefObject } from "react";

// Local copy of server data that a move updates at once. While a save is in flight, server data that does not match
// it is ignored, so the old order never flashes back (which replayed the slide). Once the server agrees, it takes over.
export function useLocal<T>(server: T, sig: (v: T) => string) {
  const [local, setLocal] = useState(server);
  const [seen, setSeen] = useState(server);
  const [saving, setSaving] = useState<string | null>(null);
  if (server !== seen) {
    setSeen(server);
    if (saving === null || saving === sig(server)) { setSaving(null); setLocal(server); }
  }
  return [local, (next: T) => { setSaving(sig(next)); setLocal(next); }] as const;
}

// Elements matching `selector` that changed place slide from where they were (FLIP), so neighbours make room smoothly.
// `skip` is the key of what the user just carried by hand: it lands where it was dropped instead of sliding again.
export function useFlip(root: RefObject<HTMLElement | null>, selector: string, keyOf: (el: HTMLElement) => string, skip: string | null) {
  const last = useRef(new Map<string, number>());
  useLayoutEffect(() => {
    const box = root.current;
    if (!box) return;
    const base = box.getBoundingClientRect().top;
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const now = new Map<string, number>();
    box.querySelectorAll<HTMLElement>(selector).forEach((el) => {
      const key = keyOf(el);
      const top = el.getBoundingClientRect().top - base;
      const was = last.current.get(key);
      if (!still && key !== skip && was !== undefined && Math.abs(was - top) > 1)
        el.animate([{ transform: `translateY(${was - top}px)` }, { transform: "none" }], { duration: 320, easing: "cubic-bezier(0.23, 1, 0.32, 1)" });
      now.set(key, top);
    });
    last.current = now;
  });
}
