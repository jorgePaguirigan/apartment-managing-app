# Feature batch plan

## Current batch: calendar-style schedule (started 2026-11-02)

Plan written 2026-11-02, waiting for approval. One branch per milestone, from an up-to-date main (PR 74 is merged). Each UI milestone stops for your approval of the screenshots. No hosted `supabase db push` without your OK.

Status key: ✅ merged · 🔵 PR open · 🟡 in progress · ⚪ not started

| # | Milestone | Branch | Status | PR |
|---|---|---|---|---|
| S1 | Page can no longer scroll sideways past the UI (screenshot 3) | `fix-page-overscroll` | ✅ merged | [76](https://github.com/jorgePaguirigan/apartment-managing-app/pull/76) |
| S2 | Board flipped: columns = days, rows = housemates | `board-days-as-columns` | ✅ merged | [77](https://github.com/jorgePaguirigan/apartment-managing-app/pull/77) |
| S3 | Chores table removed; pressing a cell opens a checkbox popup of catalog chores; card text row gone with the table | `cell-chore-popup` | 🟡 in progress | |

### Found in the code
- Item 1 (the line under the chore title, e.g. "Thursday · Laundry area") exists only in the Chores table (`chores-card.tsx`). Item 2 removes that table, so item 1 is done by S3 and needs no separate change.
- The board (`schedule/board.tsx`) has housemates as columns and Sun to Sat as rows, drag and drop already works per cell (`onDrop` -> `assign_chore`).
- A chore is recurring (one deed + one weekday); a card is that chore's instance for one week. Today the only way to add a chore is `add_chore_from_deed(deed, weekday)` from the Chores card; it does not pick a person.

### Decisions (defaults I propose; change any)
- Popup list = active good deeds of the catalog, one column, checkbox on the left, name and points.
- Pressing an unchecked deed adds it on that cell's day and assigns this week's card to that cell's housemate (Unassigned row: left unassigned). The popup stays open so several can be ticked; Esc, outside click or Done closes it.
- Your answers: the popup always lists every catalog chore and never removes one. A chore already in this cell shows ticked and does nothing when pressed. A chore already on that day in another cell is shown disabled with who holds it (a deed is on a day once).
- Your answers: the chore recurs weekly; only the viewed week's card goes to the person you picked. A points-based allocation (least points gets most chores, champions counted) is a later batch; not built here.
- Consequence to know: with the Chores table gone, nothing in the app removes a chore from the schedule any more (cards can be dragged, not deleted). Say if you want a remove control later; I did not add one.
- Past days and locked cards: cell does not open the popup (same rule as drag).
- Not scored: admin who is not a housemate has no row.

### S1 plan
- Reproduce in the browser first (page gets wider than the viewport); find the element that overflows; fix the cause, not `overflow-x: hidden` on body unless that is the cause. Check phone width.
- Test: scripted Playwright check that `document.documentElement.scrollWidth <= innerWidth` on /schedule at phone and desktop width. Files: `globals.css` or the culprit, `web/e2e/`.

### S2 plan
- Transpose `board.tsx`: header = day (Sun 18 + Today chip + lock), row header = housemate (avatar, You chip). Drag, drop, locked days, menus unchanged. Horizontal scroll stays inside the board with a sticky first column.
- Test: Playwright asserts the headers are days and the rows are housemates, and a drop still moves a card.

### S3 plan
- **Docs first:** PRD 5.1 (the Chores card is replaced by the cell popup) and GLOSSARY.
- **Backend:** `add_chore_to_cell(p_deed, p_weekday, p_member, p_week_start)`: admin only; adds or reactivates the chore (same rules as `add_chore_from_deed`), makes sure this week's card exists, assigns it from today on (same rule as `assign_chore`, so no scored admin rule is broken). `add_chore_from_deed` is dropped if nothing else calls it.
- **Test first (pgTAP):** adding to a cell creates the chore and the card assigned to that person; a past day is refused; a housemate cannot call it; a deed already on that day is refused; an admin who is not a housemate cannot be the assignee.
- **UI:** a `<dialog>`-style popover anchored to the cell (Google Calendar feel): scale+fade from the cell (transform-origin at the cell), 180 ms strong ease-out, exit faster; rows with a custom checkbox (check draws in), hover tint, press scale(0.98), focus ring, arrow keys and Space, Esc to close, focus returns to the cell; on a phone it becomes a bottom sheet. Hover behind `(hover: hover)`, reduced motion respected, dark and light checked. `ChoresCard` and its CSS deleted.
- **Test (UI):** Playwright on the local app: click a cell, tick a deed, the card shows in that cell; untick, it goes; drag still works; no Chores table.
- Files: `PRD.md`, `GLOSSARY.md`, one migration, `supabase/tests/cell_chore.test.sql`, `schedule/board.tsx`, new `schedule/cell-popup.tsx`, delete `chores-card.tsx`, `page.tsx`, `actions.ts`, `globals.css`, `web/e2e/cell-popup.spec.ts`.

### Skills I plan to use
- **grilling, domain-modeling:** the two rule questions and PRD wording (S3).
- **tdd, blast-radius:** pgTAP red first; callers of `add_chore_from_deed`, the board and Home list.
- **diagnosing-bugs:** S1, reproduce first.
- **emil-design-eng, animate, apple-design, animation-performance, find-animation-opportunities:** popover open/close, checkbox, hover and press.
- **ui-ux-pro-max, mobile-native, break-ui, better-icons:** popup layout, bottom sheet on phones, long names and zero deeds.
- **run, code-review (you asked for it after implementation), pr:** local check, review, PR text.

### Order and not checked
1. S1, 2. S2, 3. S3, then code-review over the three. Not checked yet: `ios/`; hosted data (S3 needs a migration pushed to hosted only with your OK).

## Previous batch: Chores card built from the catalog (started 2026-11-01)

Plan written 2026-11-01, waiting for approval. Branch `chores-from-catalog`, from main (PRs 71 to 73 merged; the three migrations are on hosted since 2026-11-01). UI milestone: stops for your approval of the screenshots. No hosted `supabase db push` without your OK.

Status key: ✅ merged · 🔵 PR open · 🟡 in progress · ⚪ not started

| # | Milestone | Branch | Status | PR |
|---|---|---|---|---|
| C1 | Chores card: no input fields; upper part = scheduled chores with Remove; lower part = catalog deeds not on the schedule with Add; PRD, glossary, pgTAP | `chores-from-catalog` | 🔵 PR open | [74](https://github.com/jorgePaguirigan/apartment-managing-app/pull/74) |

### Decisions (defaults I proposed; you re-sent the request without changing them, so I treat them as accepted; change any)
- The catalog is the deed catalog (good, active deeds). A catalog deed is a candidate chore; its points are the chore's points.
- Add puts the deed on the schedule on one day, picked on its lower card (Sun to Sat, default today's weekday). The upper list shows one card per scheduled chore (deed + day).
- A deed leaves the lower list once any of its days is scheduled (lower = catalog minus schedule). To put a deed on another day, remove it and add it again; the board's day menu moves a card within its week only.
- The area is the deed's catalog group name (none if ungrouped). Nothing is typed.
- Remove deactivates the chore: it leaves the upper list and the board, back in the lower list. History and scores are untouched. Re-adding the same deed on the same day reactivates the old chore, so its round-robin queue history is kept.
- Chores with no deed can no longer be created; old ones show with 0 points and Remove.

### Found in the code
- The Chores card (`web/src/app/schedule/page.tsx`) has a form with inputs (name, area, weekday, deed) and a list with Remove; saving goes through `upsert_chore`.
- Remove already deactivates a chore; the board only shows instances of active chores, so removal reaches the kanban board. Add has no catalog link yet.

### C1 plan
- **Docs first:** PRD 5.1 (chores come from the catalog, add and remove) and GLOSSARY.
- **Backend:** `add_chore_from_deed(p_deed, p_weekday)`: admin only, deed must be an active good deed of the household, name from the deed, area from its group, reactivates an inactive chore of the same deed and day, refuses a day already scheduled. `remove_chore(p_chore)`: admin only, sets inactive. `upsert_chore` stays for compatibility until nothing calls it, then is dropped in the same migration.
- **Test first (pgTAP):** add creates a chore with the deed's name, area and points; adding the same deed and day twice is refused; remove then add reactivates the same chore (same id); a housemate cannot call either; an inactive or penalty deed cannot be added.
- **UI:** Chores card with two parts, "On the schedule" (cards with Remove) and "From the catalog" (cards with a day picker and Add). Icons (plus, minus/x, calendar). A card that moves between the parts slides and fades (transform and opacity, 200 ms, strong ease-out, using the existing `FlipList`/`rise` helpers where they fit); hover lift, press scale(0.97), unhover eases back; hover gated by `(hover: hover)`, reduced motion respected; empty states for both parts; dark mode and phone width; long names and zero deeds checked (break-ui).
- **Test (UI):** Playwright on the local app: add a catalog deed, it appears in the upper part and on the board; remove it, it leaves both and returns to the lower part; no input fields in the card.
- **Files:** `PRD.md`, `GLOSSARY.md`, one migration, `supabase/tests/chores_catalog.test.sql`, `web/src/app/schedule/page.tsx` (new `chores-card.tsx`), `web/src/app/actions.ts`, `web/src/app/globals.css`, `web/e2e/chores-card.spec.ts`.

### Skills I plan to use
- **grilling, domain-modeling:** the rules above and the wording in the PRD and glossary.
- **tdd, blast-radius:** pgTAP red first; callers of `upsert_chore`, the board and the Home list.
- **emil-design-eng, animate, apple-design, find-animation-opportunities, animation-performance:** the move between the two parts, hover and unhover, no lag.
- **ui-ux-pro-max, better-icons, mobile-native, break-ui:** card layout, icons, phone width, worst-case data.
- **run, code-review, pr:** local check, review, PR text.

### Order and not checked
1. Wait for PR 71 and PR 72 to merge (or build on top of them), 2. C1 then screenshots, then your approval, then merge.
- Not checked yet: `ios/`; hosted data (no migration is pushed without your OK; this one needs the earlier two first).

## Previous batch: chore points instead of weights (started 2026-11-01)

Branch `chore-points`, stacked on `schedule-board-motion` (PR 71, approved, not merged yet; both touch `board.tsx`). No merge until you say so.

| # | Milestone | Branch | Status | PR |
|---|---|---|---|---|
| P1 | Remove chore weight; a chore's points are its deed's points; fair share, allocation and cards use points; PRD, glossary, pgTAP | `chore-points` | 🟡 in progress | |

### Decisions made (your answers)
- Points are taken from the linked deed, no number of their own. A chore without a deed is worth 0 points.
- Old weights are not copied: chores already linked to a deed take its points. Chores with no deed become 0 points (your "default 5 for those" answer cannot be stored without a number of their own; say if you want a points field after all).
- Also fixed: `pg_temp.patch` was created twice in a fresh `supabase db reset` (E1 migration); both new migrations use `create or replace`.

### Not checked
- `ios/`; the claim-email edge function (no weight in it); hosted data.

## Previous batch: admin edits the schedule from today on (started 2026-11-01)

Plan written 2026-11-01, waiting for approval. Each milestone branches from an up-to-date `main`. E2 is UI and stops for your approval of the screenshots. No hosted `supabase db push` without your OK.

Status key: ✅ merged · 🔵 PR open · 🟡 in progress · ⚪ not started

| # | Milestone | Branch | Status | PR |
|---|---|---|---|---|
| E1 | Edit rule by day: today and later can be moved, yesterday and before cannot; a card can also move to another day of its week; PRD, glossary, pgTAP | `edit-schedule-from-today` | ✅ merged | [70](https://github.com/jorgePaguirigan/apartment-managing-app/pull/70) |
| E2 | Board: locked past days, drag and drop motion, hover and press feedback, no extra load time; screenshots | `schedule-board-motion` | 🔵 PR open | [71](https://github.com/jorgePaguirigan/apartment-managing-app/pull/71) |

### Decisions made (defaults, change any)
- The line is the day, not the week: a card on a day before today (household time zone) is locked; today and later are editable, in this week and next.
- A card stays on its own weekday; only who does it changes (as now). Moving it to another day is not asked for, so not built.
- A card already marked done (claim filed) stays locked, even today (as now).
- Moving today's card changes the housemate's schedule at once; no new notification (not asked).

### Answer received during E1
- Snap-back: you dropped on another person on the same day and on other days. Same-day drop on another person works on the local database (Playwright run), so that part is not reproduced; dropping on another day snapped back by design (a card could only change person). E1 adds the day move. If a same-day drop still fails on hosted, I need the red error banner text.
- New: `chore_instance.weekday` is a per-week day override; `assign_chore` takes `p_weekday`; `available_chores` shows the moved day.

### Found in the code
- `assign_chore` (SQL) blocks by week only: it refuses once `week_start + 7` has passed. So SQL already lets the current week through; the snap-back is not explained by that rule. Cause not reproduced yet; E1 reproduces it first (diagnosing-bugs), in the local app.
- The board's `movable` is per week (`phase !== "past"`), and the page only ever knows "this week" or "next week". No per-day lock exists.
- Business rules live in SQL; the board must not decide "today" itself.

### E1: rule and bug
- **Docs first:** PRD 5.2/5.3 ("the schedule is final for the week apart from admin moves"): admin moves allowed from today, locked before. GLOSSARY entry.
- **Backend:** `assign_chore` refuses when the chore's day (`week_start + weekday % 7`) is before today in the household zone. New small SQL function `schedule_today()` returns today's date in that zone so the page can mark locked days without redoing time math in the client.
- **Test first (pgTAP):** moving yesterday's card fails; today's and tomorrow's work, in the current week; a done card still fails. Red before the migration.
- **Bug:** reproduce the snap-back with a scripted browser on a second dev server on the local database; fix its root cause (could be a server error swallowed after the optimistic update, a stale page, or data).
- **Files:** `PRD.md`, `GLOSSARY.md`, one migration, `supabase/tests/scheduling.test.sql`, `web/src/app/actions.ts`, `web/src/app/schedule/page.tsx`.

### E2: board
- **UI:** rows for days before today dim and show a small lock, cards there are not draggable and have no menu. Editable cards: hover lift (translateY -1px, shadow), grab cursor, press scale(.98); lifted card while dragging; drop column tint with a 150 ms fade; the dropped card settles with a short transform/opacity ease-out. Hover gated by `@media (hover: hover)`, reduced motion respected, `transform` and `opacity` only, phone width and dark mode checked.
- **No lag:** cards grouped once per render (not 7 x columns filters), `today` comes with the page data (no extra round trip), no new client library, no animation on keyboard or menu changes.
- **Test:** Playwright on the local app: a yesterday card is not draggable, today's card moves to another housemate and stays after reload, the housemate sees it. A timing check beside `speed.spec.ts`.
- **Files:** `web/src/app/schedule/board.tsx`, `page.tsx`, `web/e2e/schedule-edit.spec.ts`.

### Skills I plan to use
- **domain-modeling:** PRD and glossary wording (E1).
- **tdd:** pgTAP red first (E1).
- **diagnosing-bugs:** reproduce and fix the snap-back (E1).
- **blast-radius:** callers of `assign_chore`; what a new "today" check breaks at midnight and on the hosted shifted data (E1).
- **emil-design-eng, animate, apple-design, ui-ux-pro-max, animation-performance:** the board motion, drag feel and no-lag check (E2).
- **run, code-review, pr:** local check, review, PR text.

### Order and not checked
1. E1 then merge, 2. E2 then merge. E1 needs a hosted migration; I ask before `supabase db push`.
- Not checked yet: `ios/` (no schedule screen), the real cause of the snap-back, a page left open across midnight (the server refuses, the board shows the error banner).

## Previous batch: weeks start on Sunday (started 2026-11-01)

Plan written 2026-11-01, waiting for approval. Each milestone branches from an up-to-date `main`. W2 is UI and stops for your approval of the screenshots. No hosted `supabase db push` without your OK.

Status key: ✅ merged · 🔵 PR open · 🟡 in progress · ⚪ not started

| # | Milestone | Branch | Status | PR |
|---|---|---|---|---|
| W1 | One Sunday-week rule in SQL for scores: leaderboard, history, medals, emails; docs; pgTAP | `sunday-weeks-scores` | ✅ merged | [67](https://github.com/jorgePaguirigan/apartment-managing-app/pull/67) |
| W2 | Chore schedule on Sunday weeks: columns Sun to Sat, hand-out at week start, existing instances shifted; screenshots | `sunday-weeks-schedule` | ✅ merged | [68](https://github.com/jorgePaguirigan/apartment-managing-app/pull/68) |

### Decisions made
- Everything moves, not only scores (your answer): leaderboard, medals, history, emails, and the chore schedule.
- Medals are recomputed on the new weeks, past included. Nothing is stored, so no data changes.
- Unclaimed chores are handed out at Sunday 00:00, which is now the start of the week itself (before: the Sunday before a Monday week). Dibs stay open until the week ends; release stops at Sunday 00:00 of its week.
- Today is Sunday 2026-11-01, so a new week starts today: "This week" is empty until the first entry today, and "Previous week" holds Sun 25 Oct to Sat 31 Oct.

### Found in the code
- Weeks come from `date_trunc('week', …)`, which is Monday in Postgres. It is repeated in about 10 functions: `leaderboard`, `member_history`, `period_snapshot` and medals (`notifications`), `generate_week`, `schedule_week`, `reports`, `remove_housemate`, `week_phase`, `dib_window_open`, release (`review_fixes`).
- `chore.weekday` is 1 = Monday to 7 = Sunday, and `chore_instance.week_start` is a Monday.
- The web schedule board has Monday-first columns and hard-coded "handed out Sunday 00:00" text. iOS has no schedule or leaderboard code yet. Not checked in detail: `ios/`.

### W1: scores
- **Docs first:** PRD line 16 and GLOSSARY "Period" say Sunday to Saturday.
- **Moved to W2:** `reports` and `remove_housemate` compare against `chore_instance.week_start`, so they change with the schedule.
- **Backend:** one SQL function `period_start(unit, timestamp)` (was planned as `week_start`) = `date_trunc('week', t + 1 day) - 1 day` in a new migration; every `date_trunc('week', …)` above calls it. Functions are re-created with `create or replace`, same bodies otherwise.
- **Test first:** pgTAP: an entry at Sunday 00:00 (household zone) counts in the new week; one at Saturday 23:59 stays in the old. Also medals: two entries on a Saturday and the next Sunday count as two different weeks, which fails today.
- **UI:** none. The leaderboard reads from SQL.
- **Files:** `PRD.md`, `GLOSSARY.md`, one new migration, `supabase/tests/sunday_weeks.test.sql`, edits to tests that pin Monday dates.

### W2: schedule
- **Backend:** `schedule_week` and `generate_week` accept Sundays; `week_phase`, `dib_window_open` and release shift one day (hand-out at `week_start`, not `week_start - 1`). Day of an instance is `week_start + weekday % 7`, so chore weekdays (1 = Monday) are not renumbered. A data step moves each existing `week_start` back one day. Caveat: an old Sunday chore dated the last day of its old week moves to the first day of the shifted week.
- **UI:** board columns Sun to Sat (weekday order 7, 1 to 6), copy "handed out Sunday 00:00" stays true as week start, weekday picker lists Sunday first. Hover and press feedback unchanged.
- **Test:** pgTAP for the new boundaries (the existing `scheduling.test.sql` dates move to Sundays); a Playwright run on the local app asserting column order and that today's column is highlighted.
- **Files:** one migration, `supabase/tests/scheduling.test.sql`, `web/src/app/schedule/page.tsx`, `board.tsx`, `housemate-view.tsx` if it assumes Monday.

### Result (2026-11-01)
- Both migrations are applied to hosted (`supabase db push`, your OK) and both PRs are merged.
- **Skills used:** W1: domain-modeling, tdd, pr. W2: emil-design-eng, apple-design, ui-ux-pro-max, pr.
- **Not run:** blast-radius, code-review, diagnosing-bugs. I read the live function bodies instead.
- **Not checked:** `ios/`; the other Playwright specs; the hosted schedule after the one-day shift (not looked at by eye).
- **Decisions you may want to change:** the admin's chore list below the board still sorts Monday first; hosted old Sunday-weekday chores moved to the start of their shifted week.

### Skills I planned to use
- **domain-modeling:** update the PRD and glossary first.
- **tdd:** pgTAP red first for each rule.
- **blast-radius:** check every caller of the week functions, and iOS.
- **diagnosing-bugs:** only if a medal or phase test breaks unexpectedly.
- **emil-design-eng, apple-design, ui-ux-pro-max:** the board column change (W2).
- **run, code-review, pr:** local check, review, PR text.

### Order and not checked
1. W1 then merge, 2. W2 then merge. The hosted database needs both migrations pushed together, after your OK; between W1 and W2 the app would show scores on Sunday weeks and chores on Monday weeks, so I would not push W1 alone.
- Not checked yet: the hosted schedule data, iOS, and the claim-email edge function's reading of week fields (`render.ts` only reads labels).

## Previous batch: all phone and tablet sizes, slow page loads (started 2026-10-31)

Plan written 2026-10-31, waiting for approval. One branch and PR per milestone, each branched from an up-to-date `main` (not from `see-more-hidden-count`, whose PR is still open). A UI milestone stops for your approval of the screenshots. No hosted `supabase db push` or deploy without your OK.

Status key: ✅ merged · 🔵 PR open · 🟡 in progress · ⚪ not started

| # | Milestone | Branch | Status | PR |
|---|---|---|---|---|
| S1 | Phones (320 to 430 wide, portrait and landscape) fit and work; screen-check test; screenshots | `fit-phones` | 🔵 PR open, waiting for your UI approval | [64](https://github.com/jorgePaguirigan/apartment-managing-app/pull/64) |
| S2 | Tablets (744 to 1366 wide, portrait and landscape) fit and work; same test extended; screenshots | `fit-tablets` | 🔵 PR open, waiting for your UI approval | [65](https://github.com/jorgePaguirigan/apartment-managing-app/pull/65) |
| L1 | Diagnose the 15 s and 20 s page loads; report causes and fixes; **stop and wait for your pick** | none (report only) | ✅ reported; you picked fixes 1, 2 and 3 | |
| L2 | Implement the fixes you pick | `faster-page-loads` | 🔵 PR open, waiting for your UI approval | [66](https://github.com/jorgePaguirigan/apartment-managing-app/pull/66) |

### Decisions made
- Feature 1 is split into phones then tablets so each PR stays small and reviewable.
- Feature 2 is diagnosed only after feature 1 is done. L2 does not start until you answer L1.
- No PRD or GLOSSARY change: nothing here changes a rule or a role.

### Device list (viewport in CSS pixels, width x height)
- **Phones, portrait:** 320x568 (iPhone SE 1st gen, smallest), 360x800 (Android), 375x667 (iPhone SE 2/3), 375x812 (iPhone mini), 390x844 (iPhone 14/15/16), 430x932 (iPhone Pro Max).
- **Phones, landscape:** 667x375, 844x390, 932x430.
- **Tablets, portrait:** 744x1133 (iPad mini), 768x1024 (iPad 9.7), 820x1180 (iPad 10.9), 834x1194 (iPad Pro 11), 800x1280 (Android tablet), 1024x1366 (iPad Pro 12.9).
- **Tablets, landscape:** 1133x744, 1180x820, 1194x834, 1366x1024.
- **Screens per device:** `/login`, landing `/`, housemate home, admin home, `/schedule`, `/budget`, `/leaderboard`, `/decide/[token]`, `/join/[code]`, plus the open modals (catalog See more, claim form, housemate edit).

### S1 and S2: fit every size
- **Found:** the base is mobile-first (`viewportFit: cover`, `100dvh`, `.pad-safe`, a bottom dock under 768px, tabs in the top bar from 768px). But there is one content column (`max-w-4xl`) and almost no tablet layout: only `sm:` utilities, one `md:`, and a single custom breakpoint (900px, landing grid). The 640 to 1100px range was never designed, and phone landscape (about 850x390) is untested.
- **Backend:** none.
- **Test first:** new `web/e2e/screens.spec.ts` runs the device list against the seeded local app and asserts, per screen: no horizontal scroll, nothing visible cut off at the edges, the fixed dock never hides the last item, buttons and links are at least 44px, modals fit the viewport and scroll inside it, no console errors. It also saves a screenshot per device and screen. It fails on today's `main` wherever something is broken, which is the first result reported.
- **UI:** fix what the test finds. Fluid `clamp()` type and spacing, container queries for cards, 2-column grids on tablets, nav tier per width, `dvh` for modals and bars. Motion untouched except that every hover stays behind `(hover: hover)`, presses stay `scale(0.96 to 0.98)` at 150 to 220 ms, reduced motion respected.
- **Screenshots:** one contact sheet per device (all its screens in light), plus individual files; dark mode for the worst screens. Output stays out of git unless you say to commit it.
- **Files:** `web/e2e/screens.spec.ts` (new), `web/src/app/globals.css`, `app-shell.tsx`, `pill-nav.tsx`, `landing.tsx`, `catalog.tsx`, `see-more.tsx`, `admin-view.tsx`, `housemate-view.tsx`, `schedule/*`, `budget/page.tsx`, `leaderboard/*`, `decide/[token]`, `join/[code]`; final list comes from the audit.

### L1 and L2: slow loads
- **L1 (diagnose, report only):** measure first, on the two slow pages, in a production build (`next build` and `start`) and in dev, against local and hosted Supabase. Time each request (server render, each Supabase call, fonts, JS size). Candidates to confirm or rule out: sequential Supabase calls (`getMe` then `getHousemates` in `app-shell.tsx` run one after the other, and each page adds its own); one slow query or missing index; dev-server first-compile cost; Google font fetch at build or in dev; client round-trip distance to the hosted database; whole page blocked on its slowest query with no streaming (`loading.tsx` is only a route-level skeleton); `LiveRefresh` causing refetch storms; large client bundle. I report each real cause with its evidence and the fix for it, then wait.
- **L2 (after your input):** only the fixes you pick. A fix that is a query or index change goes in a migration with a pgTAP test where it adds a rule, and the hosted push waits for your OK. A page-level fix (parallel fetches, Suspense streaming, caching) gets a Playwright check plus a before and after timing.
- **Next.js note:** this Next.js has breaking changes, so I read `node_modules/next/dist/docs/` before touching caching or streaming.

### S1 result (phones)
- **Test:** `web/e2e/screens.spec.ts` (9 phone sizes, 13 screens each, light and dark with `SCREENS_DARK=1`); shared sign-in helpers moved to `web/e2e/helpers.ts`. Screenshots go to `web/screens-out/` (git-ignored), one contact sheet per device in `sheets-screens` and `sheets-screens-dark`.
- **Bugs it found and fixed:**
  - The admin home was about 720px wide on every portrait phone: a one-column grid could not shrink below the invite link or a long name. `grid-cols-1` on the admin grid, and `overflow-wrap: anywhere` on `body` so any long name or link wraps.
  - Under the dock: `sm:py-8` reset the bottom padding between 640 and 767px (landscape phones), so the dock covered the last content. Now `sm:pt-8` only.
  - Header: on landscape phones the signed-in name had no limit and pushed Sign out off screen. The name and role chip now show from 1024px, and the name truncates.
  - Tap targets: on touch screens every control is at least 44x44 (one `pointer: coarse` rule). The theme switch shows one button that cycles under 640px so the household name keeps room at 320px.
  - Button labels never break mid-word.
- **Skills used:** mobile-native, tdd, emil-design-eng, apple-design, ui-ux-pro-max, pr.
- **Not run:** break-ui, blast-radius, code-review skills (I reviewed the diff by hand; it is 6 source files).
- **Decision to confirm:** 44px targets make some list rows taller on touch screens (catalog rows with "Edit" about 90px in landscape).

### S2 result (tablets)
- **Test:** `screens.spec.ts` now also runs 10 tablet sizes (744 to 1366 wide, portrait and landscape); 19 sizes in all, light and dark. The first run was already green because the phone fixes carry over, so the test was widened first: it now checks every short word on the page for being broken mid-word, not only buttons.
- **Bugs it found and fixed:**
  - Header on landscape tablets: nav labels broke mid-word ("Hom / e", "Schedul / e") and so did the role chip. Nav links and chips never wrap now.
  - Header at 1366px: the household name shrank to three letters. The header and main column grow to `max-w-5xl` from 1280px, and the avatar plus role chip show from 1280px; the signed-in name moved into the avatar's tooltip (it is still in the "Hi, name" greeting).
  - Dock at 320px: the Leaderboard tab was 3px too wide once its label stopped wrapping; the dock pads less under 360px.
- **Skills used:** mobile-native, tdd, emil-design-eng, apple-design, ui-ux-pro-max, pr.
- **Decision to confirm:** I did not add two-column layouts on tablets. Portrait tablets keep the single column (the deed grid is already three across) and landscape tablets keep the admin's two columns. Say if you want more.

### L1 / L2 result (slow pages)
- **L1 finding:** I could not reproduce 15 to 20 seconds, on your hosted database signed in or on an emulated phone. Server time was 0.4 to 3.3 s per page and almost all of it was database calls waiting in a row, so the work became making the site feel faster (your pick: 1, 2 and 3).
- **Numbers (800 ms added to every database call, dev server, local backend):** admin home 3.9 s to 2.4 s for first content (all content 2.8 s); housemate home 2.9 s to 2.4 s; schedule unchanged at 2.9 s.
- **3. Fewer waits:** the shell no longer waits for the housemate list (the figures stream in), the admin page no longer makes a second call for the email schedule, and "Accept all" decides claims together instead of one after another.
- **2. Show the page first:** points, deed buttons, inbox, award, housemates and catalog first; chores, reports, history, invite links and the email schedule stream in behind grey placeholders.
- **1. Instant answers:** tapping a deed, Accept, Reject and Accept all answer before the server does (`useOptimistic`); a refused claim takes the confirmation back. Tests hold the server for 3 s and assert the answer comes within 1 s (`web/e2e/speed.spec.ts`).
- **Not done:** the schedule page still waits 3 times in a row. SQL decides the week and must generate it before it can be read; removing a wait needs a new database function (a migration, and hosted push only with your OK). A new claim also does not appear in History until the server replies.
- **Skills used:** tdd, diagnosing-bugs, apple-design, emil-design-eng, pr.

### Order
S1 (test, then phone fixes), S2 (extend the test, then tablet fixes), L1 (report, wait), L2. S1 and S2 each stop for UI approval.

### Not checked
- No physical devices: sizes are emulated in a desktop browser (Chromium via Playwright). Real iOS Safari quirks (address-bar collapse, notch insets, keyboard) are only partly covered; the iOS Simulator can check Safari on request.
- Live updates, email and hosted cron do not run locally.
- Load times on the hosted backend can only be measured from this machine's network, not from yours.

---

## Previous batch: Catalog See more count (started 2026-10-31)

Plan approved 2026-10-31. One branch and PR per milestone. No migration, so no hosted `supabase db push`.

Status key: ✅ merged · 🔵 PR open · 🟡 in progress · ⚪ not started

| # | Milestone | Branch | Status | PR |
|---|---|---|---|---|
| C1 | "See more" in the Catalog shows only the chores not shown (30 chores, 20 shown: See more (10)) | `see-more-hidden-count` | 🔵 PR open, waiting for your UI approval | [63](https://github.com/jorgePaguirigan/apartment-managing-app/pull/63) |

### Decisions made
- Only the Catalog button changes. The History list uses the same button and still shows its full total; say if you want it changed too.

### C1: See more shows what is hidden
- **Found:** `catalog.tsx` passes `total={view.length}` (every deed) to `SeeMore`, so with 36 deeds and 20 shown it reads "See more (36)". The code already tracks the hidden count: `room` goes negative by exactly the number of deeds past the cap of 20.
- **Backend:** none.
- **UI:** the label only; pass `-room` instead of `view.length`. The button keeps its look, hover and press (`ghost`). The modal still lists the whole catalog.
- **Edge:** deeds in folded groups do not use up the cap, so they are not counted as hidden. The button still appears only when something is hidden.
- **Test:** a Playwright flow that adds deeds past the cap and asserts the label equals total minus 20; it fails today because it shows the total.
- **Files:** `web/src/app/_components/catalog.tsx`, `web/e2e/flow.spec.ts`.

---

## Previous batch: one email per claim (started 2026-10-30)

Plan approved 2026-10-30. Claude updates this table as each milestone moves. One branch and PR per milestone; a UI milestone stops for your approval of the screenshot. Hosted `supabase db push` only with your OK.

Status key: ✅ merged · 🔵 PR open · 🟡 in progress · ⚪ not started

| # | Milestone | Branch | Status | PR |
|---|---|---|---|---|
| E1 | One housemate email per decision: first recipient in `to`, the rest in `cc` | `one-housemate-email` | ✅ merged | [#59](https://github.com/jorgePaguirigan/apartment-managing-app/pull/59) |
| E2 | One admin email per claim submission: first admin in `to`, the rest in `cc`; one shared decision link, the admin picks who they are on the confirm page | `one-admin-email` | ✅ merged | [#60](https://github.com/jorgePaguirigan/apartment-managing-app/pull/60) |

### Decisions made
- The decider is whoever clicks: the confirm page asks "Who are you?" and `decided_by` / `approved_by` record that admin.
- Housemate email uses `cc` as asked, so housemates see each other's addresses (bcc was offered and declined).
- Housemates with the same set of waiting claims share one email; a different set (for example after a retry) gets its own.

### E1: One housemate email
- **Backend:** none. The outbox keeps one row per recipient, so batching and retries stay per person.
- **Sender:** group people with an identical waiting claim set; first is `to`, the rest `cc`. Recipients without an address are left out; the group fails only if nobody has one.
- **Test:** `groupRecipients()` helper in `render.ts` with tests in `render.test.ts` (three housemates, one email; different set, own email; missing address skipped).
- **Files:** `send-notifications/index.ts`, `render.ts`, `render.test.ts`.

### E2: One admin email, decided by whoever clicks
- **Docs first:** PRD 4.7, GLOSSARY (Admin email, Decision link).
- **Backend:** one migration. Token per claim (`issue_decision_token(claim)`, `admin_id` dropped); `admins_for_token(token)` lists the household's admins; `decide_claim_by_token(token, accept, admin)` requires a current admin of that household (42501 otherwise); first decision wins.
- **Sender:** group admin rows by claim, one token, first admin `to`, the rest `cc`.
- **UI:** confirm page "Who are you?" with pressable admin chips; Accept and Reject disabled until one is picked. Hover (gated), press `scale(0.97)`, reduced motion, dark mode, phone width. Screenshots before the PR counts as done.
- **Test:** pgTAP in `decision_links.test.sql` (any admin can use the link, non-admin and other-household admin refused, pick recorded in `decided_by` and `approved_by`, single use, first decision wins) plus a scripted browser run of the picker.
- **Files:** `PRD.md`, `GLOSSARY.md`, new migration, `decision_links.test.sql`, `index.ts`, `render.ts`, `render.test.ts`, `web/src/app/decide/[token]/page.tsx`, `web/src/app/actions.ts`.

### Order
E1, then E2. Both branch from an up-to-date `main`.

### Not checked / skipped
- Real Gmail delivery and the hosted cron do not run locally; only the local mail catcher is used.
- The E2 migration must be pushed to hosted Supabase (ask first) and the sender function redeployed.
- Weakness accepted: anyone holding the link can claim to be any admin.

---

## Previous batch: promote admins, contributors, admin/housemate buttons (2026-10-29)

Plan approved 2026-10-29. Claude updates this table as each milestone moves. One branch and PR per milestone; a UI milestone stops for your approval of the screenshot before the next one starts. Hosted `supabase db push` only with your OK.

Status key: ✅ merged · 🔵 PR open · 🟡 in progress · ⚪ not started

| # | Milestone | Branch | Status | PR |
|---|---|---|---|---|
| F1 | Make a housemate an admin (Edit dropdown per card in the Housemates table) | `make-admin` | 🔵 PR open, waiting for your UI approval | |
| F2 | Contributors dropdown on "I did…" claims | `contributors` | 🔵 PR open, waiting for your UI approval | |
| F3 | Better "I live here too" toggle and admin/housemate view switch | `admin-housemate-buttons` | 🔵 PR open, waiting for your UI approval | |

### Decisions made
- A promoted admin stays scored (`also_housemate` on): keeps points, chores and leaderboard spot.
- Nobody may accept or reject their own claim; another admin must decide it.
- Contributors each get a score entry with the deed's full points when the admin accepts (points are not split). The claimer counts among the contributors, so a claim has at most as many people as the household has housemates.
- F3 covers two buttons: the "I live here too" / "Stop being a housemate" toggle on the admin home, and the avatar button in the top bar that switches views.

### F1: Make admin
- **Docs first:** PRD section 3 (Roles) and the glossary (Admin, Scored member) say an admin can promote a housemate and that a promoted admin stays scored.
- **Backend:** migration `make_admin(p_member)`: admin only, target must be a housemate of this household, sets `role = 'admin'` and `also_housemate = true`. `decide_claim` rejects an admin deciding their own claim.
- **UI:** each Housemates card gets an Edit dropdown with Make admin (confirm step) and Remove; promoted people show an "Admin" tag. Fade/scale open 150–200ms, press `scale(0.96–0.98)`, hover gated by `@media (hover: hover)`, reduced motion respected.
- **Test:** `supabase/tests/make_admin.test.sql` (housemate cannot call it; admin can; promoted person stays on the leaderboard and can decide others' claims, not their own; target must be a housemate in the household) plus a Playwright flow. Type-check and lint.
- **Files:** new migration, the test, `admin-view.tsx`, `actions.ts`, `ui.tsx` (dropdown helper if none), e2e spec.

### F2: Contributors
- **Docs first:** PRD 4.2 and glossary (Contributor).
- **Backend:** table `claim_contributor(claim_id, member_id)`, read-only to clients; `submit_claim` and `submit_custom_claim` take an optional contributor list (scored members of the household, no duplicates, claimer plus contributors at most the number of housemates); `decide_claim` writes one entry per person with the deed's points copied.
- **UI:** Contributors dropdown (checkbox list of housemates, claimer already counted, label "Just me" / "+2 others") in the "I did…" table; contributor names in the admin inbox and the claim emails.
- **Test:** `supabase/tests/contributors.test.sql` (one entry each with full points on accept; none on reject; too many, non-housemate and duplicate refused; later point edits change nothing) plus a Playwright flow. Worst-case names checked with `break-ui`.
- **Files:** new migration, the test, `claim-form.tsx`, `inbox-item.tsx`, `actions.ts`, `supabase/functions/send-notifications`, e2e spec.

### F3: Better admin/housemate buttons
- **UI only, no rules change.** "I live here too" becomes a clear switch-style control with a plain label and a one-line hint of what it does, a pending state, and a confirm before turning it off. The view switch in the top bar shows which view is active, which view it switches to, and slides between the two. Hover lift, press `scale(0.96–0.98)`, transform/opacity only, reduced motion respected, dark mode and phone width checked.
- **Test:** scripted browser run that toggles each button and asserts the label, the view and the saved state, plus type-check and lint.
- **Files:** `page.tsx`, `app-shell.tsx`, `ui.tsx`, e2e spec.

### Order
F1, then F2, then F3 (F3 last because it touches the same admin page; shared dropdown/motion helpers from F1 are reused).

### Not checked / skipped
- No "remove admin" action (not requested).
- Contributors on chore-done claims are out of scope.
- Claim emails cannot run locally; only the template output is tested.

---

## Previous batch (2026-10-25)

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
