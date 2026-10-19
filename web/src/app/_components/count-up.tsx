"use client";

import { useEffect, useState } from "react";

// Counts from 0 to the value once on load. Reduced motion shows the final number straight away.
export function CountUp({ value }: { value: number }) {
  const [n, setN] = useState(value);
  useEffect(() => {
    if (!value || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const start = performance.now();
    let id = requestAnimationFrame(function tick(now) {
      const t = Math.min((now - start) / 600, 1);
      setN(Math.round(value * (1 - (1 - t) ** 3)));
      if (t < 1) id = requestAnimationFrame(tick);
    });
    setN(0);
    return () => cancelAnimationFrame(id);
  }, [value]);
  return <>{n}</>;
}
