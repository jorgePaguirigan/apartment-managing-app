"use client";

import { useFormStatus } from "react-dom";

// Disables itself while its form is submitting, so a double-tap cannot send twice.
export function SubmitButton({ children, className, pendingText = "Working…" }: { children: React.ReactNode; className?: string; pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={className}>
      {pending ? pendingText : children}
    </button>
  );
}
