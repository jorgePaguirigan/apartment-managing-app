import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getTimeZone } from "@/lib/me";
import { award } from "../actions";
import { InboxItem, InboxList } from "./inbox-item";
import { AdminHistory, EmailSchedule, InviteLinks } from "./admin-sections";
import { Catalog, type Deed } from "./catalog";
import { HousemateEdit } from "./housemate-edit";
import { SubmitButton } from "./submit-button";
import { Shortcuts } from "./shortcuts";
import { Avatar, Chip, Icon, Kbd, Section, Skeleton, button, ghost, input } from "./ui";

type ClaimRow = { id: string; created_at: string; note: string | null; title: string | null; member: { display_name: string } | null; deed: { name: string; points: number } | null; contributors?: { member: { display_name: string } | null }[] };

type ReportRow = { id: string; title: string | null; anonymous: boolean; reporter: { display_name: string } | null; subject: { display_name: string } | null; deed: { name: string; points: number } | null };

const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

export async function AdminView() {
  const supabase = await createClient();
  const [{ data: claims }, { data: deeds }, { data: housemates }, { data: groups }, { data: reports }, timeZone] = await Promise.all([
    supabase.from("claim")
      .select("id, created_at, note, title, member:member!claim_member_id_fkey(display_name), deed:deed_id(name, points), contributors:claim_contributor(member:member!claim_contributor_member_id_fkey(display_name))")
      .eq("status", "pending").order("created_at"),
    supabase.from("deed").select("id, name, points, active, group_id").is("deleted_at", null).order("kind").order("name"),
    supabase.from("member").select("user_id, display_name, role").eq("scored", true).order("display_name"),
    supabase.from("deed_group").select("id, name").order("position").order("created_at"),
    supabase.from("report")
      .select("id, title, anonymous, reporter:member!report_reporter_id_fkey(display_name), subject:member!report_subject_id_fkey(display_name), deed:deed_id(name, points)")
      .eq("status", "pending").order("created_at"),
    getTimeZone(),
  ]);
  const when = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  const active = deeds?.filter((d) => d.active) ?? [];
  const pending = (claims ?? []) as unknown as ClaimRow[];
  const acceptable = pending.filter((c) => c.deed).length;

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
      <Shortcuts keys={{ a: "accept-all", r: "reject-first" }} />
      <div className="space-y-6">
        <Section title="Inbox" count={pending.length}>
          <InboxList acceptable={acceptable} total={pending.length}>
            {pending.map((c, i) => (
              <InboxItem key={c.id} acceptable={!!c.deed}
                head={(
                  <div className="flex items-start gap-3">
                    <Avatar name={c.member?.display_name ?? "?"} className="size-9" />
                    <div className="min-w-0 flex-1">
                      <p className="break-words"><span className="font-semibold">{c.member?.display_name}</span> <span className="font-semibold">{c.deed?.name ?? (c.title ?? "").replace(/^./, (ch: string) => ch.toLowerCase())}</span></p>
                      {!!c.contributors?.length && <p className="break-words text-sm text-muted">With {c.contributors.map((x) => x.member?.display_name).join(", ")}</p>}
                      {c.note && <p className="break-words text-sm text-muted">&ldquo;{c.note}&rdquo;</p>}
                      <time dateTime={c.created_at} className="block text-xs text-muted">Submitted {when.format(new Date(c.created_at))}</time>
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
          </InboxList>
        </Section>

        {!!reports?.length && (
          <Section title="Reports" count={reports.length}>
            <ul className="space-y-3">
              {(reports as unknown as ReportRow[]).map((r) => (
                <InboxItem key={r.id} report
                  head={(
                    <div className="flex items-start gap-3">
                      <Avatar name={r.subject?.display_name ?? "?"} className="size-9" />
                      <div className="min-w-0 flex-1">
                        <p className="break-words"><span className="font-semibold">{r.subject?.display_name}</span> was reported for <span className="font-semibold">{r.deed?.name ?? r.title}</span></p>
                        <p className="text-sm text-muted">By {r.reporter?.display_name}{r.anonymous ? " · hidden from them" : ""}</p>
                      </div>
                      {r.deed ? <Chip tone="bad">{signed(r.deed.points)}</Chip> : <Chip tone="muted">Typed</Chip>}
                    </div>
                  )}
                  fields={(
                    <>
                      <input type="hidden" name="report" value={r.id} />
                      {!r.deed && (
                        <input name="points" type="number" inputMode="numeric" min={1} step={1} placeholder="Points to take off" aria-label="Points to take off" className={`${input} col-span-2`} />
                      )}
                      <SubmitButton name="accept" value="1" pendingText="Scoring…" className={button}><Icon name="check" />Score it</SubmitButton>
                      <SubmitButton name="accept" value="0" pendingText="Dismissing…" className={`${ghost} min-h-12 rounded-2xl`}><Icon name="x" />Dismiss</SubmitButton>
                    </>
                  )} />
              ))}
            </ul>
          </Section>
        )}

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
        <Section title="Housemates" count={housemates?.length}>
          <ul className="divide-y divide-line">
            {housemates?.map((m) => (
              <li key={m.user_id} className="removable -mx-2 flex flex-wrap items-center gap-3 rounded-xl px-2 py-2.5 first:pt-0 last:pb-0 [@media(hover:hover)]:hover:bg-surface-2/60">
                <Avatar name={m.display_name} className="size-9" />
                <span className="min-w-0 flex-1 truncate font-semibold">{m.display_name}</span>
                {m.role === "admin" ? <Chip>Admin</Chip> : <HousemateEdit id={m.user_id} name={m.display_name} />}
              </li>
            ))}
            {!housemates?.length && <li className="text-sm text-muted">No housemates yet. Share an invite link above.</li>}
          </ul>
        </Section>
        <Suspense fallback={<Section title="History"><Skeleton /></Section>}><AdminHistory /></Suspense>
        <Suspense fallback={<Section title="Invite links"><Skeleton rows={2} /></Section>}><InviteLinks /></Suspense>
      </div>

      <div className="space-y-6">
        <Section title="Catalog">
          <Catalog groups={groups ?? []} deeds={(deeds ?? []) as Deed[]} />
        </Section>
      </div>

      <div className="lg:col-span-2">
        <Section title="Email schedule"><Suspense fallback={<Skeleton rows={2} />}><EmailSchedule /></Suspense></Section>
      </div>
    </div>
  );
}
