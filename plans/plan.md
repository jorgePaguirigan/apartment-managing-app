# Feature batch plan

## Current batch: all phone and tablet sizes, slow page loads (started 2026-10-31)

Plan written 2026-10-31, waiting for approval. One branch and PR per milestone, each branched from an up-to-date `main` (not from `see-more-hidden-count`, whose PR is still open). A UI milestone stops for your approval of the screenshots. No hosted `supabase db push` or deploy without your OK.

Status key: ✅ merged · 🔵 PR open · 🟡 in progress · ⚪ not started

| # | Milestone | Branch | Status | PR |
|---|---|---|---|---|
| S1 | Phones (320 to 430 wide, portrait and landscape) fit and work; screen-check test; screenshots | `fit-phones` | 🔵 PR open, waiting for your UI approval | |
| S2 | Tablets (744 to 1366 wide, portrait and landscape) fit and work; same test extended; screenshots | `fit-tablets` | ⚪ not started | |
| L1 | Diagnose the 15 s and 20 s page loads; report causes and fixes; **stop and wait for your pick** | none (report only) | ⚪ not started | |
| L2 | Implement the fixes you pick | `faster-page-loads` | ⚪ not started | |

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
