import { createClient } from "@/lib/supabase/server";
import type { Me } from "@/lib/me";
import { ClaimForm } from "./claim-form";
import { HistoryList, type HistoryRow } from "./history-list";
import { Shortcuts } from "./shortcuts";
import { CountUp } from "./count-up";
import { Chip, Section } from "./ui";
import { SubmitButton } from "./submit-button";
import { dibChore } from "../actions";

type ClaimRow = { id: string; created_at: string; title: string | null; status: "pending" | "accepted" | "rejected"; note: string | null; deed: { name: string; points: number } | null };
type BoardRow = { member_id: string; points: number; rank: number };
type OpenChore = { instance_id: string; day: string; name: string; area: string | null; weight: number };

// "2026-10-28" as "Wed, Oct 28". A plain date, so UTC keeps it from shifting.
const dayText = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });

export async function HousemateView({ me }: { me: Me }) {
  const supabase = await createClient();
  const [{ data: deeds }, { data: claims }, { data: board }, { data: entries }, { data: household }, { data: open }] = await Promise.all([
    supabase.from("deed").select("id, name, points").eq("kind", "good").eq("active", true).order("name"),
    supabase.from("claim").select("id, status, note, title, created_at, deed:deed_id(name, points)").order("created_at", { ascending: false }).limit(100), // the first 10 show; the rest open under See more
    supabase.rpc("leaderboard", { p_period: "this_week" }),
    // Points actually scored: copied onto the entry when approved, so catalog edits never change history.
    supabase.from("score_entry").select("claim_id, points").eq("member_id", me.userId).eq("source", "claim").is("deleted_at", null),
    supabase.from("household").select("timezone").single(),
    supabase.rpc("available_chores"),
  ]);
  const scored = new Map((entries ?? []).map((e) => [e.claim_id, e.points]));
  // Accepted: the points copied onto the entry (0 if an admin deleted it). Pending: catalog points, unknown for custom claims.
  const history: HistoryRow[] = ((claims ?? []) as unknown as ClaimRow[]).map((c) => ({
    id: c.id,
    title: c.deed?.name ?? c.title ?? "",
    at: c.created_at,
    note: c.note,
    status: c.status,
    points: c.status === "accepted" ? scored.get(c.id) ?? 0 : c.status === "pending" ? c.deed?.points ?? null : 0,
  }));
  const rows = (board ?? []) as BoardRow[];
  const mine = rows.find((r) => r.member_id === me.userId);

  return (
    <>
      <Shortcuts keys={{ "+": "custom-deed" }} />
      <section className="rise flex items-end justify-between gap-4 rounded-[2rem] bg-accent p-6 text-[#16171b] shadow-[0_18px_40px_-18px_color-mix(in_oklab,var(--accent)_65%,transparent)] sm:p-8">
        <div className="min-w-0">
          <p className="text-[1.3125rem] font-semibold leading-tight opacity-70">Hi, {me.name}</p>
          <p className="display mt-1 text-7xl font-extrabold leading-none sm:text-8xl"><CountUp value={mine ? Number(mine.points) : 0} /></p>
          <p className="mt-2 font-semibold">points this week</p>
        </div>
        {mine && (
          <p className="display shrink-0 rounded-2xl bg-[#16171b] px-4 py-2 text-center text-[#f3f1ea]">
            <span className="block text-3xl font-bold leading-none">#{Number(mine.rank)}</span>
            <span className="text-xs font-medium opacity-70">of {rows.length}</span>
          </p>
        )}
      </section>

      <Section title="I did…">
        {deeds?.length ? <ClaimForm deeds={deeds} /> : <p className="text-sm text-muted">Your admin hasn&apos;t added any deeds yet.</p>}
      </Section>

      <Section title="Available chores" count={(open as OpenChore[] | null)?.length}>
        <ul className="divide-y divide-line">
          {((open ?? []) as OpenChore[]).map((c) => (
            <li key={c.instance_id} className="removable flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
              <span className="display w-12 shrink-0 text-center leading-tight">
                <span className="eyebrow block">{dayText.format(new Date(`${c.day}T00:00:00Z`)).split(",")[0]}</span>
                <span className="text-xl font-bold tabular-nums">{c.day.slice(8)}</span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{c.name}</span>
                <span className="block truncate text-xs text-muted">{dayText.format(new Date(`${c.day}T00:00:00Z`))}{c.area ? ` · ${c.area}` : ""}</span>
              </span>
              <Chip tone="muted">{"●".repeat(c.weight)}</Chip>
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

      <Section title="History">
        <HistoryList timeZone={household?.timezone ?? "Asia/Manila"} empty="Nothing yet. Tap a deed above when you do one." rows={history} />
      </Section>
    </>
  );
}
