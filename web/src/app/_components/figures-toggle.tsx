"use client";

import { useEffect, useState } from "react";
import { Marshmallow } from "./marshmallow";

// Shows or hides the marshmallow figures along the bottom. Off sets data-figures="off" on <html> and is remembered;
// the layout script applies it before first paint, the same way as the theme.
export function FiguresToggle() {
  const [on, setOn] = useState(true);
  useEffect(() => {
    const id = requestAnimationFrame(() => setOn(document.documentElement.dataset.figures !== "off"));
    return () => cancelAnimationFrame(id);
  }, []);

  function flip() {
    const next = !on;
    setOn(next);
    if (next) delete document.documentElement.dataset.figures;
    else document.documentElement.dataset.figures = "off";
    try {
      if (next) localStorage.removeItem("figures");
      else localStorage.setItem("figures", "off");
    } catch {}
  }

  return (
    <button type="button" onClick={flip} aria-pressed={on} aria-label={on ? "Hide the figures" : "Show the figures"} title={on ? "Hide the figures" : "Show the figures"}
      className="relative grid size-10 place-items-center rounded-full border border-line transition-[transform,background-color] duration-150 ease-out hover:bg-surface-2 active:scale-[0.92]">
      <span className={`block w-4 transition-[opacity,transform] duration-200 ease-out ${on ? "" : "scale-90 opacity-40"}`}>
        <Marshmallow name="" className="block w-full" />
      </span>
      <span aria-hidden className={`absolute h-0.5 w-6 origin-center -rotate-45 rounded-full bg-ink transition-[transform,opacity] duration-200 ease-out ${on ? "scale-x-0 opacity-0" : "scale-x-100 opacity-100"}`} />
    </button>
  );
}
