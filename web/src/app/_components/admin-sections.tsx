import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getTimeZone } from "@/lib/me";
import { createInvite, revokeInvite } from "../actions";
import { CopyButton } from "./copy-button";
import { HistoryList, type HistoryRow } from "./history-list";
import { SubmitButton } from "./submit-button";
import { ScheduleCard, type Schedule } from "./schedule-card";
import { Section, button, ghost } from "./ui";

// The slower, lower parts of the admin screen. Each fetches its own data, so the screen shows its top without waiting for them.

type Named = { display_name: string } | null;
type Scored = { id: string; points: number; deleted_at: string | null; member: Named };
type DecidedRow = { id: string; note: string | null; title: string | null; status: "accepted" | "rejected"; decided_at: string; member: Named; deed: { name: string } | null };
type AwardRow = { id: string; points: number; report_note: string | null; deleted_at: string | null; title: string | null; created_at: string; member: Named; deed: { name: string } | null };
type DismissedRow = { id: string; title: string | null; decided_at: string; reporter: Named; subject: Named; deed: { name: string } | null };

// shortcut: History (and its modal) holds the latest 100 rows; page through older ones if a household outgrows that.
const HISTORY = 100;

export async function AdminHistory() {
  const supabase = await createClient();
  const [{ data: decided }, { data: entries }, timeZone, { data: awards }, { data: dismissed }] = await Promise.all([
    supabase.from("claim")
      .select("id, note, title, status, decided_at, member:member!claim_member_id_fkey(display_name), deed:deed_id(name)")
      .neq("status", "pending").order("decided_at", { ascending: false }).limit(HISTORY),
    // Points actually scored, copied onto the entry when accepted.
    supabase.from("score_entry").select("id, claim_id, points, deleted_at, member:member!score_entry_member_id_fkey(display_name)").eq("source", "claim"),
    getTimeZone(),
    // Awards and penalties entered directly, with no claim behind them.
    supabase.from("score_entry")
      .select("id, points, title, created_at, deleted_at, report_note, member:member!score_entry_member_id_fkey(display_name), deed:deed_id(name)")
      .eq("source", "admin").order("created_at", { ascending: false }).limit(HISTORY),
    // Accepted reports already show as the penalty they scored; dismissed ones would leave no trace without this.
    supabase.from("report")
      .select("id, title, anonymous, decided_at, reporter:member!report_reporter_id_fkey(display_name), subject:member!report_subject_id_fkey(display_name), deed:deed_id(name, points)")
      .eq("status", "rejected").order("decided_at", { ascending: false }).limit(HISTORY),
  ]);
  const scored = new Map<string, Scored[]>();
  for (const e of (entries ?? []) as unknown as (Scored & { claim_id: string })[]) scored.set(e.claim_id, [...(scored.get(e.claim_id) ?? []), e]);
  // An accepted claim with contributors is one History row per person, so each person's entry can be deleted on its own.
  const fromClaims: HistoryRow[] = ((decided ?? []) as unknown as DecidedRow[]).flatMap((c) => {
    const base = { title: c.deed?.name ?? c.title ?? "", at: c.decided_at, note: c.note, status: c.status };
    const mine = c.status === "accepted" ? scored.get(c.id) ?? [] : [];
    if (mine.length < 2) {
      const e = mine[0];
      return [{ ...base, id: c.id, points: e?.points ?? 0, who: c.member?.display_name, entryId: e?.id, deleted: !!e?.deleted_at }];
    }
    return mine.map((e) => ({ ...base, id: `${c.id}:${e.id}`, points: e.points, who: e.member?.display_name, entryId: e.id, deleted: !!e.deleted_at }));
  });
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
  const fromDismissed: HistoryRow[] = ((dismissed ?? []) as unknown as DismissedRow[]).map((r) => ({
    id: `report-${r.id}`,
    title: `${r.reporter?.display_name} reported ${r.subject?.display_name} · ${r.deed?.name ?? r.title ?? ""}`,
    at: r.decided_at,
    note: null,
    status: "rejected",
    points: 0,
  }));
  const history = [...fromClaims, ...fromAwards, ...fromDismissed].sort((a, b) => b.at.localeCompare(a.at)).slice(0, HISTORY);
  return (
    <Section title="History">
      <HistoryList timeZone={timeZone} empty="Decided claims, awards and penalties show up here." rows={history} />
    </Section>
  );
}

export async function InviteLinks() {
  const supabase = await createClient();
  const [{ data: invites }, h] = await Promise.all([
    supabase.from("invite").select("code, expires_at").is("revoked_at", null).order("created_at"),
    headers(),
  ]);
  const origin = h.get("origin") ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  return (
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
  );
}

export async function EmailSchedule() {
  const supabase = await createClient();
  const [{ data: schedule }, timeZone] = await Promise.all([
    supabase.from("send_schedule").select("instant, send_times, quiet_from, quiet_until").maybeSingle(),
    getTimeZone(),
  ]);
  return <ScheduleCard schedule={schedule as Schedule | null} timeZone={timeZone} />;
}
