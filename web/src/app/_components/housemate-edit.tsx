"use client";

import { useState } from "react";
import { makeAdmin, removeHousemate } from "../actions";
import { ConfirmButton } from "./confirm-button";
import { ghost } from "./ui";

// The Edit dropdown on a Housemates card. It opens under the row and holds the actions that change a housemate.
export function HousemateEdit({ id, name }: { id: string; name: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className={ghost}>{open ? "Close" : "Edit"}</button>
      {open && (
        <div className="reveal flex basis-full flex-wrap items-center gap-2">
          <ConfirmButton tone="calm" label="Make admin" pendingText="Promoting…" action={makeAdmin} name="member" value={id}
            prompt={`Make ${name} an admin? They can then score everyone else's claims and keep their own points and chores.`} />
          <ConfirmButton label="Remove" pendingText="Removing…" action={removeHousemate} name="member" value={id}
            prompt={`Remove ${name}? Their past points stay in History; their open chores go back to unassigned.`} />
        </div>
      )}
    </>
  );
}
