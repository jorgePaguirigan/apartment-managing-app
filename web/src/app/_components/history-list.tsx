import { Chip, Icon } from "./ui";

export type HistoryRow = {
  id: string;
  title: string;
  at: string; // ISO time
  note: string | null;
  status: "pending" | "accepted" | "rejected";
  points: number | null; // null: a custom claim still waiting for points
  who?: string; // shown on the admin side
};

const STATUS = {
  pending: { tone: "warn", label: "Waiting" },
  accepted: { tone: "ok", label: "Approved" },
  rejected: { tone: "bad", label: "Not approved" },
} as const;

// Shared by the housemate and admin screens. Times are shown in the household time zone.
export function HistoryList({ rows, timeZone, empty }: { rows: HistoryRow[]; timeZone: string; empty: string }) {
  const when = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  return (
    <ul className="divide-y divide-line">
      {rows.map((c) => (
        <li key={c.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
          <span className="min-w-0">
            <span className="block truncate font-semibold">{c.who ? `${c.who} · ${c.title}` : c.title}</span>
            <time dateTime={c.at} className="block text-xs text-muted">{when.format(new Date(c.at))}</time>
            {c.note && <span className="block truncate text-sm text-muted">{c.note}</span>}
          </span>
          <span className="flex shrink-0 flex-col items-end gap-1">
            <Chip tone={c.status === "accepted" ? "points" : "muted"}>{c.points === null ? "Points TBD" : `${c.points > 0 ? "+" : ""}${c.points} pts`}</Chip>
            <Chip tone={STATUS[c.status].tone}>
              {c.status === "accepted" && <Icon name="check" className="size-3.5" />}
              {STATUS[c.status].label}
            </Chip>
          </span>
        </li>
      ))}
      {!rows.length && <li className="text-sm text-muted">{empty}</li>}
    </ul>
  );
}
