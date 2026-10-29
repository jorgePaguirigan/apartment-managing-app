import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { acceptAll, award, createInvite, revokeInvite } from "../actions";
import { InboxItem } from "./inbox-item";
import { CopyButton } from "./copy-button";
import { Catalog, type Deed } from "./catalog";
import { HousemateEdit } from "./housemate-edit";
import { HistoryList, type HistoryRow } from "./history-list";
import { SubmitButton } from "./submit-button";
import { Shortcuts } from "./shortcuts";
import { ScheduleCard, type Schedule } from "./schedule-card";
import { Avatar, Chip, Icon, Kbd, Section, button, ghost, input } from "./ui";

type ClaimRow = { id: string; note: string | null; title: string | null; member: { display_name: string } | null; deed: { name: string; points: number } | null };

type ReportRow = { id: string; title: string | null; anonymous: boolean; reporter: { display_name: string } | null; subject: { display_name: string } | null; deed: { name: string; points: number } | null };

type AwardRow = { id: string; points: number; report_note: string | null; deleted_at: string | null; title: string | null; created_at: string; member: { display_name: string } | null; deed: { name: string } | null };

// shortcut: History (and its modal) holds the latest 100 rows; page through older ones if a household outgrows that.
const HISTORY = 100;

const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

export async function AdminView() {
  const supabase = await createClient();
  const [{ data: claims }, { data: deeds }, { data: housemates }, { data: invites }, { data: decided }, { data: entries }, { data: household }, { data: awards }, { data: groups }, { data: reports }, { data: dismissed }] = await Promise.all([
    supabase.from("claim")
      .select("id, note, title, member:member!claim_member_id_fkey(display_name), deed:deed_id(name, points)")
      .eq("status", "pending").order("created_at"),
    supabase.from("deed").select("id, name, points, active, group_id").is("deleted_at", null).order("kind").order("name"),
    supabase.from("member").select("user_id, display_name, role").eq("scored", true).order("display_name"),
    supabase.from("invite").select("code, expires_at").is("revoked_at", null).order("created_at"),
    supabase.from("claim")
      .select("id, note, title, status, decided_at, member:member!claim_member_id_fkey(display_name), deed:deed_id(name)")
      .neq("status", "pending").order("decided_at", { ascending: false }).limit(HISTORY),
    // Points actually scored, copied onto the entry when accepted.
    supabase.from("score_entry").select("id, claim_id, points, deleted_at").eq("source", "claim"),
    supabase.from("household").select("timezone").single(),
    // Awards and penalties entered directly, with no claim behind them.
    supabase.from("score_entry")
      .select("id, points, title, created_at, deleted_at, report_note, member:member!score_entry_member_id_fkey(display_name), deed:deed_id(name)")
      .eq("source", "admin").order("created_at", { ascending: false }).limit(HISTORY),
    supabase.from("deed_group").select("id, name").order("position").order("created_at"),
    supabase.from("report")
      .select("id, title, anonymous, reporter:member!report_reporter_id_fkey(display_name), subject:member!report_subject_id_fkey(display_name), deed:deed_id(name, points)")
      .eq("status", "pending").order("created_at"),
    // Accepted reports already show as the penalty they scored; dismissed ones would leave no trace without this.
    supabase.from("report")
      .select("id, title, anonymous, decided_at, reporter:member!report_reporter_id_fkey(display_name), subject:member!report_subject_id_fkey(display_name), deed:deed_id(name, points)")
      .eq("status", "rejected").order("decided_at", { ascending: false }).limit(HISTORY),
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
    deleted: !!scored.get(c.id)?.deleted_at,
  }));
  const fromAwards: HistoryRow[] = ((awards ?? []) as unknown as AwardRow[]).map((e) => ({
    id: e.id,
    title: e.deed?.name ?? e.title ?? "",
    at: e.created_at,
    note: e.report_note,
    status: "awarded",
    points: e.points,
    who: e.member?.display_name,
    entryId: e.id,
    deleted: !!e.deleted_at,
  }));
  const fromDismissed: HistoryRow[] = ((dismissed ?? []) as unknown as (ReportRow & { decided_at: string })[]).map((r) => ({
    id: `report-${r.id}`,
    title: `${r.reporter?.display_name} reported ${r.subject?.display_name} · ${r.deed?.name ?? r.title ?? ""}`,
    at: r.decided_at,
    note: null,
    status: "rejected",
    points: 0,
  }));
  const history = [...fromClaims, ...fromAwards, ...fromDismissed].sort((a, b) => b.at.localeCompare(a.at)).slice(0, HISTORY);
  const { data: schedule } = await supabase.from("send_schedule").select("instant, send_times, quiet_from, quiet_until").maybeSingle();
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
                      <p className="break-words"><span className="font-semibold">{c.member?.display_name}</span> <span className="font-semibold">{c.deed?.name ?? (c.title ?? "").replace(/^./, (ch: string) => ch.toLowerCase())}</span></p>
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
        <Section title="History">
          <HistoryList timeZone={household?.timezone ?? "Asia/Manila"} empty="Decided claims, awards and penalties show up here." rows={history} />
        </Section>
        <Section title="Invite links">
          <ul className="space-y-3">
            {invites?.map((i) => {
              const link = `${origin}/join/${i.code}`;
              return (
                <li key={i.code} className="space-y-2 rounded-2xl border border-line bg-bg p-3.5 transition-[border-color] duration-150 [@media(hover:hover)]:hover:border-ink/40">
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
      </div>

      <div className="space-y-6">
        <Section title="Catalog">
          <Catalog groups={groups ?? []} deeds={(deeds ?? []) as Deed[]} />
        </Section>
      </div>

      <div className="lg:col-span-2">
        <Section title="Email schedule">
          <ScheduleCard schedule={schedule as Schedule | null} timeZone={household?.timezone ?? "Asia/Manila"} />
        </Section>
      </div>
    </div>
  );
}
