"use client";

import { useState } from "react";
import { saveSchedule } from "../actions";
import { SubmitButton } from "./submit-button";
import { Icon, button, ghost, input } from "./ui";

export type Schedule = { instant: boolean; send_times: string[]; quiet_from: string | null; quiet_until: string | null };

const MAX_TIMES = 6;
const hhmm = (t: string) => t.slice(0, 5);
const list = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

// One plain sentence for what the form currently says, so nobody has to work the rules out.
function summary(mode: "instant" | "times", times: string[], quiet: boolean, from: string, until: string) {
  const set = [...new Set(times.filter(Boolean))].sort();
  if (mode === "times") return set.length ? `Emails go out at ${list(set)}.` : "Add a time, or emails go out right away.";
  if (!quiet) return "Emails go out right away.";
  const wait = set.length ? `go out at ${list(set)}, or when it ends, whichever is first` : "wait until it ends";
  return `Emails go out right away, except from ${from} to ${until}: those ${wait}.`;
}

// When housemates get the claim emails. The admin's own approval emails always arrive at once.
export function ScheduleCard({ schedule, timeZone }: { schedule: Schedule | null; timeZone: string }) {
  const [mode, setMode] = useState<"instant" | "times">(schedule && !schedule.instant ? "times" : "instant");
  const [times, setTimes] = useState<string[]>(schedule?.send_times.map(hhmm) ?? []);
  const [quiet, setQuiet] = useState(!!schedule?.quiet_from);
  const [from, setFrom] = useState(schedule?.quiet_from ? hhmm(schedule.quiet_from) : "19:00");
  const [until, setUntil] = useState(schedule?.quiet_until ? hhmm(schedule.quiet_until) : "07:00");
  const showTimes = mode === "times" || quiet;
  const showQuiet = mode === "instant" && quiet;
  const pick = (m: "instant" | "times") => { setMode(m); if (m === "times" && !times.length) setTimes(["21:00"]); };

  return (
    <form action={saveSchedule} className="flex flex-col">
      <p className="mb-4 text-sm text-muted">When housemates get the claim emails. Your own approval emails always arrive at once.</p>

      <div role="radiogroup" aria-label="When to send" className="mb-4 grid grid-cols-2 gap-2 rounded-full border border-line bg-bg p-1">
        {([["instant", "Right away"], ["times", "At set times"]] as const).map(([value, label]) => (
          <label key={value} className="cursor-pointer">
            <input type="radio" name="mode" value={value} checked={mode === value} onChange={() => pick(value)} className="peer sr-only" />
            <span className="grid min-h-10 place-items-center rounded-full px-3 text-sm font-semibold text-muted transition-[transform,background-color,color] duration-150 ease-out peer-checked:bg-ink peer-checked:text-bg peer-focus-visible:ring-4 peer-focus-visible:ring-accent/60 active:scale-[0.97] motion-reduce:transition-none">{label}</span>
          </label>
        ))}
      </div>

      <div className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none ${mode === "instant" ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`} aria-hidden={mode !== "instant"}>
        <div className="overflow-hidden pb-4">
          <label className="flex min-h-10 cursor-pointer items-center gap-3 py-1 text-sm font-semibold">
            <input type="checkbox" name="quiet" checked={quiet} onChange={(e) => setQuiet(e.target.checked)} tabIndex={mode === "instant" ? 0 : -1} className="size-5 accent-[var(--ink)]" />
            Quiet hours
          </label>
          <div className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none ${showQuiet ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
            <div className="overflow-hidden">
              <div className="flex flex-wrap items-center gap-3 py-2">
                <label className="flex items-center gap-2 text-sm text-muted">From
                  <input type="time" name="quiet_from" value={from} onChange={(e) => setFrom(e.target.value)} required={showQuiet} disabled={!showQuiet} className={`${input} w-auto`} /></label>
                <label className="flex items-center gap-2 text-sm text-muted">Until
                  <input type="time" name="quiet_until" value={until} onChange={(e) => setUntil(e.target.value)} required={showQuiet} disabled={!showQuiet} className={`${input} w-auto`} /></label>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none ${showTimes ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`} aria-hidden={!showTimes}>
        <div className="overflow-hidden pb-4">
          <fieldset className="space-y-2" disabled={!showTimes}>
            <legend className="text-sm font-semibold">{mode === "times" ? "Send at" : "During quiet hours, send at"}</legend>
            <ul className="flex flex-wrap items-center gap-2">
              {times.map((t, i) => (
                <li key={i} className="flex items-center gap-1">
                  <input type="time" name="time" value={t} required aria-label={`Send time ${i + 1}`} onChange={(e) => setTimes(times.map((x, j) => (j === i ? e.target.value : x)))} className={`${input} w-auto`} />
                  <button type="button" aria-label={`Remove send time ${i + 1}`} onClick={() => setTimes(times.filter((_, j) => j !== i))} className={`${ghost} !min-h-10 !px-2.5`}><Icon name="x" className="size-4" /></button>
                </li>
              ))}
              {times.length < MAX_TIMES && (
                <li><button type="button" onClick={() => setTimes([...times, "12:00"])} className={ghost}><Icon name="plus" className="size-4" />Add a time</button></li>
              )}
            </ul>
          </fieldset>
        </div>
      </div>

      <p className="mb-3 rounded-2xl bg-surface-2 px-3.5 py-2.5 text-sm" aria-live="polite">{summary(mode, times, showQuiet, from, until)}</p>
      <p className="mb-4 text-xs text-muted">Times are in {timeZone}.</p>
      <SubmitButton className={`${button} w-full sm:w-auto`} pendingText="Saving…">Save schedule</SubmitButton>
    </form>
  );
}
