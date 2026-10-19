import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMe } from "@/lib/me";
import { AppShell } from "../_components/app-shell";
import { Banner, Chip, Icon, Section, button, ghost, input } from "../_components/ui";
import { SubmitButton } from "../_components/submit-button";
import { logSpend, saveCategory } from "../actions";

type Row = { category_id: string; name: string; monthly_amount: number; spent: number; left: number; month_start: string };
type Spend = { id: string; amount: number; note: string | null; spent_on: string; category: { name: string } | null; member: { display_name: string } | null };

const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });
const monthName = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", month: "long", year: "numeric" });
// A day before the 1st is in the previous month; plain UTC date maths, no time zone involved.
const dayBefore = (iso: string) => new Date(Date.parse(`${iso}T00:00:00Z`) - 864e5).toISOString().slice(0, 10);

export default async function Budget({ searchParams }: PageProps<"/budget">) {
  const { m, error } = await searchParams;
  const { me } = await getMe();
  if (!me) redirect("/");
  const supabase = await createClient();

  // The database decides which month it is in the household time zone.
  const { data: current } = await supabase.rpc("budget_month");
  if (typeof current !== "string") redirect("/");
  const past = m === "prev";
  const monthStart = past ? `${dayBefore(current).slice(0, 7)}-01` : current;
  const nextStart = new Date(Date.UTC(+monthStart.slice(0, 4), +monthStart.slice(5, 7), 1)).toISOString().slice(0, 10);
  const [{ data: summary }, { data: spends }] = await Promise.all([
    supabase.rpc("budget_summary", { p_month: monthStart }),
    supabase.from("spend_entry")
      .select("id, amount, note, spent_on, category:category_id(name), member:member!spend_entry_member_id_fkey(display_name)")
      .gte("spent_on", monthStart).lt("spent_on", nextStart)
      .order("spent_on", { ascending: false }).order("created_at", { ascending: false }).limit(15),
  ]);
  const rows = (summary ?? []) as Row[];

  const allowance = rows.reduce((a, r) => a + Number(r.monthly_amount), 0);
  const left = rows.reduce((a, r) => a + Number(r.left), 0);
  const isAdmin = me.role === "admin";

  return (
    <AppShell me={me} active="budget">
      <Banner error={error as string | undefined} />
      <div className="flex items-center justify-between gap-3">
        <h1 className="display text-2xl font-bold">{monthName(monthStart)}</h1>
        <Link href={past ? "/budget" : "/budget?m=prev"} className={ghost}>{past ? "This month" : "Last month"}</Link>
      </div>

      <section aria-label="Total left" className="rounded-[1.75rem] border border-line bg-surface p-5 shadow-[var(--shadow)]">
        <p className="eyebrow">Allowance left</p>
        <p className={`display text-4xl font-bold tabular-nums ${left < 0 ? "text-bad" : ""}`}>{peso.format(left)}</p>
        <p className="text-sm text-muted">of {peso.format(allowance)} · {peso.format(allowance - left)} spent</p>
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

      {me.role === "housemate" && !past && rows.length > 0 && (
        <Section title="Log spending">
          <form action={logSpend} className="grid gap-2 sm:grid-cols-2">
            <select name="category" required aria-label="Category" className={input}>{rows.map((r) => <option key={r.category_id} value={r.category_id}>{r.name}</option>)}</select>
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
                <span className="block truncate text-xs text-muted">{s.spent_on}{s.note ? ` · ${s.note}` : ""}</span>
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
                  <summary className="flex cursor-pointer items-center gap-3"><span className="min-w-0 flex-1 truncate font-semibold">{r.name}</span><span className="text-sm text-muted tabular-nums">{peso.format(Number(r.monthly_amount))}</span></summary>
                  <form action={saveCategory} className="mt-2 flex flex-wrap gap-2">
                    <input type="hidden" name="id" value={r.category_id} />
                    <input name="name" defaultValue={r.name} required maxLength={40} aria-label="Category name" className={`${input} min-w-0 flex-1`} />
                    <input name="amount" type="number" inputMode="decimal" min="0" step="0.01" defaultValue={r.monthly_amount} required aria-label="Monthly amount" className={`${input} min-w-0 w-32! shrink-0`} />
                    <SubmitButton className={ghost} pendingText="…">Save</SubmitButton>
                    <SubmitButton name="active" value="0" className={ghost} pendingText="…">Archive</SubmitButton>
                  </form>
                </details>
              </li>
            ))}
          </ul>
          <form action={saveCategory} className="flex gap-2 border-t border-line pt-3">
            <input name="name" required maxLength={40} placeholder="New category" aria-label="Category name" className={`${input} min-w-0 flex-1`} />
            <input name="amount" type="number" inputMode="decimal" min="0" step="0.01" required placeholder="PHP / month" aria-label="Monthly amount" className={`${input} min-w-0 w-32! shrink-0`} />
            <SubmitButton className={ghost} pendingText="…">Add</SubmitButton>
          </form>
        </Section>
      )}
    </AppShell>
  );
}
