import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getHousemates, getMe } from "@/lib/me";
import { AppShell } from "../_components/app-shell";
import { Avatar, Banner, Icon } from "../_components/ui";
import { Board, type Card, type Housemate } from "./board";
import type { CatalogDeed } from "./cell-popup";

type ChoreRow = { id: string; name: string; area: string | null; weekday: number; deed_id: string | null; deed: { points: number } | null };
type InstanceRow = { id: string; chore_id: string; weekday: number | null; assignee: string | null; source: string | null; claim_id: string | null };
type MedalRow = { member_id: string; label: string };
type DoerRow = { deed_name: string; member_id: string; display_name: string; times: number };

const PHASE_TEXT: Record<string, string> = {
  early: "Claim any open chore now. Unclaimed chores are handed out Sunday 00:00.",
  dibs: "Claim any open chore now. Unclaimed chores are handed out Sunday 00:00.",
  current: "This week's schedule.",
  past: "A finished week.",
};

export default async function Schedule({ searchParams }: PageProps<"/schedule">) {
  const { w, error } = await searchParams;
  const next = w === "next";
  const supabase = await createClient();
  const housemateRows = getHousemates(); // also feeds the shell

  // The database decides which Sunday it is in the household time zone, and fills the week in if it is not yet.
  const [{ me }, { data: weekStart }] = await Promise.all([getMe(), supabase.rpc("schedule_week", { p_weeks: next ? 1 : 0 })]);
  if (!me || typeof weekStart !== "string") redirect("/");

  // Only the instances read must wait for generate_week; everything else runs beside it.
  const [{ data: chores }, { data: instances }, members, { data: medals }, { data: doers }, { data: phase }, { data: today }, { data: claims }, { data: deeds }] = await Promise.all([
    supabase.from("chore").select("id, name, area, weekday, deed_id, deed(points)").eq("active", true).order("weekday").order("name"),
    supabase.rpc("generate_week", { p_week_start: weekStart }).then(() =>
      supabase.from("chore_instance").select("id, chore_id, weekday, assignee, source, claim_id").eq("week_start", weekStart)),
    housemateRows,
    supabase.rpc("medals"),
    supabase.rpc("top_doers"),
    supabase.rpc("week_phase", { p_week_start: weekStart }),
    supabase.rpc("schedule_today"),
    supabase.from("claim").select("id, status"), // an admin sees every claim, a housemate only their own
    me.role === "admin" ? supabase.from("deed").select("id, name, points, group:deed_group(name)").eq("kind", "good").eq("active", true).order("name") : Promise.resolve({ data: [] }),
  ]);

  const housemates: Housemate[] = members.map((m) => ({ id: m.user_id, name: m.display_name }));
  const choreById = new Map(((chores ?? []) as unknown as ChoreRow[]).map((c) => [c.id, c]));
  const claimStatus = new Map((claims ?? []).map((c) => [c.id, c.status as string]));
  const cards: Card[] = ((instances ?? []) as InstanceRow[]).flatMap((i) => {
    const c = choreById.get(i.chore_id);
    return c ? [{ id: i.id, deedId: c.deed_id, choreDay: c.weekday, name: c.name, area: c.area, points: c.deed?.points ?? 0, weekday: i.weekday ?? c.weekday, assignee: i.assignee, source: i.source,
      claimed: i.claim_id !== null, status: claimStatus.get(i.claim_id ?? "") ?? null }] : [];
  });
  // A housemate sees only their own chores, plus unclaimed ones they can still claim. Others' cards are never sent to the browser.
  const isAdmin = me.role === "admin";
  const visible = isAdmin ? cards : cards.filter((c) => c.assignee === me.userId || (phase !== "past" && c.assignee === null));
  const columns = isAdmin ? housemates : housemates.filter((h) => h.id === me.userId);
  // The catalog (active good deeds) feeds the cell popup; only the admin sees it.
  type DeedRow = { id: string; name: string; points: number; group: { name: string } | { name: string }[] | null };
  const areaOf = (g: DeedRow["group"]) => (Array.isArray(g) ? g[0]?.name : g?.name) ?? null;
  const catalog: CatalogDeed[] = ((deeds ?? []) as unknown as DeedRow[]).map((d) => ({ id: d.id, name: d.name, area: areaOf(d.group), points: d.points }));
  const nameOf = new Map(housemates.map((h) => [h.id, h.name]));

  const highlights = [
    ...((doers ?? []) as DoerRow[]).map((d) => ({ key: `d${d.deed_name}${d.member_id}`, who: d.display_name, text: `${d.deed_name} ×${d.times}`, sub: "Most often this month" })),
    ...((medals ?? []) as MedalRow[]).map((m) => ({ key: `m${m.member_id}${m.label}`, who: nameOf.get(m.member_id) ?? "Housemate", text: m.label, sub: "Medal" })),
  ];

  return (
    <AppShell me={me} active="schedule">
      <section aria-label="Achievements" className="-mx-1 flex h-[12.5vh] min-h-24 items-stretch gap-3 overflow-x-auto px-1 pb-1">
        {highlights.length === 0 && <p className="grid flex-1 place-items-center rounded-3xl border border-dashed border-line text-sm text-muted">Medals and top doers show up here.</p>}
        {highlights.map((h) => (
          <div key={h.key} className="rise flex min-w-52 shrink-0 items-center gap-3 rounded-3xl bg-accent px-4 text-[#16171b]">
            <Avatar name={h.who} className="size-10" />
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 truncate font-bold"><Icon name="medal" className="size-4" />{h.text}</p>
              <p className="truncate text-sm">{h.who}</p>
              <p className="truncate text-xs opacity-70">{h.sub}</p>
            </div>
          </div>
        ))}
      </section>

      <Banner error={typeof error === "string" ? error : undefined} />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="display text-4xl font-extrabold">{isAdmin ? "Schedule" : "My schedule"}</h1>
          <p className="text-muted">{PHASE_TEXT[phase as string] ?? ""}</p>
        </div>
        <nav aria-label="Week" className="grid grid-cols-2 gap-1 rounded-full bg-surface-2 p-1 text-center text-sm font-semibold">
          {[["This week", "/schedule", !next], ["Next week", "/schedule?w=next", next]].map(([label, href, on]) => (
            <Link key={href as string} href={href as string} aria-current={on ? "page" : undefined}
              className={`rounded-full px-4 py-2 transition-[background-color,color] duration-150 ${on ? "bg-ink text-bg" : "text-muted hover:text-ink"}`}>
              {label as string}
            </Link>
          ))}
        </nav>
      </div>

      {housemates.length === 0 ? ( // everyone gets the board: an admin adds from its cells, a housemate takes from its Unassigned row
        <p className="rounded-3xl border border-dashed border-line p-6 text-center text-muted">
          No housemates yet. Invite them from the Home tab.
        </p>
      ) : (
        <Board weekStart={weekStart} today={typeof today === "string" ? today : weekStart} phase={phase as string} housemates={columns} cards={visible} meId={me.userId}
          isAdmin={isAdmin} catalog={catalog} />
      )}

    </AppShell>
  );
}
