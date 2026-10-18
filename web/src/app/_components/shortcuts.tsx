"use client";

import { useEffect } from "react";

// ⌘ (or Ctrl) plus a key clicks, or focuses, the element marked data-shortcut="<name>".
// With no such element on screen the browser's own shortcut still works, and so it does while typing in a field.
export function Shortcuts({ keys }: { keys: Record<string, string> }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
      const key = e.key === "=" ? "+" : e.key.toLowerCase();
      if (e.shiftKey && key !== "+") return; // keeps ⌘⇧R (hard reload) for the browser
      const name = keys[key];
      if (!name || (e.target as HTMLElement).closest("input, textarea, select, [contenteditable]")) return;
      const el = document.querySelector<HTMLElement>(`[data-shortcut="${name}"]`);
      if (!el) return;
      e.preventDefault();
      if (el instanceof HTMLInputElement) {
        el.scrollIntoView({ block: "center", behavior: "smooth" });
        el.focus({ preventScroll: true });
      } else el.click();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [keys]);
  return null;
}
