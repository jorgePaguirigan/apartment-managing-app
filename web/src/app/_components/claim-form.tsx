"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { submitClaim } from "../actions";
import { input } from "./ui";

type Deed = { id: string; name: string; points: number };

function DeedButton({ deed }: { deed: Deed }) {
  const { pending, data } = useFormStatus();
  const mine = pending && data?.get("deed") === deed.id;
  return (
    <button type="submit" name="deed" value={deed.id} disabled={pending} aria-busy={mine}
      className="flex min-h-24 flex-col justify-between rounded-2xl border border-line bg-surface p-4 text-left shadow-sm transition-[transform,background-color] duration-150 ease-out hover:bg-surface-2 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-60">
      <span className="font-medium leading-snug">{mine ? "Sending…" : deed.name}</span>
      <span className="text-lg font-semibold tabular-nums text-accent">+{deed.points}</span>
    </button>
  );
}

// One tap sends a claim to the admin. The optional note goes with the next tap.
export function ClaimForm({ deeds }: { deeds: Deed[] }) {
  const ref = useRef<HTMLFormElement>(null);
  const [sent, setSent] = useState(false);
  async function action(formData: FormData) {
    setSent(false);
    await submitClaim(formData);
    ref.current?.reset();
    setSent(true);
  }
  return (
    <form ref={ref} action={action} className="space-y-3">
      <input name="note" placeholder="Add a note (optional)" aria-label="Note for your admin" className={input} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {deeds.map((d) => <DeedButton key={d.id} deed={d} />)}
      </div>
      <p role="status" className="min-h-5 text-sm text-ok">{sent ? "Sent to your admin for approval." : ""}</p>
    </form>
  );
}
