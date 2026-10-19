import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getHousemates, getMe } from "@/lib/me";
import { AppShell } from "../_components/app-shell";
import { Banner, Chip, Icon, Section, button, ghost, input } from "../_components/ui";
import { SubmitButton } from "../_components/submit-button";
import { logSpend, saveCategory } from "../actions";

type Row = { category_id: string; name: string; monthly_amount: number; spent: number; left: number; month_start: string; active: boolean };
type Overview = { month_start: string; month_end: string; allowance: number; spent: number; left: number };
type Spend = { id: string; amount: number; note: string | null; spent_on: string; category: { name: string } | null; member: { display_name: string } | null };

const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });
const monthName = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", month: "long", year: "numeric" });
const day = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric" });

export default async function Budget({ searchParams }: PageProps<"/budget">) {
  const { m, error } = await searchParams;
  const supabase = await createClient();
  void getHousemates(); // the shell needs it; start it now

  // The database decides the month, its bounds and the totals, all in the household time zone.
  const past = m === "prev";
  const [{ me }, { data: overview }] = await Promise.all([getMe(), supabase.rpc("budget_overview", { p_offset: past ? -1 : 0 })]);
  const month = (overview as Overview[] | null)?.[0];
  if (!me || !month) redirect("/");
  const [{ data: summary }, { data: spends }] = await Promise.all([
    supabase.rpc("budget_summary", { p_month: month.month_start }),
    supabase.from("spend_entry")
      .select("id, amount, note, spent_on, category:category_id(name), member:member!spend_entry_member_id_fkey(display_name)")
      .gte("spent_on", month.month_start).lt("spent_on", month.month_end)
      .order("spent_on", { ascending: false }).order("created_at", { ascending: false }).limit(15),
  ]);
  const rows = (summary ?? []) as Row[];
  const open = rows.filter((r) => r.active); // archived categories keep their history but take no new spending
  const { allowance, spent, left } = month;
  const isAdmin = me.role === "admin";

  return (
    <AppShell me={me} active="budget">
      <Banner error={error as string | undefined} />
      <div className="flex items-center justify-between gap-3">
        <h1 className="display text-2xl font-bold">{monthName(month.month_start)}</h1>
        <Link href={past ? "/budget" : "/budget?m=prev"} className={ghost}>{past ? "This month" : "Last month"}</Link>
      </div>

      <section aria-label="Total left" className="rounded-[1.75rem] border border-line bg-surface p-5 shadow-[var(--shadow)]">
        <p className="eyebrow">Allowance left</p>
        <p className={`display text-4xl font-bold tabular-nums ${left < 0 ? "text-bad" : ""}`}>{peso.format(left)}</p>
        <p className="text-sm text-muted">of {peso.format(allowance)} · {peso.format(spent)} spent</p>
      </section>

      {rows.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-line p-6 text-center text-muted">{isAdmin ? "No categories yet. Add one below." : "No budget categories yet. Ask your admin."}</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {rows.map((r) => (
            <li key={r.category_id} className="space-y-1 rounded-3xl border border-line bg-surface p-4">
              <div className="flex items-center gap-2"><Icon name="wallet" /><span className="min-w-0 flex-1 truncate font-semibold">{r.name}</span></div>
              <p className={`display text-2xl font-bold tabular-nums ${Number(r.left) < 0 ? "text-bad" : ""}`}>{peso.format(Number(r.left))}</p>
              <p className="text-xs text-muted">{peso.format(Number(r.spent))} of {peso.format(Number(r.monthly_amount))}</p>
            </li>
          ))}
        </ul>
      )}

      {me.role === "housemate" && !past && open.length > 0 && (
        <Section title="Log spending">
          <form action={logSpend} className="grid gap-2 sm:grid-cols-2">
            <select name="category" required aria-label="Category" className={input}>{open.map((r) => <option key={r.category_id} value={r.category_id}>{r.name}</option>)}</select>
            <input name="amount" type="number" inputMode="decimal" min="0.01" step="0.01" required placeholder="Amount (PHP)" aria-label="Amount" className={input} />
            <input name="note" maxLength={120} placeholder="Note (optional)" aria-label="Note" className={`${input} sm:col-span-2`} />
            <SubmitButton className={`${button} sm:col-span-2`} pendingText="Saving…">Log it</SubmitButton>
          </form>
        </Section>
      )}

      <Section title="Spending">
        <ul className="divide-y divide-line">
          {((spends ?? []) as unknown as Spend[]).map((s) => (
            <li key={s.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{s.category?.name} · {s.member?.display_name}</span>
                <span className="block truncate text-xs text-muted">{day(s.spent_on)}{s.note ? ` · ${s.note}` : ""}</span>
              </span>
              <Chip tone="muted">{peso.format(Number(s.amount))}</Chip>
            </li>
          ))}
          {!spends?.length && <li className="text-sm text-muted">Nothing spent yet this month.</li>}
        </ul>
      </Section>

      {isAdmin && (
        <Section title="Categories">
          <ul className="divide-y divide-line">
            {rows.map((r) => (
              <li key={r.category_id} className="py-2.5 first:pt-0">
                <details>
                  <summary className="flex min-h-11 cursor-pointer items-center gap-3"><span className={`min-w-0 flex-1 truncate font-semibold ${r.active ? "" : "text-muted"}`}>{r.name}{!r.active && " (archived)"}</span><span className="text-sm text-muted tabular-nums">{peso.format(Number(r.monthly_amount))}</span></summary>
                  <form action={saveCategory} className="mt-2 flex flex-wrap gap-2">
                    <input type="hidden" name="id" value={r.category_id} />
                    <input name="name" defaultValue={r.name} required maxLength={40} aria-label="Category name" className={`${input} min-w-0 flex-1`} />
                    <input name="amount" type="number" inputMode="decimal" min="0" step="0.01" defaultValue={r.monthly_amount} required aria-label="Monthly amount" className={`${input} min-w-0 w-32! shrink-0`} />
                    <SubmitButton className={ghost} pendingText="…">Save</SubmitButton>
                    <SubmitButton name="active" value={r.active ? "0" : "1"} className={ghost} pendingText="…">{r.active ? "Archive" : "Restore"}</SubmitButton>
                  </form>
                </details>
              </li>
            ))}
          </ul>
          <form action={saveCategory} className="flex flex-wrap gap-2 border-t border-line pt-3">
            <input name="name" required maxLength={40} placeholder="New category" aria-label="Category name" className={`${input} min-w-0 basis-full sm:basis-0 sm:flex-1`} />
            <input name="amount" type="number" inputMode="decimal" min="0" step="0.01" required placeholder="PHP / month" aria-label="Monthly amount" className={`${input} min-w-0 flex-1 sm:w-32! sm:flex-none`} />
            <SubmitButton className={ghost} pendingText="…">Add</SubmitButton>
          </form>
        </Section>
      )}
    </AppShell>
  );
}
