"use client";

import { useState, useTransition, type ReactNode } from "react";
import { memberHistory } from "../actions";
import { HistoryList, type HistoryRow } from "../_components/history-list";
import { Icon } from "../_components/ui";

// A leaderboard card. Pressing it folds open that housemate's history, fetched when first opened and again on every reopen.
export function LeaderCard({ id, lead, delay, timeZone, children }: { id: string; lead: boolean; delay: number; timeZone: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<HistoryRow[] | null>(null);
  const [loading, start] = useTransition();
  const toggle = () => {
    setOpen(!open);
    if (!open) start(async () => setRows(await memberHistory(id)));
  };
  return (
    <li data-flip-id={id} style={{ animationDelay: `${delay}ms` }}
      className={`rise rounded-3xl transition-shadow duration-200 [@media(hover:hover)]:hover:shadow-[0_10px_28px_-14px_rgb(0_0_0/0.35)] ${lead ? "bg-accent text-[#16171b]" : "border border-line bg-surface shadow-[var(--shadow)]"}`}>
      <button type="button" aria-expanded={open} data-open={open} onClick={toggle}
        className={`flex w-full items-center gap-3 rounded-3xl p-4 text-left transition-transform duration-150 ease-out active:scale-[0.985] ${lead ? "sm:p-5" : ""}`}>
        {children}
        <Icon name="chevron" className={`turn size-5 ${lead ? "opacity-60" : "text-muted"}`} />
      </button>
      <div className="fold" data-open={open} inert={!open}>
        <div className="px-4 sm:px-5">
          <div className={`mb-4 border-t pt-3 ${lead ? "border-[#16171b]/20" : "border-line"}`}>
            {rows ? (
              <div className={`transition-opacity duration-150 ${loading ? "opacity-50" : ""}`}>
                <HistoryList rows={rows} timeZone={timeZone} empty="No points yet." />
              </div>
            ) : (
              <div aria-busy className="space-y-2" aria-label="Loading history">
                <div className="h-4 w-2/3 animate-pulse rounded bg-current/10" />
                <div className="h-4 w-1/2 animate-pulse rounded bg-current/10" />
              </div>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}
