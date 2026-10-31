"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Icon, type IconName } from "./ui";

type Item = { key: string; href: string; label: string; icon?: IconName };

// Segmented links with a thumb that slides from the previous tab to the new one. The thumb is
// animated with the Web Animations API (works in every current browser); the old position is
// remembered in sessionStorage because each route renders its own copy of the nav.
export function PillNav({ id, items, active, className, linkClass, activeClass, idleClass, thumbClass, idleLabelClass = "" }: {
  id: string; items: Item[]; active: string; className: string; linkClass: string; activeClass: string; idleClass: string; thumbClass: string; idleLabelClass?: string;
}) {
  const nav = useRef<HTMLDivElement>(null);
  const thumb = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = thumb.current;
    const box = nav.current;
    const link = el?.parentElement;
    if (!el || !box || !link) return;
    const w = link.offsetWidth;
    if (!w) return; // hidden at this screen size
    const left = link.getBoundingClientRect().left - box.getBoundingClientRect().left;
    try {
      const prev = JSON.parse(sessionStorage.getItem(`pill:${id}`) ?? "null") as { left: number; w: number } | null;
      if (prev && (Math.abs(prev.left - left) > 1 || Math.abs(prev.w - w) > 1) && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
        el.animate(
          [{ transform: `translateX(${prev.left - left}px) scaleX(${prev.w / w})` }, { transform: "none" }],
          { duration: 260, easing: "cubic-bezier(0.23, 1, 0.32, 1)" },
        );
      }
      sessionStorage.setItem(`pill:${id}`, JSON.stringify({ left, w }));
    } catch {}
  }, [id, active]);

  return (
    <div ref={nav} className={`relative ${className}`}>
      {items.map((t) => (
        <Link key={t.key} href={t.href} aria-current={t.key === active ? "page" : undefined}
          className={`relative isolate whitespace-nowrap ${linkClass} ${t.key === active ? activeClass : idleClass}`}>
          {t.key === active && <span ref={thumb} aria-hidden style={{ transformOrigin: "left" }} className={`absolute inset-0 -z-10 ${thumbClass}`} />}
          {t.icon && <Icon name={t.icon} />}
          <span className={t.key === active ? "" : idleLabelClass}>{t.label}</span>
        </Link>
      ))}
    </div>
  );
}
