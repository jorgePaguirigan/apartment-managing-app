"use client";

import { useOptimistic, useState, useTransition } from "react";
import { setAlsoHousemate } from "../actions";
import { danger, ghost } from "./ui";

// "I live here too" for an admin. On is immediate. Off asks first, because it takes them off the leaderboard and the schedule.
export function HousemateToggle({ on }: { on: boolean }) {
  const [shown, setShown] = useOptimistic(on);
  const [asking, setAsking] = useState(false);
  const [, start] = useTransition();
  const save = (next: boolean) => start(async () => {
    setShown(next);
    const fd = new FormData();
    fd.set("on", next ? "1" : "0");
    await setAlsoHousemate(fd);
  });
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl border border-line bg-surface p-3 pl-4">
      <div className="min-w-0 flex-1">
        <p id="live-here" className="font-semibold">I live here too</p>
        <p className="text-xs text-muted">Count me as a housemate: points, chores and the leaderboard.</p>
      </div>
      <button type="button" role="switch" aria-checked={shown} aria-labelledby="live-here"
        onClick={() => (shown ? setAsking(true) : save(true))}
        className={`relative h-8 w-14 shrink-0 rounded-full transition-[background-color,transform] duration-200 ease-out active:scale-[0.96] [@media(hover:hover)]:hover:brightness-95 ${shown ? "bg-accent" : "bg-surface-2 ring-1 ring-inset ring-line"}`}>
        <span aria-hidden className={`absolute left-1 top-1 size-6 rounded-full shadow-sm transition-transform duration-200 ease-[var(--ease-out-strong)] motion-reduce:transition-none ${shown ? "translate-x-6 bg-[#16171b]" : "bg-muted"}`} />
      </button>
      {asking && (
        <div className="reveal flex basis-full flex-wrap items-center gap-2 rounded-2xl bg-surface-2 p-3">
          <p className="flex-1 text-sm">You leave the leaderboard and the schedule. Your past points stay in History.</p>
          <button type="button" onClick={() => setAsking(false)} className={ghost}>Cancel</button>
          <button type="button" onClick={() => { setAsking(false); save(false); }} className={danger}>Turn off</button>
        </div>
      )}
    </div>
  );
}
