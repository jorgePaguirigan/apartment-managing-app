"use client";

import { useState } from "react";
import { SubmitButton } from "./submit-button";
import { danger, ghost } from "./ui";

// Same size as `danger`, in the ink colour of the main button. Used for the confirm step.
const calmButton = danger.replace("bg-bad", "bg-ink");

// The button that opens the confirm. Tinted outline at rest, solid fill with a lift and a soft shadow on hover (only where
// hover exists) and while pressed, so the two states are never mistaken for each other.
const trigger = "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-semibold transition-[transform,background-color,color,border-color,box-shadow] duration-200 ease-out active:scale-[0.96] disabled:pointer-events-none disabled:opacity-50";
const triggerDanger = `${trigger} border-bad/40 bg-bad/10 text-bad active:bg-bad active:text-bg [@media(hover:hover)]:hover:-translate-y-0.5 [@media(hover:hover)]:hover:border-bad [@media(hover:hover)]:hover:bg-bad [@media(hover:hover)]:hover:text-bg [@media(hover:hover)]:hover:shadow-lg [@media(hover:hover)]:hover:shadow-bad/35`;
const triggerCalm = `${trigger} border-ink/25 bg-ink/5 text-ink active:bg-ink active:text-bg [@media(hover:hover)]:hover:-translate-y-0.5 [@media(hover:hover)]:hover:border-ink [@media(hover:hover)]:hover:bg-ink [@media(hover:hover)]:hover:text-bg [@media(hover:hover)]:hover:shadow-lg [@media(hover:hover)]:hover:shadow-ink/30`;

// Button that asks once before it submits: red by default, `tone="calm"` for a non-destructive action. The confirm takes a full row inside a flex-wrap parent.
export function ConfirmButton({ label, pendingText, prompt, action, name, value, className = "", tone = "danger" }: {
  label: string; pendingText: string; prompt: string; action: (f: FormData) => Promise<void>; name: string; value: string; className?: string; tone?: "danger" | "calm";
}) {
  const [open, setOpen] = useState(false);
  const calm = tone === "calm";
  const look = calm ? calmButton : danger;
  if (!open) return <button type="button" onClick={() => setOpen(true)} className={`${calm ? triggerCalm : triggerDanger} ${className}`}>{label}</button>;
  return (
    <form action={action} className={`reveal flex basis-full items-center gap-2 rounded-2xl p-3 ${calm ? "bg-surface-2" : "bg-bad/10"}`}>
      <input type="hidden" name={name} value={value} />
      <p className={`flex-1 text-sm ${calm ? "text-ink" : "text-bad"}`}>{prompt}</p>
      <button type="button" onClick={() => setOpen(false)} className={ghost}>Cancel</button>
      <SubmitButton className={look} pendingText={pendingText}>{label}</SubmitButton>
    </form>
  );
}
