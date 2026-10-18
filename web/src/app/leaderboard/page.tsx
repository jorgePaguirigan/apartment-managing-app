import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMe } from "@/lib/me";
import { PERIODS, isPeriod, periodTitle } from "@/lib/period";
import { AppShell } from "../_components/app-shell";
import { Avatar, Chip } from "../_components/ui";
import { ExportButton, type Row } from "./export-button";

type BoardRow = { member_id: string; display_name: string; points: number; rank: number };
type MedalRow = { member_id: string; label: string };

export default async function Leaderboard({ searchParams }: PageProps<"/leaderboard">) {
  const { p } = await searchParams;
  const period = isPeriod(p) ? p : "this_week";
  const { me } = await getMe();
  if (!me) redirect("/");
  const supabase = await createClient();
  const [{ data: board }, { data: medals }, { data: household }] = await Promise.all([
    supabase.rpc("leaderboard", { p_period: period }),
    supabase.rpc("medals"),
    supabase.from("household").select("timezone").single(),
  ]);

  const labels = new Map<string, string[]>();
  for (const m of (medals ?? []) as MedalRow[]) labels.set(m.member_id, [...(labels.get(m.member_id) ?? []), m.label]);
  const rows = ((board ?? []) as BoardRow[]).map((r) => ({
    id: r.member_id,
    rank: Number(r.rank),
    name: r.display_name,
    points: Number(r.points),
    medals: labels.get(r.member_id) ?? [],
  }));
  const title = periodTitle(period, household?.timezone ?? "Asia/Manila");
  const exportRows: Row[] = rows.map(({ rank, name, points, medals }) => ({ rank, name, points, medals }));
  const empty = rows.length > 0 && rows.every((r) => r.points === 0);

  return (
    <AppShell me={me} active="leaderboard">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Leaderboard</h1>
          <p className="text-muted">{title}</p>
        </div>
        <ExportButton title={title} household={me.household} rows={exportRows} />
      </div>

      <nav aria-label="Period" className="grid grid-cols-4 gap-1 rounded-2xl bg-surface-2 p-1 text-center text-sm font-medium">
        {Object.entries(PERIODS).map(([key, label]) => (
          <Link key={key} href={`/leaderboard?p=${key}`} aria-current={key === period ? "page" : undefined}
            className={`rounded-xl px-1 py-2 transition-[background-color,color,box-shadow] duration-150 ${key === period ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"}`}>
            {label}
          </Link>
        ))}
      </nav>

      <ol className="space-y-2.5">
        {rows.map((r, i) => (
          <li key={r.id} style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
            className={`rise flex items-center gap-3 rounded-2xl border bg-surface p-3.5 shadow-sm sm:p-4 ${r.rank === 1 && r.points > 0 ? "border-accent/50" : "border-line"}`}>
            <span className={`w-7 text-center text-xl font-semibold tabular-nums ${r.rank === 1 && r.points > 0 ? "text-accent" : "text-muted"}`}>{r.rank}</span>
            <Avatar name={r.name} />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 font-medium">
                <span className="truncate">{r.name}</span>
                {r.id === me.userId && <Chip tone="muted">You</Chip>}
              </p>
              {r.medals.length > 0 && (
                <p className="mt-1 flex flex-wrap gap-1.5">{r.medals.map((m) => <Chip key={m} tone="warn">🏅 {m}</Chip>)}</p>
              )}
            </div>
            <p className="text-right"><span className="text-xl font-semibold tabular-nums">{r.points}</span> <span className="text-sm text-muted">pts</span></p>
          </li>
        ))}
      </ol>
      {!rows.length && <p className="rounded-2xl border border-dashed border-line p-6 text-center text-muted">No housemates yet. Invite them from the Home tab.</p>}
      {empty && <p className="text-center text-sm text-muted">Nobody has points for this period yet.</p>}
    </AppShell>
  );
}
