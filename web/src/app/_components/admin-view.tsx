import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { award, createInvite, decideClaim, revokeInvite, saveDeed, setDeedActive } from "../actions";
import { CopyButton } from "./copy-button";
import { SubmitButton } from "./submit-button";
import { Avatar, Chip, Section, button, ghost, input } from "./ui";

type ClaimRow = { id: string; note: string | null; member: { display_name: string } | null; deed: { name: string; points: number } | null };

const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

export async function AdminView() {
  const supabase = await createClient();
  const [{ data: claims }, { data: deeds }, { data: housemates }, { data: invites }] = await Promise.all([
    supabase.from("claim")
      .select("id, note, member:member!claim_member_id_fkey(display_name), deed:deed_id(name, points)")
      .eq("status", "pending").order("created_at"),
    supabase.from("deed").select("id, name, points, active").order("kind").order("name"),
    supabase.from("member").select("user_id, display_name").eq("role", "housemate").order("display_name"),
    supabase.from("invite").select("code, expires_at").is("revoked_at", null).order("created_at"),
  ]);
  const h = await headers();
  const origin = h.get("origin") ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const active = deeds?.filter((d) => d.active) ?? [];
  const pending = (claims ?? []) as unknown as ClaimRow[];

  return (
    <div className="grid items-start gap-5 lg:grid-cols-2">
      <div className="space-y-5">
        <Section title={pending.length ? `Inbox · ${pending.length}` : "Inbox"}>
          <ul className="space-y-3">
            {pending.map((c) => (
              <li key={c.id} className="space-y-3 rounded-xl border border-line p-3.5">
                <div className="flex items-start gap-3">
                  <Avatar name={c.member?.display_name ?? "?"} className="size-9" />
                  <div className="min-w-0 flex-1">
                    <p className="break-words"><b>{c.member?.display_name}</b> did <b>{c.deed?.name}</b></p>
                    {c.note && <p className="break-words text-sm text-muted">&ldquo;{c.note}&rdquo;</p>}
                  </div>
                  <Chip tone="warn">{signed(c.deed?.points ?? 0)}</Chip>
                </div>
                <form action={decideClaim} className="grid grid-cols-2 gap-2">
                  <input type="hidden" name="claim" value={c.id} />
                  <SubmitButton name="accept" value="1" pendingText="Accepting…" className={button}>Accept</SubmitButton>
                  <SubmitButton name="accept" value="0" pendingText="Rejecting…" className={`${ghost} min-h-11`}>Reject</SubmitButton>
                </form>
              </li>
            ))}
            {!pending.length && <li className="rounded-xl border border-dashed border-line p-5 text-center text-sm text-muted">All caught up. New claims show up here.</li>}
          </ul>
        </Section>

        <Section title="Award or penalty">
          {housemates?.length ? (
            <form action={award} className="space-y-3">
              <select name="member" required className={input} aria-label="Housemate">
                {housemates.map((m) => <option key={m.user_id} value={m.user_id}>{m.display_name}</option>)}
              </select>
              <select name="deed" required className={input} aria-label="Deed">
                {active.map((d) => <option key={d.id} value={d.id}>{d.name} ({signed(d.points)})</option>)}
              </select>
              <SubmitButton className={`${button} w-full`} pendingText="Scoring…">Score it</SubmitButton>
            </form>
          ) : (
            <p className="text-sm text-muted">No housemates yet. Create an invite link first.</p>
          )}
        </Section>
      </div>

      <div className="space-y-5">
        <Section title="Catalog">
          <ul className="divide-y divide-line">
            {deeds?.map((d) => (
              <li key={d.id} className="flex items-center gap-3 py-2.5 first:pt-0">
                <span className={`min-w-0 flex-1 break-words ${d.active ? "" : "text-muted line-through"}`}>{d.name}</span>
                <Chip tone={d.points > 0 ? "warn" : "bad"}>{signed(d.points)}</Chip>
                <form action={setDeedActive}>
                  <input type="hidden" name="deed" value={d.id} />
                  <SubmitButton name="active" value={d.active ? "0" : "1"} pendingText="…" className={ghost}>{d.active ? "Hide" : "Show"}</SubmitButton>
                </form>
              </li>
            ))}
          </ul>
          <form action={saveDeed} className="space-y-2 border-t border-line pt-3">
            <div className="flex gap-2">
              <input name="name" placeholder="New deed" required aria-label="Deed name" className={input} />
              <input name="points" type="number" inputMode="numeric" placeholder="±pts" required aria-label="Points" className={`${input} w-24 shrink-0`} />
            </div>
            <p className="text-xs text-muted">Positive points can be claimed by housemates. Negative points are penalties only you can enter.</p>
            <SubmitButton className={`${button} w-full`} pendingText="Adding…">Add deed</SubmitButton>
          </form>
        </Section>

        <Section title="Invite links">
          <ul className="space-y-3">
            {invites?.map((i) => {
              const link = `${origin}/join/${i.code}`;
              return (
                <li key={i.code} className="space-y-2 rounded-xl border border-line p-3.5">
                  <p className="truncate rounded-lg bg-surface-2 px-3 py-2 text-sm" title={link}>{link}</p>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-muted">Expires {new Date(i.expires_at).toLocaleDateString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric" })}</p>
                    <div className="flex gap-2">
                      <CopyButton text={link} />
                      <form action={revokeInvite}>
                        <input type="hidden" name="code" value={i.code} />
                        <SubmitButton className={ghost} pendingText="…">Revoke</SubmitButton>
                      </form>
                    </div>
                  </div>
                </li>
              );
            })}
            {!invites?.length && <li className="text-sm text-muted">No active links.</li>}
          </ul>
          <form action={createInvite}><SubmitButton className={`${button} w-full`} pendingText="Creating…">New invite link</SubmitButton></form>
        </Section>
      </div>
    </div>
  );
}
