"use client";

import { useEffect, useRef, useState } from "react";
import { Marshmallow } from "./marshmallow";

const W = 56; // px, figure width
const MAX = 5;
const SPEED = 36; // px per second

// One housemate wandering along the bottom edge. Position is a CSS transition, so no per-frame JS.
function Roamer({ name }: { name: string }) {
  const outer = useRef<HTMLDivElement>(null);
  const hop = useRef<HTMLDivElement>(null);
  const [walking, setWalking] = useState(false);
  const [dir, setDir] = useState(1);
  const [angry, setAngry] = useState(false);
  const taps = useRef<number[]>([]);
  const calm = useRef(0);
  const delay = -([...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 40) / 10; // desync the idle loops, same on server and client

  useEffect(() => {
    const el = outer.current;
    if (!el) return;
    let x = Math.random() * Math.max(0, innerWidth - W);
    el.style.transform = `translateX(${x}px)`;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return; // stand still
    let t = 0;
    const go = () => {
      if (document.hidden) { t = window.setTimeout(go, 1000); return; }
      const to = Math.random() * Math.max(0, innerWidth - W);
      const secs = Math.abs(to - x) / SPEED;
      setDir(to < x ? -1 : 1);
      setWalking(true);
      el.style.transition = `transform ${secs}s linear`;
      el.style.transform = `translateX(${to}px)`;
      x = to;
      t = window.setTimeout(() => { setWalking(false); t = window.setTimeout(go, 1500 + Math.random() * 3500); }, secs * 1000);
    };
    t = window.setTimeout(go, 500 + Math.random() * 2000);
    return () => { clearTimeout(t); clearTimeout(calm.current); };
  }, []);

  function tap() {
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
      hop.current?.animate(
        [
          { transform: "none" },
          { transform: "translateY(-28px) scale(0.94, 1.08)", offset: 0.4 },
          { transform: "scale(1.08, 0.92)", offset: 0.75 },
          { transform: "none" },
        ],
        { duration: 420, easing: "cubic-bezier(0.23, 1, 0.32, 1)" },
      );
    }
    const now = Date.now();
    taps.current = [...taps.current.filter((n) => now - n < 2000), now];
    if (taps.current.length >= 5) { // poked too much
      taps.current = [];
      setAngry(true);
      clearTimeout(calm.current);
      calm.current = window.setTimeout(() => setAngry(false), 4000);
    }
  }

  return (
    <div ref={outer} className="absolute bottom-0 left-0" style={{ width: W, "--d": `${delay}s` } as React.CSSProperties}>
      <div ref={hop} onPointerDown={tap} className="pointer-events-auto cursor-pointer select-none touch-manipulation">
        <div style={{ transform: `scaleX(${dir})` }}>
          <Marshmallow name={name} angry={angry} className={`block w-full ${walking ? "mm-walk" : "mm-breathe"}`} />
        </div>
      </div>
    </div>
  );
}

// Housemates only (the caller passes names). Sits above the phone dock; clicks pass through except on the figures.
export function Roamers({ names }: { names: string[] }) {
  const list = names.slice(0, MAX);
  if (!list.length) return null;
  return (
    <div aria-hidden data-roamers className="pointer-events-none fixed inset-x-0 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-10 h-32 overflow-x-clip md:bottom-0">
      {list.map((n, i) => <Roamer key={`${n}-${i}`} name={n} />)}
    </div>
  );
}
