"use client";

import { createContext, useContext, useOptimistic, type ReactNode } from "react";
import { acceptAll, decideClaim, decideReport } from "../actions";
import { SubmitButton } from "./submit-button";
import { Icon, Kbd, button } from "./ui";

const AllLeaving = createContext(false);

// The waiting claims. "Accept all" closes every claim it will accept the moment it is pressed, the way one Accept closes
// its own row, and says so when nothing is left. An optimistic value lasts only as long as the action, so if it fails the rows come back.
export function InboxList({ acceptable, total, children }: { acceptable: number; total: number; children: ReactNode }) {
  const [all, setAll] = useOptimistic(false);
  async function action() {
    setAll(true);
    await acceptAll();
  }
  return (
    <AllLeaving.Provider value={all}>
      {acceptable > 0 && (
        <form action={action}>
          <SubmitButton shortcut="accept-all" pendingText="Accepting…" className={`${button} w-full`}><Icon name="check" />Accept all ({acceptable})<Kbd>⌘A</Kbd></SubmitButton>
        </form>
      )}
      <ul className="space-y-3">
        {children}
        {(total === 0 || (all && acceptable === total)) && <li className="rounded-2xl border border-dashed border-line p-5 text-center text-sm text-muted">All caught up. New claims show up here.</li>}
      </ul>
    </AllLeaving.Provider>
  );
}

// One waiting claim (or report). Once Accept/Reject is sent the row fades and collapses while the server works,
// so the list closes up smoothly when the claim leaves it. If the action fails the row comes back.
// (useOptimistic, not useState: state set inside a form action only shows once the action has finished.)
// `acceptable` is a claim "Accept all" would take (a deed with fixed points).
export function InboxItem({ head, fields, report, acceptable = false }: { head: ReactNode; fields: ReactNode; report?: boolean; acceptable?: boolean }) {
  const [leaving, setLeaving] = useOptimistic(false);
  const allLeaving = useContext(AllLeaving) && acceptable;
  async function action(fd: FormData) {
    setLeaving(true);
    await (report ? decideReport : decideClaim)(fd);
  }
  return (
    <li className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none ${leaving || allLeaving ? "pointer-events-none grid-rows-[0fr] opacity-0" : "grid-rows-[1fr]"}`}>
      <div className="min-h-0 overflow-hidden">
        <div className="space-y-3 rounded-2xl border border-line bg-bg p-3.5 shadow-[var(--shadow)]">
          {head}
          <form action={action} className="grid grid-cols-2 gap-2">{fields}</form>
        </div>
      </div>
    </li>
  );
}
