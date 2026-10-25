import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { acceptAll, award, createInvite, deleteDeed, editDeed, removeHousemate, revokeInvite, saveDeed, setDeedActive } from "../actions";
import { InboxItem } from "./inbox-item";
import { CopyButton } from "./copy-button";
import { ConfirmButton } from "./confirm-button";
import { HistoryList, type HistoryRow } from "./history-list";
import { SubmitButton } from "./submit-button";
import { Shortcuts } from "./shortcuts";
import { Avatar, Chip, Icon, Kbd, Section, button, danger, ghost, input } from "./ui";

type ClaimRow = { id: string; note: string | null; title: string | null; member: { display_name: string } | null; deed: { name: string; points: number } | null };

type AwardRow = { id: string; points: number; title: string | null; created_at: string; member: { display_name: string } | null; deed: { name: string } | null };

// shortcut: History (and its modal) holds the latest 100 rows; page through older ones if a household outgrows that.
const HISTORY = 100;

const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

export async function AdminView() {
  const supabase = await createClient();
  const [{ data: claims }, { data: deeds }, { data: housemates }, { data: invites }, { data: decided }, { data: entries }, { data: household }, { data: awards }] = await Promise.all([
    supabase.from("claim")
      .select("id, note, title, member:member!claim_member_id_fkey(display_name), deed:deed_id(name, points)")
      .eq("status", "pending").order("created_at"),
    supabase.from("deed").select("id, name, points, active").is("deleted_at", null).order("kind").order("name"),
    supabase.from("member").select("user_id, display_name").eq("role", "housemate").order("display_name"),
    supabase.from("invite").select("code, expires_at").is("revoked_at", null).order("created_at"),
    supabase.from("claim")
      .select("id, note, title, status, decided_at, member:member!claim_member_id_fkey(display_name), deed:deed_id(name)")
      .neq("status", "pending").order("decided_at", { ascending: false }).limit(HISTORY),
    // Points actually scored, copied onto the entry when accepted.
    supabase.from("score_entry").select("id, claim_id, points").eq("source", "claim").is("deleted_at", null),
    supabase.from("household").select("timezone").single(),
    // Awards and penalties entered directly, with no claim behind them.
    supabase.from("score_entry")
      .select("id, points, title, created_at, member:member!score_entry_member_id_fkey(display_name), deed:deed_id(name)")
      .eq("source", "admin").is("deleted_at", null).order("created_at", { ascending: false }).limit(HISTORY),
  ]);
  const scored = new Map((entries ?? []).map((e) => [e.claim_id, e]));
  const fromClaims: HistoryRow[] = ((decided ?? []) as unknown as (Omit<ClaimRow, "deed"> & { status: "accepted" | "rejected"; decided_at: string; deed: { name: string } | null })[]).map((c) => ({
    id: c.id,
    title: c.deed?.name ?? c.title ?? "",
    at: c.decided_at,
    note: c.note,
    status: c.status,
    points: c.status === "accepted" ? scored.get(c.id)?.points ?? 0 : 0,
    who: c.member?.display_name,
    entryId: scored.get(c.id)?.id,
  }));
  const fromAwards: HistoryRow[] = ((awards ?? []) as unknown as AwardRow[]).map((e) => ({
    id: e.id,
    title: e.deed?.name ?? e.title ?? "",
    at: e.created_at,
    note: null,
    status: "awarded",
    points: e.points,
    who: e.member?.display_name,
    entryId: e.id,
  }));
  const history = [...fromClaims, ...fromAwards].sort((a, b) => b.at.localeCompare(a.at)).slice(0, HISTORY);
  const h = await headers();
  const origin = h.get("origin") ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const active = deeds?.filter((d) => d.active) ?? [];
  const pending = (claims ?? []) as unknown as ClaimRow[];
  const acceptable = pending.filter((c) => c.deed).length;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-2">
      <Shortcuts keys={{ a: "accept-all", r: "reject-first" }} />
      <div className="space-y-6">
        <Section title="Inbox" count={pending.length}>
          {acceptable > 0 && (
            <form action={acceptAll}>
              <SubmitButton shortcut="accept-all" pendingText="Accepting…" className={`${button} w-full`}><Icon name="check" />Accept all ({acceptable})<Kbd>⌘A</Kbd></SubmitButton>
            </form>
          )}
          <ul className="space-y-3">
            {pending.map((c, i) => (
              <InboxItem key={c.id}
                head={(
                  <div className="flex items-start gap-3">
                    <Avatar name={c.member?.display_name ?? "?"} className="size-9" />
                    <div className="min-w-0 flex-1">
                      <p className="break-words"><span className="font-semibold">{c.member?.display_name}</span> did <span className="font-semibold">{c.deed?.name ?? c.title}</span></p>
                      {c.note && <p className="break-words text-sm text-muted">&ldquo;{c.note}&rdquo;</p>}
                    </div>
                    {c.deed ? <Chip tone="points">{signed(c.deed.points)}</Chip> : <Chip tone="muted">Custom</Chip>}
                  </div>
                )}
                fields={(
                  <>
                    <input type="hidden" name="claim" value={c.id} />
                    {!c.deed && (
                      <input name="points" type="number" inputMode="numeric" min={1} step={1} placeholder="Points to give" aria-label="Points to give" className={`${input} col-span-2`} />
                    )}
                    <SubmitButton name="accept" value="1" pendingText="Accepting…" className={button}><Icon name="check" />Accept</SubmitButton>
                    <SubmitButton name="accept" value="0" shortcut={i === 0 ? "reject-first" : undefined} pendingText="Rejecting…" className={`${ghost} min-h-12 rounded-2xl`}><Icon name="x" />Reject{i === 0 && <Kbd>⌘R</Kbd>}</SubmitButton>
                  </>
                )} />
            ))}
            {!pending.length && <li className="rounded-2xl border border-dashed border-line p-5 text-center text-sm text-muted">All caught up. New claims show up here.</li>}
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
        <Section title="History">
          <HistoryList timeZone={household?.timezone ?? "Asia/Manila"} empty="Decided claims, awards and penalties show up here." rows={history} />
        </Section>

      </div>

      <div className="space-y-6">
        <Section title="Catalog">
          <ul className="divide-y divide-line">
            {deeds?.map((d) => (
              <li key={d.id} className="removable flex flex-wrap items-center gap-3 py-2.5 first:pt-0">
                <span className={`min-w-0 flex-1 break-words ${d.active ? "" : "text-muted line-through"}`}>{d.name}</span>
                <Chip tone={d.points > 0 ? "points" : "bad"}>{signed(d.points)}</Chip>
                {!d.active && (
                  <form action={setDeedActive}>
                    <input type="hidden" name="deed" value={d.id} />
                    <SubmitButton name="active" value="1" pendingText="…" className={ghost}>Show</SubmitButton>
                  </form>
                )}
                <ConfirmButton label="Delete" pendingText="Deleting…" action={deleteDeed} name="deed" value={d.id}
                  prompt={`Delete ${d.name}? It leaves the catalog. Points already scored for it stay.`} />
                <details className="basis-full">
                  <summary className="cursor-pointer text-xs text-muted">Edit</summary>
                  <form action={editDeed} className="mt-2 flex gap-2">
                    <input type="hidden" name="deed" value={d.id} />
                    <input name="name" defaultValue={d.name} required aria-label="Deed name" className={`${input} min-w-0 flex-1`} />
                    <input name="points" type="number" inputMode="numeric" defaultValue={d.points} required aria-label="Points" className={`${input} min-w-0 w-24! shrink-0`} />
                    <SubmitButton className={ghost} pendingText="…">Save</SubmitButton>
                  </form>
                </details>
              </li>
            ))}
          </ul>
          <form action={saveDeed} className="space-y-2 border-t border-line pt-3">
            <div className="flex gap-2">
              <input name="name" placeholder="New deed" required aria-label="Deed name" className={`${input} min-w-0 flex-1`} />
              <input name="points" type="number" inputMode="numeric" placeholder="±pts" required aria-label="Points" className={`${input} min-w-0 w-24! shrink-0`} />
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
                <li key={i.code} className="space-y-2 rounded-2xl border border-line bg-bg p-3.5">
                  <p className="truncate rounded-xl bg-surface-2 px-3 py-2 text-sm font-mono" title={link}>{link}</p>
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

        <Section title="Housemates" count={housemates?.length}>
          <ul className="divide-y divide-line">
            {housemates?.map((m) => (
              <li key={m.user_id} className="removable py-2.5 first:pt-0 last:pb-0">
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-center gap-3 [&::-webkit-details-marker]:hidden">
                    <Avatar name={m.display_name} className="size-9" />
                    <span className="min-w-0 flex-1 truncate font-semibold">{m.display_name}</span>
                    <span className={`${danger} group-open:hidden`}>Remove housemate</span>
                    <span className="hidden group-open:block"><span className={ghost}>Cancel</span></span>
                  </summary>
                  <form action={removeHousemate} className="reveal mt-2.5 flex items-center gap-3 rounded-2xl bg-bad/10 p-3">
                    <input type="hidden" name="member" value={m.user_id} />
                    <p className="flex-1 text-sm text-bad">Remove {m.display_name}? Their past points stay in History; their open chores go back to unassigned.</p>
                    <SubmitButton className={danger} pendingText="Removing…">Remove</SubmitButton>
                  </form>
                </details>
              </li>
            ))}
            {!housemates?.length && <li className="text-sm text-muted">No housemates yet. Share an invite link above.</li>}
          </ul>
        </Section>
      </div>
    </div>
  );
}
