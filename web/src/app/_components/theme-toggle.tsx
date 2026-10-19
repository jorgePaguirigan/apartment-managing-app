"use client";

import { useEffect, useState } from "react";
import { Icon } from "./ui";

type Theme = "system" | "light" | "dark";
const OPTIONS: { key: Theme; label: string; icon: "monitor" | "sun" | "moon" }[] = [
  { key: "system", label: "Match system", icon: "monitor" },
  { key: "light", label: "Light", icon: "sun" },
  { key: "dark", label: "Dark", icon: "moon" },
];

// System follows prefers-color-scheme (no data-theme). Light or dark sets data-theme and is remembered.
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");
  useEffect(() => {
    // Read after mount so server and client markup match; the layout script already applied the theme.
    const id = requestAnimationFrame(() => {
      const t = document.documentElement.getAttribute("data-theme");
      if (t === "light" || t === "dark") setTheme(t);
    });
    return () => cancelAnimationFrame(id);
  }, []);

  function pick(t: Theme) {
    setTheme(t);
    const root = document.documentElement;
    root.classList.add("theming"); // cross-fade for 150ms
    if (t === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", t);
    try {
      if (t === "system") localStorage.removeItem("theme");
      else localStorage.setItem("theme", t);
    } catch {}
    setTimeout(() => root.classList.remove("theming"), 200);
  }

  return (
    <div role="group" aria-label="Theme" className="flex gap-0.5 rounded-full bg-surface-2 p-0.5">
      {OPTIONS.map((o) => (
        <button key={o.key} type="button" aria-label={o.label} title={o.label} aria-pressed={theme === o.key} onClick={() => pick(o.key)}
          className={`grid size-8 place-items-center rounded-full transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.92] ${theme === o.key ? "bg-ink text-bg" : "text-muted hover:text-ink"}`}>
          <Icon name={o.icon} className="size-4" />
        </button>
      ))}
    </div>
  );
}
