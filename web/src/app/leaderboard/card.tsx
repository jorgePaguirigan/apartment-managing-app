"use client";

import { useState, useTransition, type ReactNode } from "react";
import { PERIODS, type Period } from "@/lib/period";
import { memberHistory } from "../actions";
import { HistoryList, type HistoryRow } from "../_components/history-list";
import { Icon } from "../_components/ui";

// A leaderboard card. Pressing it folds open that housemate's history for the period on show, fetched on every open. A change of period closes it.
export function LeaderCard({ id, period, lead, delay, timeZone, children }: { id: string; period: Period; lead: boolean; delay: number; timeZone: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<HistoryRow[] | null>(null);
  const [loading, start] = useTransition();
  const [shown, setShown] = useState(period);
  if (shown !== period) { // rows belong to one period: a new period folds the card shut and drops them
    setShown(period); setOpen(false); setRows(null);
  }
  const toggle = () => {
    setOpen(!open);
    if (!open) start(async () => setRows(await memberHistory(id, period)));
  };
  return (
    <li data-flip-id={id} style={{ animationDelay: `${delay}ms` }}
      className={`rise rounded-3xl transition-shadow duration-200 [@media(hover:hover)]:hover:shadow-[0_10px_28px_-14px_rgb(0_0_0/0.35)] ${lead ? "on-accent bg-accent text-[#16171b]" : "border border-line bg-surface shadow-[var(--shadow)]"}`}>
      <button type="button" aria-expanded={open} data-open={open} onClick={toggle}
        className={`flex w-full items-center gap-3 rounded-3xl p-4 text-left transition-transform duration-150 ease-out active:scale-[0.985] ${lead ? "sm:p-5" : ""}`}>
        {children}
        <Icon name="chevron" className={`turn size-5 ${lead ? "opacity-60" : "text-muted"}`} />
      </button>
      <div className="fold" data-open={open} inert={!open}>
        <div className="px-4 sm:px-5">
          <div className={`mb-4 border-t border-line pt-3`}>
            {rows ? (
              <div className={`transition-opacity duration-150 ${loading ? "opacity-50" : ""}`}>
                <HistoryList rows={rows} timeZone={timeZone} empty={`No points ${PERIODS[period].toLowerCase()}.`} />
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
