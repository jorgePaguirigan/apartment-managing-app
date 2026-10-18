import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { award, createInvite, decideClaim, revokeInvite, saveDeed, setDeedActive } from "../actions";
import { Section, button, ghost, input } from "./ui";

type ClaimRow = { id: string; note: string | null; member: { display_name: string } | null; deed: { name: string; points: number } | null };

export async function AdminView() {
  const supabase = await createClient();
  const [{ data: claims }, { data: deeds }, { data: housemates }, { data: invites }] = await Promise.all([
    supabase.from("claim")
      .select("id, note, member:member!claim_member_id_fkey(display_name), deed:deed_id(name, points)")
      .eq("status", "pending").order("created_at"),
    supabase.from("deed").select("id, name, points, active").order("kind").order("name"),
    supabase.from("member").select("user_id, display_name").eq("role", "housemate").order("display_name"),
    supabase.from("invite").select("code").is("revoked_at", null).order("created_at"),
  ]);
  const h = await headers();
  const origin = h.get("origin") ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const active = deeds?.filter((d) => d.active) ?? [];

  return (
    <>
      <Section title={`Inbox (${claims?.length ?? 0})`}>
        <ul className="space-y-2">
          {((claims ?? []) as unknown as ClaimRow[]).map((c) => (
            <li key={c.id} className="space-y-2 rounded-lg border border-zinc-200 p-3">
              <p>{c.member?.display_name} did <b>{c.deed?.name}</b> (+{c.deed?.points}){c.note ? ` · ${c.note}` : ""}</p>
              <form action={decideClaim} className="flex gap-2">
                <input type="hidden" name="claim" value={c.id} />
                <button name="accept" value="1" className={button}>Accept</button>
                <button name="accept" value="0" className={ghost}>Reject</button>
              </form>
            </li>
          ))}
          {!claims?.length && <li className="text-sm text-zinc-600">Nothing waiting.</li>}
        </ul>
      </Section>

      <Section title="Award or penalty">
        <form action={award} className="space-y-2">
          <select name="member" required className={input} aria-label="Housemate">
            {housemates?.map((m) => <option key={m.user_id} value={m.user_id}>{m.display_name}</option>)}
          </select>
          <select name="deed" required className={input} aria-label="Deed">
            {active.map((d) => <option key={d.id} value={d.id}>{d.name} ({d.points > 0 ? "+" : ""}{d.points})</option>)}
          </select>
          <button className={button}>Score it</button>
        </form>
      </Section>

      <Section title="Catalog">
        <ul className="space-y-1 text-sm">
          {deeds?.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-2">
              <span className={d.active ? "" : "text-zinc-400 line-through"}>{d.name} ({d.points > 0 ? "+" : ""}{d.points})</span>
              <form action={setDeedActive}>
                <input type="hidden" name="deed" value={d.id} />
                <button name="active" value={d.active ? "0" : "1"} className={ghost}>{d.active ? "Hide" : "Show"}</button>
              </form>
            </li>
          ))}
        </ul>
        <form action={saveDeed} className="flex gap-2">
          <input name="name" placeholder="New deed" required className={input} />
          <input name="points" type="number" placeholder="±pts" required aria-label="Points" className={`${input} w-24`} />
          <button className={button}>Add</button>
        </form>
      </Section>

      <Section title="Invite links">
        <ul className="space-y-1 break-all text-sm">
          {invites?.map((i) => (
            <li key={i.code} className="space-y-1">
              <p>{origin}/join/{i.code}</p>
              <form action={revokeInvite}>
                <input type="hidden" name="code" value={i.code} />
                <button className={ghost}>Revoke</button>
              </form>
            </li>
          ))}
        </ul>
        <form action={createInvite}><button className={button}>New invite link</button></form>
      </Section>
    </>
  );
}
