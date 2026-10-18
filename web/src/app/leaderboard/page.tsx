import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PERIODS, isPeriod, periodTitle } from "@/lib/period";
import { Page, Section } from "../_components/ui";
import { ExportButton, type Row } from "./export-button";

type BoardRow = { member_id: string; display_name: string; points: number; rank: number };
type MedalRow = { member_id: string; label: string };

export default async function Leaderboard({ searchParams }: PageProps<"/leaderboard">) {
  const { p } = await searchParams;
  const period = isPeriod(p) ? p : "this_week";
  const supabase = await createClient();
  const [{ data: board }, { data: medals }, { data: household }] = await Promise.all([
    supabase.rpc("leaderboard", { p_period: period }),
    supabase.rpc("medals"),
    supabase.from("household").select("name, timezone").single(),
  ]);

  const labels = new Map<string, string[]>();
  for (const m of (medals ?? []) as MedalRow[]) labels.set(m.member_id, [...(labels.get(m.member_id) ?? []), m.label]);
  const rows: Row[] = ((board ?? []) as BoardRow[]).map((r) => ({
    rank: Number(r.rank),
    name: r.display_name,
    points: Number(r.points),
    medals: labels.get(r.member_id) ?? [],
  }));
  const title = periodTitle(period, household?.timezone ?? "Asia/Manila");

  return (
    <Page title="Leaderboard">
      <nav className="flex flex-wrap gap-2 text-sm" aria-label="Period">
        {Object.entries(PERIODS).map(([key, label]) => (
          <Link key={key} href={`/leaderboard?p=${key}`} aria-current={key === period ? "page" : undefined}
            className={`rounded-lg border px-3 py-1.5 ${key === period ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300"}`}>
            {label}
          </Link>
        ))}
      </nav>
      <Section title={title}>
        <ol className="space-y-2">
          {rows.map((r) => (
            <li key={r.name} className="rounded-lg border border-zinc-200 p-3">
              <p className="flex justify-between text-lg"><span>{r.rank}. {r.name}</span><b>{r.points} pts</b></p>
              {r.medals.length > 0 && <p className="text-sm text-zinc-600">🏅 {r.medals.join(" · ")}</p>}
            </li>
          ))}
          {!rows.length && <li className="text-sm text-zinc-600">No housemates yet.</li>}
        </ol>
        <ExportButton title={title} household={household?.name ?? "Household"} rows={rows} />
      </Section>
      <Link href="/" className="text-sm underline">Back</Link>
    </Page>
  );
}
