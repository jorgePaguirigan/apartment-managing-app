import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getHousemates, getMe } from "@/lib/me";
import { PERIODS, isPeriod, periodTitle } from "@/lib/period";
import { AppShell } from "../_components/app-shell";
import { Avatar, Chip, Icon } from "../_components/ui";
import { FlipList } from "../_components/flip-list";
import { PillNav } from "../_components/pill-nav";
import { ExportButton, type Row } from "./export-button";

type BoardRow = { member_id: string; display_name: string; points: number; rank: number };
type MedalRow = { member_id: string; label: string };

export default async function Leaderboard({ searchParams }: PageProps<"/leaderboard">) {
  const { p } = await searchParams;
  const period = isPeriod(p) ? p : "this_week";
  const supabase = await createClient();
  void getHousemates(); // the shell needs it; start it now
  // One round trip: nothing here depends on who is signed in.
  const [{ me }, { data: board }, { data: medals }, { data: household }] = await Promise.all([
    getMe(),
    supabase.rpc("leaderboard", { p_period: period }),
    supabase.rpc("medals"),
    supabase.from("household").select("timezone").single(),
  ]);
  if (!me) redirect("/");

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
          <h1 className="display text-4xl font-extrabold">Leaderboard</h1>
          <p className="text-muted">{title}</p>
        </div>
        <ExportButton title={title} household={me.household} rows={exportRows} />
      </div>

      <nav aria-label="Period">
        <PillNav id="period" items={Object.entries(PERIODS).map(([key, label]) => ({ key, label, href: `/leaderboard?p=${key}` }))} active={period}
          className="grid grid-cols-4 gap-1 rounded-full bg-surface-2 p-1 text-center text-sm font-semibold" linkClass="rounded-full px-1 py-2.5 transition-colors duration-150"
          activeClass="text-bg" idleClass="text-muted hover:text-ink" thumbClass="rounded-full bg-ink" />
      </nav>

      <FlipList id="leaderboard" className="space-y-2.5">
        {rows.map((r, i) => {
          const lead = r.rank === 1 && r.points > 0;
          return (
            <li key={r.id} data-flip-id={r.id} style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
              className={`rise flex items-center gap-3 rounded-3xl p-4 ${lead ? "bg-accent text-[#16171b] sm:p-5" : "border border-line bg-surface shadow-[var(--shadow)]"}`}>
              <span className={`display w-8 text-center font-extrabold ${lead ? "text-3xl" : "text-xl text-muted"}`}>{r.rank}</span>
              <Avatar name={r.name} className={lead ? "size-12" : "size-10"} />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 font-semibold">
                  <span className="truncate">{r.name}</span>
                  {r.id === me.userId && <Chip tone={lead ? "muted" : "points"}>You</Chip>}
                </p>
                {r.medals.length > 0 && (
                  <p className="mt-1 flex flex-wrap gap-1.5">{r.medals.map((m) => <Chip key={m} tone="muted"><Icon name="medal" className="size-3.5" />{m}</Chip>)}</p>
                )}
              </div>
              <p className="text-right">
                <span className={`display font-extrabold tabular-nums ${lead ? "text-5xl" : "text-3xl"}`}>{r.points}</span>
                <span className={`ml-1 text-sm font-medium ${lead ? "opacity-70" : "text-muted"}`}>pts</span>
              </p>
            </li>
          );
        })}
      </FlipList>
      {!rows.length && <p className="rounded-3xl border border-dashed border-line p-6 text-center text-muted">No housemates yet. Invite them from the Home tab.</p>}
      {empty && <p className="text-center text-sm text-muted">Nobody has points for this period yet.</p>}
    </AppShell>
  );
}
