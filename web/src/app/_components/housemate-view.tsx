import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Me } from "@/lib/me";
import { ClaimForm } from "./claim-form";
import { ReportForm } from "./report-form";
import { getHousemates, getTimeZone } from "@/lib/me";
import { HistoryList, type HistoryRow } from "./history-list";
import { Shortcuts } from "./shortcuts";
import { CountUp } from "./count-up";
import { Chip, Section, Skeleton } from "./ui";
import { SubmitButton } from "./submit-button";
import { dibChore } from "../actions";

type ClaimRow = { id: string; created_at: string; title: string | null; status: "pending" | "accepted" | "rejected"; note: string | null; deed: { name: string; points: number } | null };
type BoardRow = { member_id: string; points: number; rank: number };
type OpenChore = { instance_id: string; day: string; name: string; area: string | null; points: number };

// "2026-10-28" as "Wed, Oct 28". A plain date, so UTC keeps it from shifting.
const dayText = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });

// The points and the deed buttons come first; the sections below fetch for themselves and fill in as they arrive.
export function HousemateView({ me }: { me: Me }) {
  return (
    <>
      <Shortcuts keys={{ "+": "custom-deed" }} />
      <Suspense fallback={<PointsBanner me={me} />}><Points me={me} /></Suspense>
      <Section title="I did…"><Suspense fallback={<Skeleton rows={4} />}><Claim me={me} /></Suspense></Section>
      <Suspense fallback={<Section title="Report a housemate"><Skeleton rows={2} /></Section>}><Report me={me} /></Suspense>
      <Suspense fallback={<Section title="Available chores"><Skeleton /></Section>}><Chores /></Suspense>
      <Suspense fallback={<Section title="History"><Skeleton /></Section>}><History me={me} /></Suspense>
    </>
  );
}

// No `count` yet means the board is still loading: bars stand in for the text, so nothing is on screen twice once it arrives.
function PointsBanner({ me, mine, count }: { me: Me; mine?: BoardRow; count?: number }) {
  return (
    <section className="rise flex items-end justify-between gap-4 rounded-[2rem] bg-accent p-6 text-[#16171b] shadow-[0_18px_40px_-18px_color-mix(in_oklab,var(--accent)_65%,transparent)] sm:p-8">
      <div className="min-w-0">
        <p className="text-[1.3125rem] font-semibold leading-tight opacity-70">{count === undefined ? <span className="inline-block h-5 w-40 animate-pulse rounded bg-[#16171b]/10 align-middle" /> : `Hi, ${me.name}`}</p>
        <p className="display mt-1 text-7xl font-extrabold leading-none sm:text-8xl">{count === undefined ? <span className="inline-block h-[1em] w-[1.5em] animate-pulse rounded-2xl bg-[#16171b]/10 align-bottom" /> : <CountUp value={mine ? Number(mine.points) : 0} />}</p>
        {count !== undefined && <p className="mt-2 font-semibold">points this week</p>}
      </div>
      {mine && (
        <p className="display shrink-0 rounded-2xl bg-[#16171b] px-4 py-2 text-center text-[#f3f1ea]">
          <span className="block text-3xl font-bold leading-none">#{Number(mine.rank)}</span>
          <span className="text-xs font-medium opacity-70">of {count}</span>
        </p>
      )}
    </section>
  );
}

async function Points({ me }: { me: Me }) {
  const supabase = await createClient();
  const { data: board } = await supabase.rpc("leaderboard", { p_period: "this_week" });
  const rows = (board ?? []) as BoardRow[];
  const mine = rows.find((r) => r.member_id === me.userId);
  return <PointsBanner me={me} mine={mine} count={rows.length} />;
}

async function Claim({ me }: { me: Me }) {
  const supabase = await createClient();
  const [{ data: deeds }, { data: groups }, { data: myOrder }, housemates] = await Promise.all([
    supabase.from("deed").select("id, name, points, group_id").eq("kind", "good").eq("active", true).order("name"),
    supabase.from("deed_group").select("id, name").order("position").order("created_at"),
    supabase.from("member_group_order").select("group_id, position"), // only this housemate's own rows
    getHousemates(),
  ]);
  // Their own order first; groups they have not placed yet keep the admin's order after those.
  const myPos = new Map((myOrder ?? []).map((o) => [o.group_id, o.position]));
  const ordered = [...(groups ?? [])].sort((a, b) => (myPos.get(a.id) ?? Infinity) - (myPos.get(b.id) ?? Infinity));
  return deeds?.length ? <ClaimForm deeds={deeds} groups={ordered} mates={housemates.filter((h) => h.user_id !== me.userId).map((h) => ({ id: h.user_id, name: h.display_name }))} /> : <p className="text-sm text-muted">Your admin hasn&apos;t added any deeds yet.</p>;
}

async function Report({ me }: { me: Me }) {
  const supabase = await createClient();
  const [{ data: penalties }, housemates] = await Promise.all([
    supabase.from("deed").select("id, name, points").eq("kind", "penalty").eq("active", true).is("deleted_at", null).order("name"),
    getHousemates(),
  ]);
  return (
    <Section title="Report a housemate">
      {housemates.length ? <ReportForm housemates={housemates} penalties={penalties ?? []} meId={me.userId} /> : <p className="text-sm text-muted">No housemates to report yet.</p>}
    </Section>
  );
}

// The slowest call on this screen: it also makes sure this week's and next week's chores exist.
async function Chores() {
  const supabase = await createClient();
  const { data: open } = await supabase.rpc("available_chores");
  return (
    <Section title="Available chores" count={(open as OpenChore[] | null)?.length}>
      <ul className="divide-y divide-line">
        {((open ?? []) as OpenChore[]).map((c) => (
          <li key={c.instance_id} className="removable -mx-2 flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors duration-150 first:pt-0 last:pb-0 [@media(hover:hover)]:hover:bg-surface-2/60">
            <span className="display w-12 shrink-0 text-center leading-tight">
              <span className="eyebrow block">{dayText.format(new Date(`${c.day}T00:00:00Z`)).split(",")[0]}</span>
              <span className="text-xl font-bold tabular-nums">{c.day.slice(8)}</span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{c.name}</span>
              <span className="block truncate text-xs text-muted">{dayText.format(new Date(`${c.day}T00:00:00Z`))}{c.area ? ` · ${c.area}` : ""}</span>
            </span>
            {c.points > 0 && <Chip tone="muted">{c.points} pts</Chip>}
            <form action={dibChore}>
              <input type="hidden" name="instance" value={c.instance_id} />
              <input type="hidden" name="from" value="/" />
              <SubmitButton pendingText="Claiming…" className="inline-flex min-h-10 items-center justify-center rounded-full bg-accent px-4 py-2 text-sm font-semibold text-[#16171b] transition-[transform,filter] duration-150 ease-out hover:brightness-95 active:scale-[0.96] disabled:opacity-60">Dibs</SubmitButton>
            </form>
          </li>
        ))}
        {!open?.length && <li className="text-sm text-muted">No open chores right now. New ones appear for next week.</li>}
      </ul>
    </Section>
  );
}

async function History({ me }: { me: Me }) {
  const supabase = await createClient();
  const [{ data: claims }, { data: entries }, timeZone, { data: given }, { data: myReports }, { data: reportEntries }, { data: contributed }] = await Promise.all([
    supabase.from("claim").select("id, status, note, title, created_at, deed:deed_id(name, points)").eq("member_id", me.userId).order("created_at", { ascending: false }).limit(100), // the first 10 show; the rest open under See more
    // Points actually scored: copied onto the entry when approved, so catalog edits never change history.
    supabase.from("score_entry").select("claim_id, points, deleted_at").eq("member_id", me.userId).eq("source", "claim"),
    getTimeZone(),
    // Entries an admin made for them: awards, and penalties from reports (those carry who reported, unless anonymous).
    supabase.from("score_entry").select("id, points, title, created_at, deleted_at, report_note, deed:deed_id(name)").eq("member_id", me.userId).eq("source", "admin").order("created_at", { ascending: false }).limit(100),
    // Reports they filed, and the entries those became (to show the points that were applied).
    supabase.from("report").select("id, title, status, created_at, subject:member!report_subject_id_fkey(display_name), deed:deed_id(name, points)").eq("reporter_id", me.userId).order("created_at", { ascending: false }).limit(100),
    supabase.from("score_entry").select("report_id, points, deleted_at").not("report_id", "is", null),
    supabase.rpc("my_contributions"), // claims others filed with them as a contributor
  ]);
  const scored = new Map((entries ?? []).map((e) => [e.claim_id, e]));
  // Accepted: the points copied onto the entry; a deleted entry keeps its points but is marked. Pending: catalog points, unknown for custom claims.
  const history: HistoryRow[] = ((claims ?? []) as unknown as ClaimRow[]).map((c) => ({
    id: c.id,
    title: c.deed?.name ?? c.title ?? "",
    at: c.created_at,
    note: c.note,
    status: c.status,
    deleted: !!scored.get(c.id)?.deleted_at,
    points: c.status === "accepted" ? scored.get(c.id)?.points ?? 0 : c.status === "pending" ? c.deed?.points ?? null : 0,
  }));
  const awarded: HistoryRow[] = ((given ?? []) as unknown as { id: string; points: number; title: string | null; created_at: string; deleted_at: string | null; report_note: string | null; deed: { name: string } | null }[])
    .map((e) => ({ id: e.id, title: e.deed?.name ?? e.title ?? "", at: e.created_at, note: e.report_note, status: "awarded", points: e.points, deleted: !!e.deleted_at }));
  const applied = new Map((reportEntries ?? []).map((e) => [e.report_id, e]));
  const reported: HistoryRow[] = ((myReports ?? []) as unknown as { id: string; title: string | null; status: "pending" | "accepted" | "rejected"; created_at: string; subject: { display_name: string } | null; deed: { name: string; points: number } | null }[])
    .map((r) => ({
      id: `report-${r.id}`,
      title: `You reported ${r.subject?.display_name ?? "a housemate"} · ${r.deed?.name ?? r.title ?? ""}`,
      at: r.created_at, note: null, status: r.status,
      points: r.status === "accepted" ? applied.get(r.id)?.points ?? 0 : r.status === "pending" ? r.deed?.points ?? null : 0,
      deleted: !!applied.get(r.id)?.deleted_at,
    }));
  const withOthers: HistoryRow[] = ((contributed ?? []) as { id: string; title: string; note: string | null; status: "pending" | "accepted" | "rejected"; created_at: string; points: number | null; deleted: boolean }[])
    .map((c) => ({ id: `with-${c.id}`, title: c.title, at: c.created_at, note: c.note, status: c.status, points: c.points, deleted: c.deleted }));
  const all = [...history, ...withOthers, ...awarded, ...reported].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 100);
  return (
    <Section title="History">
      <HistoryList timeZone={timeZone} empty="Nothing yet. Tap a deed above when you do one." rows={all} />
    </Section>
  );
}
