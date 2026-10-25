"use client";

import { useState } from "react";
import { SubmitButton } from "./submit-button";
import { danger, ghost } from "./ui";

// Red button that asks once before it submits. The confirm takes a full row inside a flex-wrap parent.
export function ConfirmButton({ label, pendingText, prompt, action, name, value, className = "" }: {
  label: string; pendingText: string; prompt: string; action: (f: FormData) => Promise<void>; name: string; value: string; className?: string;
}) {
  const [open, setOpen] = useState(false);
  if (!open) return <button type="button" onClick={() => setOpen(true)} className={`${danger} ${className}`}>{label}</button>;
  return (
    <form action={action} className="reveal flex basis-full items-center gap-2 rounded-2xl bg-bad/10 p-3">
      <input type="hidden" name={name} value={value} />
      <p className="flex-1 text-sm text-bad">{prompt}</p>
      <button type="button" onClick={() => setOpen(false)} className={ghost}>Cancel</button>
      <SubmitButton className={danger} pendingText={pendingText}>{label}</SubmitButton>
    </form>
  );
}
