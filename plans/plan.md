# Feature batch plan

Living status of the admin/housemate feature batch started 2026-10-25. **All 7 milestones merged on 2026-10-25.** Claude updates this file as each milestone moves.
Every UI change gets a screenshot in chat for approval before its PR.

Status key: ✅ merged · 🔵 PR open · 🟡 in progress · ⚪ not started

| # | Milestone | Status | PR |
|---|---|---|---|
| M1 | Admin layout: Award/penalty under Inbox, Recent scores removed, History capped at 10 + See more modal | ✅ merged | [#30](https://github.com/jorgePaguirigan/apartment-managing-app/pull/30) |
| M2 | Housemates card with red Remove (soft remove, history kept) | ✅ merged | [#31](https://github.com/jorgePaguirigan/apartment-managing-app/pull/31) |
| M3 | Delete a catalog deed (not hide) | ✅ merged | [#32](https://github.com/jorgePaguirigan/apartment-managing-app/pull/32) |
| M4 | Catalog groups, drag and drop between groups, Add group, 20-row cap + See more; Delete inside Edit | ✅ merged | [#33](https://github.com/jorgePaguirigan/apartment-managing-app/pull/33) |
| M5 | Housemate "Available chores": claim any unassigned chore any time; admin schedule updates | ✅ merged | [#34](https://github.com/jorgePaguirigan/apartment-managing-app/pull/34) |
| M6 | Marshmallow figures on/off toggle (both sides) | ✅ merged | [#35](https://github.com/jorgePaguirigan/apartment-managing-app/pull/35) |
| M7 | Polish pass: hover/press motion audit, worst-case data, reviews | ✅ merged | [#36](https://github.com/jorgePaguirigan/apartment-managing-app/pull/36) |

## Follow-ups (branch `catalog-row-layout`)
| Change | Status |
|---|---|
| Catalog rows: bigger points, Edit under the name, tall six-dot grip | 🔵 in PR |
| Reorder groups with up/down arrows on each header (replaced group dragging); `deed_group.position` | 🔵 in PR |
| Housemate "I did…" cards grouped by catalog group, in the admin's order; ungrouped under Other | 🔵 in PR |
| Ungrouped no longer gray (it was drawn as "being dragged"); stays fixed last by design | ✅ fixed |
| Deed drops keep a local order while saving, so nothing replays | 🔵 in PR |
| Housemates set their own "I did…" group order with the same arrows, saved to their account (`member_group_order`), never changing the admin's catalog | 🔵 in PR |

## Decisions made
- Housemates can claim (dib) chores any time before the chore's week ends, not only Thursday to Saturday. The fair-share cap stays.
- A removed housemate keeps their history (role `removed`); they cannot rejoin yet.
- Deleting a deed keeps past entries and points (deed stamped `deleted_at`).
- Groups can be added, not renamed or deleted (not requested).
- Database changes are pushed to hosted Supabase only with your OK, before the PR merges.

## M7 detail
- Motion audit: hover tint on catalog and Available chores rows (like History), History "Delete…" confirm slides in.
- Worst case: no sideways scroll at 375px; long group names now wrap.
- Code review of the whole batch found 8 issues; 7 fixed:
  - Release only before Sunday's handout (it let a housemate push a chore onto someone else mid-week).
  - Removed housemates show no medals, and nobody inherits their MVP.
  - Drag handle no longer leaves a row draggable after an aborted press.
  - Remove housemate uses the same confirm as Delete deed.
  - One household lookup helper; hidden figures stop walking.
- Skipped: Home's chore list locks the household row twice per load (shared with the schedule page; not worth changing now).

## Skills used so far
- `pstack:poteto-mode` routes the work.
- `animate` sets modal timing and curves.
- `emil-design-eng` styles the destructive buttons and confirms.
- `apple-design` shapes the drag lift, drop target and settle.
- `mattpocock-skills:tdd` writes each SQL rule test-first.
- `animate` (again for M6) sets the figures' fade out and in.
- `find-animation-opportunities` audits the new UI's motion (M7).
- `code-review` reviews the whole batch (M7).
