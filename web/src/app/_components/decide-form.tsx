"use client";

import Link from "next/link";
import { useState } from "react";
import { decideByLink } from "../actions";
import { Avatar, Icon, button, danger, ghost } from "./ui";
import { SubmitButton } from "./submit-button";

type Admin = { user_id: string; display_name: string };

// The buttons of the decision link. The link is shared by every admin, so the admin says who they are first;
// nothing can be sent until they do (a lone admin is picked for them).
export function DecideForm({ token, admins, custom, rejectFirst }: { token: string; admins: Admin[]; custom: boolean; rejectFirst: boolean }) {
  const [admin, setAdmin] = useState(admins.length === 1 ? admins[0].user_id : "");
  const none = !admin;
  return (
    <form action={decideByLink} className="space-y-5">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="admin" value={admin} />
      {admins.length !== 1 && (
        <fieldset className="space-y-2">
          <legend className="eyebrow mb-2">Who are you?</legend>
          <div role="radiogroup" className="flex flex-wrap gap-2">
            {admins.map((a) => (
              <label key={a.user_id} className="cursor-pointer">
                <input type="radio" name="who" value={a.user_id} checked={admin === a.user_id} onChange={() => setAdmin(a.user_id)} className="peer sr-only" />
                <span className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-full border border-line bg-transparent py-1.5 pl-1.5 pr-4 text-sm font-semibold text-ink transition-[transform,background-color,color,border-color] duration-150 ease-out [@media(hover:hover)]:hover:bg-surface-2 active:scale-[0.97] peer-checked:border-ink peer-checked:bg-ink peer-checked:text-bg peer-focus-visible:ring-4 peer-focus-visible:ring-accent/60 motion-reduce:transition-none">
                  <Avatar name={a.display_name} className="size-8" />
                  <span className="min-w-0 break-words">{a.display_name}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <div className="grid grid-cols-2 gap-3">
        {custom ? (
          <Link href="/" className={ghost}>Open the app</Link>
        ) : (
          <SubmitButton name="accept" value="1" pendingText="Accepting…" disabled={none} className={rejectFirst ? ghost : button}>
            <Icon name="check" />Accept
          </SubmitButton>
        )}
        <SubmitButton name="accept" value="0" pendingText="Rejecting…" disabled={none} className={rejectFirst ? danger : ghost}>
          <Icon name="x" />Reject
        </SubmitButton>
      </div>
    </form>
  );
}
