# Feature batch plan

## Current batch: promote admins, contributors, admin/housemate buttons (started 2026-10-29)

Plan approved 2026-10-29. Claude updates this table as each milestone moves. One branch and PR per milestone; a UI milestone stops for your approval of the screenshot before the next one starts. Hosted `supabase db push` only with your OK.

Status key: ✅ merged · 🔵 PR open · 🟡 in progress · ⚪ not started

| # | Milestone | Branch | Status | PR |
|---|---|---|---|---|
| F1 | Make a housemate an admin (Edit dropdown per card in the Housemates table) | `make-admin` | 🔵 PR open, waiting for your UI approval | |
| F2 | Contributors dropdown on "I did…" claims | `contributors` | 🔵 PR open, waiting for your UI approval | |
| F3 | Better "I live here too" toggle and admin/housemate view switch | `admin-housemate-buttons` | ⚪ not started | |

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
