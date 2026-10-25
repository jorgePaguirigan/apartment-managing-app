"use client";

import { useRef, useState } from "react";
import { submitReport } from "../actions";
import { SubmitButton } from "./submit-button";
import { button, input } from "./ui";

type Penalty = { id: string; name: string; points: number };

// A housemate tells the admin about a penalty deed. "Something else…" opens a field for a demerit not in the catalog.
export function ReportForm({ housemates, penalties, meId }: { housemates: { user_id: string; display_name: string }[]; penalties: Penalty[]; meId: string }) {
  const ref = useRef<HTMLFormElement>(null);
  const [deed, setDeed] = useState("");
  const [sent, setSent] = useState(false);
  const other = deed === "other";
  async function action(formData: FormData) {
    setSent(false);
    await submitReport(formData);
    ref.current?.reset();
    setDeed("");
    setSent(true);
  }
  return (
    <form ref={ref} action={action} onChange={() => setSent(false)} className="space-y-3">
      <select name="subject" required defaultValue="" aria-label="Housemate to report" className={input}>
        <option value="" disabled>Who are you reporting?</option>
        {housemates.map((m) => <option key={m.user_id} value={m.user_id}>{m.display_name}{m.user_id === meId ? " (you)" : ""}</option>)}
      </select>
      <select name="deed" required value={deed} onChange={(e) => setDeed(e.target.value)} aria-label="Demerit" className={input}>
        <option value="" disabled>What did they do?</option>
        {penalties.map((d) => <option key={d.id} value={d.id}>{d.name} ({d.points})</option>)}
        <option value="other">Something else…</option>
      </select>
      <div className="fold" data-open={other} inert={!other}>
        <div className="-m-1 p-1">
          <input name="title" required={other} disabled={!other} maxLength={80} placeholder="Say what they did" aria-label="Demerit not in the list" className={input} />
        </div>
      </div>
      <label className="flex min-h-10 cursor-pointer items-center gap-2.5 text-sm">
        <input type="checkbox" name="anonymous" className="size-5 accent-[var(--ink)]" />
        <span>Don&apos;t tell them it was me</span>
      </label>
      <SubmitButton className={`${button} w-full`} pendingText="Sending…">Send report</SubmitButton>
      <p role="status" className="min-h-5 text-sm font-semibold text-ok">{sent ? "Sent to your admin for a decision." : ""}</p>
    </form>
  );
}
