"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { submitClaim, submitCustomClaim } from "../actions";
import { SubmitButton } from "./submit-button";
import { Icon, button, input } from "./ui";

type Deed = { id: string; name: string; points: number };

function DeedButton({ deed }: { deed: Deed }) {
  const { pending, data } = useFormStatus();
  const mine = pending && data?.get("deed") === deed.id;
  return (
    <button type="submit" name="deed" value={deed.id} disabled={pending} aria-busy={mine}
      className="flex min-h-28 flex-col justify-between rounded-2xl border border-line bg-bg p-4 text-left transition-[transform,background-color,border-color] duration-150 ease-out hover:border-ink active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50">
      <span className="font-semibold leading-snug">{mine ? "Sending…" : deed.name}</span>
      <span className="display inline-flex w-fit items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-sm font-bold text-[#16171b]">
        <Icon name="plus" className="size-3.5" />{deed.points}
      </span>
    </button>
  );
}

// One tap sends a claim to the admin. The optional note goes with the next tap.
export function ClaimForm({ deeds }: { deeds: Deed[] }) {
  const ref = useRef<HTMLFormElement>(null);
  const customRef = useRef<HTMLFormElement>(null);
  const [sent, setSent] = useState(false);
  async function action(formData: FormData) {
    setSent(false);
    await submitClaim(formData);
    ref.current?.reset();
    setSent(true);
  }
  async function customAction(formData: FormData) {
    setSent(false);
    await submitCustomClaim(formData);
    customRef.current?.reset();
    setSent(true);
  }
  return (
    <div className="space-y-3">
    <form ref={ref} action={action} className="space-y-3">
      <input name="note" placeholder="Add a note (optional)" aria-label="Note for your admin" className={input} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {deeds.map((d) => <DeedButton key={d.id} deed={d} />)}
      </div>
    </form>
    <form ref={customRef} action={customAction} className="space-y-2 border-t border-line pt-3">
      <label className="block space-y-1.5 text-sm font-semibold">
        Something else? Say what you did
        <span className="flex gap-2">
          <input name="title" required maxLength={80} placeholder="e.g. Fixed the shelf" className={`${input} font-normal`} />
          <SubmitButton className={`${button} shrink-0`} pendingText="Sending…">Send</SubmitButton>
        </span>
      </label>
      <p className="text-xs text-muted">Your admin picks the points when approving.</p>
    </form>
    <p role="status" className="min-h-5 text-sm font-semibold text-ok">{sent ? "Sent to your admin for approval." : ""}</p>
    </div>
  );
}
