"use client";

import { useState } from "react";
import { SubmitButton } from "./submit-button";
import { Icon, danger, ghost } from "./ui";

// Same size as `danger`, in the ink colour of the main button. Used for the confirm step.
const calmButton = danger.replace("bg-bad", "bg-ink");

// The button that opens the confirm: the `.wipe` pill from globals.css, with an icon that turns as the fill sweeps in.
const trigger = "wipe inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50";

// Button that asks once before it submits: red by default, `tone="calm"` for a non-destructive action. The confirm takes a full row inside a flex-wrap parent.
export function ConfirmButton({ label, pendingText, prompt, action, name, value, className = "", tone = "danger" }: {
  label: string; pendingText: string; prompt: string; action: (f: FormData) => Promise<void>; name: string; value: string; className?: string; tone?: "danger" | "calm";
}) {
  const [open, setOpen] = useState(false);
  const calm = tone === "calm";
  const look = calm ? calmButton : danger;
  if (!open) return <button type="button" onClick={() => setOpen(true)} className={`${trigger} ${calm ? "wipe-calm" : "wipe-danger"} ${className}`}>
    <Icon name={calm ? "star" : "x"} className="wipe-icon size-4" />{label}
  </button>;
  return (
    <form action={action} className={`reveal flex basis-full items-center gap-2 rounded-2xl p-3 ${calm ? "bg-surface-2" : "bg-bad/10"}`}>
      <input type="hidden" name={name} value={value} />
      <p className={`flex-1 text-sm ${calm ? "text-ink" : "text-bad"}`}>{prompt}</p>
      <button type="button" onClick={() => setOpen(false)} className={ghost}>Cancel</button>
      <SubmitButton className={look} pendingText={pendingText}>{label}</SubmitButton>
    </form>
  );
}
