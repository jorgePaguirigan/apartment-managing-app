"use client";

import { useFormStatus } from "react-dom";

// Disables its form while sending, so a double-tap cannot send twice. With name/value it labels only the button that was pressed.
export function SubmitButton({ children, className, pendingText = "Working…", name, value, shortcut }: { children: React.ReactNode; className?: string; pendingText?: string; name?: string; value?: string; shortcut?: string }) {
  const { pending, data } = useFormStatus();
  const mine = pending && (!name || data?.get(name) === value);
  return (
    <button type="submit" name={name} value={value} disabled={pending} aria-busy={mine} data-shortcut={shortcut} className={className}>
      {mine ? pendingText : children}
    </button>
  );
}
