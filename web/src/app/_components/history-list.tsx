import { deleteEntry } from "../actions";
import { Chip, Icon, ghost } from "./ui";
import { SeeMore } from "./see-more";
import { SubmitButton } from "./submit-button";

export type HistoryRow = {
  id: string;
  title: string;
  at: string; // ISO time
  note: string | null;
  status: "pending" | "accepted" | "rejected" | "awarded";
  points: number | null; // null: a custom claim still waiting for points
  who?: string; // shown on the admin side
  entryId?: string; // admin side: the score entry behind the row, so it can be deleted
};

const STATUS = {
  pending: { tone: "warn", label: "Waiting" },
  accepted: { tone: "ok", label: "Approved" },
  rejected: { tone: "bad", label: "Not approved" },
  awarded: { tone: "muted", label: "By admin" },
} as const;

const CAP = 10;

// Shared by the housemate and admin screens. Shows the first 10; the rest open in a modal. Times are in the household time zone.
export function HistoryList({ rows, timeZone, empty }: { rows: HistoryRow[]; timeZone: string; empty: string }) {
  if (!rows.length) return <p className="text-sm text-muted">{empty}</p>;
  return (
    <>
      <Rows rows={rows.slice(0, CAP)} timeZone={timeZone} />
      {rows.length > CAP && <SeeMore title="History" total={rows.length}><Rows rows={rows} timeZone={timeZone} /></SeeMore>}
    </>
  );
}

function Rows({ rows, timeZone }: { rows: HistoryRow[]; timeZone: string }) {
  const when = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  return (
    <ul className="divide-y divide-line">
      {rows.map((c) => (
        <li key={c.id} className="-mx-2 rounded-xl px-2 py-3 transition-colors duration-150 first:pt-0 last:pb-0 [@media(hover:hover)]:hover:bg-surface-2/60">
          <div className="flex items-center justify-between gap-3">
            <span className="min-w-0">
              <span className="block truncate font-semibold">{c.who ? `${c.who} · ${c.title}` : c.title}</span>
              <time dateTime={c.at} className="block text-xs text-muted">{when.format(new Date(c.at))}</time>
              {c.note && <span className="block truncate text-sm text-muted">{c.note}</span>}
            </span>
            <span className="flex shrink-0 flex-col items-end gap-1">
              <Chip tone={c.points !== null && c.points < 0 ? "bad" : c.status === "accepted" || c.status === "awarded" ? "points" : "muted"}>
                {c.points === null ? "Points TBD" : `${c.points > 0 ? "+" : ""}${c.points} pts`}
              </Chip>
              <Chip tone={STATUS[c.status].tone}>
                {c.status === "accepted" && <Icon name="check" className="size-3.5" />}
                {STATUS[c.status].label}
              </Chip>
            </span>
          </div>
          {c.entryId && (
            <details className="mt-1">
              <summary className="cursor-pointer text-xs text-muted transition-colors duration-150 hover:text-ink">Delete…</summary>
              <form action={deleteEntry} className="mt-2 flex items-center gap-2">
                <input type="hidden" name="entry" value={c.entryId} />
                <p className="flex-1 text-xs text-muted">Hides it from totals. Kept for audit.</p>
                <SubmitButton className={ghost} pendingText="…">Confirm delete</SubmitButton>
              </form>
            </details>
          )}
        </li>
      ))}
    </ul>
  );
}
