"use client";

import { useOptimistic, useState, useTransition } from "react";
import { setAlsoHousemate } from "../actions";
import { Icon, danger, ghost } from "./ui";

// "I live here too" for an admin: one button. Joining is immediate; stopping asks first, because it takes them off the
// leaderboard and the schedule. Both use the .wipe fill from globals.css.
export function HousemateToggle({ on }: { on: boolean }) {
  const [shown, setShown] = useOptimistic(on);
  const [asking, setAsking] = useState(false);
  const [pending, start] = useTransition();
  const save = (next: boolean) => start(async () => {
    setShown(next);
    const fd = new FormData();
    fd.set("on", next ? "1" : "0");
    await setAlsoHousemate(fd);
  });
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <button type="button" aria-busy={pending} onClick={() => (shown ? setAsking(true) : save(true))}
        className={`wipe ${shown ? "wipe-danger" : "wipe-calm"} inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold`}>
        <Icon name={shown ? "x" : "plus"} className="wipe-icon size-4" />{shown ? "Stop being a housemate" : "I live here too"}
      </button>
      {asking && (
        <div className="reveal flex basis-full flex-wrap items-center gap-2 rounded-2xl bg-surface-2 p-3">
          <p className="min-w-40 flex-1 text-sm">You leave the leaderboard and the schedule. Your past points stay in History.</p>
          <button type="button" onClick={() => setAsking(false)} className={ghost}>Cancel</button>
          <button type="button" onClick={() => { setAsking(false); save(false); }} className={danger}>Turn off</button>
        </div>
      )}
    </div>
  );
}
