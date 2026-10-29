"use client";

import { useState } from "react";
import { SubmitButton } from "./submit-button";
import { button, danger, ghost } from "./ui";

// Button that asks once before it submits: red by default, `tone="calm"` for a non-destructive action. The confirm takes a full row inside a flex-wrap parent.
export function ConfirmButton({ label, pendingText, prompt, action, name, value, className = "", tone = "danger" }: {
  label: string; pendingText: string; prompt: string; action: (f: FormData) => Promise<void>; name: string; value: string; className?: string; tone?: "danger" | "calm";
}) {
  const [open, setOpen] = useState(false);
  const calm = tone === "calm";
  const look = calm ? `${button} min-h-10 px-3.5 py-2 text-sm` : danger;
  if (!open) return <button type="button" onClick={() => setOpen(true)} className={`${look} ${className}`}>{label}</button>;
  return (
    <form action={action} className={`reveal flex basis-full items-center gap-2 rounded-2xl p-3 ${calm ? "bg-surface-2" : "bg-bad/10"}`}>
      <input type="hidden" name={name} value={value} />
      <p className={`flex-1 text-sm ${calm ? "text-ink" : "text-bad"}`}>{prompt}</p>
      <button type="button" onClick={() => setOpen(false)} className={ghost}>Cancel</button>
      <SubmitButton className={look} pendingText={pendingText}>{label}</SubmitButton>
    </form>
  );
}
