"use client";

import { useState, type ReactNode } from "react";
import { decideClaim, decideReport } from "../actions";

// One waiting claim (or report). Once Accept/Reject is sent the row fades and collapses while the server works,
// so the list closes up smoothly when the claim leaves it. If the action fails the row comes back.
export function InboxItem({ head, fields, report }: { head: ReactNode; fields: ReactNode; report?: boolean }) {
  const [leaving, setLeaving] = useState(false);
  async function action(fd: FormData) {
    setLeaving(true);
    try {
      await (report ? decideReport : decideClaim)(fd);
    } finally {
      setLeaving(false);
    }
  }
  return (
    <li className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none ${leaving ? "pointer-events-none grid-rows-[0fr] opacity-0" : "grid-rows-[1fr]"}`}>
      <div className="min-h-0 overflow-hidden">
        <div className="space-y-3 rounded-2xl border border-line bg-bg p-3.5 shadow-[var(--shadow)]">
          {head}
          <form action={action} className="grid grid-cols-2 gap-2">{fields}</form>
        </div>
      </div>
    </li>
  );
}
