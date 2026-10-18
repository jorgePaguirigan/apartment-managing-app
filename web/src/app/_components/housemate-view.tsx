import { createClient } from "@/lib/supabase/server";
import type { Me } from "@/lib/me";
import { ClaimForm } from "./claim-form";
import { Chip, Section } from "./ui";

type ClaimRow = { id: string; status: "pending" | "accepted" | "rejected"; note: string | null; deed: { name: string; points: number } | null };
type BoardRow = { member_id: string; points: number; rank: number };

const STATUS = {
  pending: { tone: "warn", label: "Waiting" },
  accepted: { tone: "ok", label: "Approved" },
  rejected: { tone: "bad", label: "Not approved" },
} as const;

export async function HousemateView({ me }: { me: Me }) {
  const supabase = await createClient();
  const [{ data: deeds }, { data: claims }, { data: board }] = await Promise.all([
    supabase.from("deed").select("id, name, points").eq("kind", "good").eq("active", true).order("name"),
    supabase.from("claim").select("id, status, note, deed:deed_id(name, points)").order("created_at", { ascending: false }).limit(10),
    supabase.rpc("leaderboard", { p_period: "this_week" }),
  ]);
  const rows = (board ?? []) as BoardRow[];
  const mine = rows.find((r) => r.member_id === me.userId);

  return (
    <>
      <div className="rise space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Hi, {me.name}</h1>
        {mine && (
          <p className="text-muted">
            <span className="font-semibold tabular-nums text-ink">{Number(mine.points)} pts</span> this week · #{Number(mine.rank)} of {rows.length}
          </p>
        )}
      </div>

      <Section title="I did…">
        {deeds?.length ? <ClaimForm deeds={deeds} /> : <p className="text-sm text-muted">Your admin hasn&apos;t added any deeds yet.</p>}
      </Section>

      <Section title="My claims">
        <ul className="divide-y divide-line">
          {((claims ?? []) as unknown as ClaimRow[]).map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
              <span className="min-w-0">
                <span className="block truncate font-medium">{c.deed?.name}</span>
                {c.note && <span className="block truncate text-sm text-muted">{c.note}</span>}
              </span>
              <Chip tone={STATUS[c.status].tone}>{STATUS[c.status].label}</Chip>
            </li>
          ))}
          {!claims?.length && <li className="text-sm text-muted">Nothing yet. Tap a deed above when you do one.</li>}
        </ul>
      </Section>
    </>
  );
}
