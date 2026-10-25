# Apartment Manager: PRD

Source of truth for development. Supersedes the Notion page `apartment-managing-app-prd`.
Items marked **[Default]** were not answered by the product owner. They are my proposals, so change them here if wrong.

## 1. Summary

A shared app for housemates to track who contributes to the apartment. Housemates earn points for chores and deeds, a leaderboard ranks them, chores are scheduled around the points, and a simple envelope budget tracks the house allowance.

## 2. Platforms and stack

- Web app (Next.js) and native iOS app (SwiftUI). Both talk to one backend.
- Backend: Supabase (Postgres, Auth, Realtime). Business rules live in the database or in Supabase functions, never duplicated per client. **Stack is decided**: Q8.
- Sign-in: Sign in with Apple and email magic link. No passwords.
- Single household in v1. Every table carries `household_id` so multi-household can come later without a rewrite.
- Currency: PHP only. Time zone: household setting, default `Asia/Manila`. Week runs Monday to Sunday in that zone.

## 3. Roles

| Role | Can do |
|---|---|
| **Admin** | Creates the household, invites people, edits the deed catalog, approves or rejects claims, enters penalties, deletes entries, sets budget categories and amounts. Multiple admins allowed; the creator is the first. |
| **Housemate** | Submits "I did X" claims, views the leaderboard and schedule, dibs chores, logs budget spending. |

- An admin is **not** a housemate: no points, no chores, not on the leaderboard.
- A person has exactly one role. If an admin also lives in the apartment, they need a second login as a housemate. **[Default]** See open item O1.
- Housemates never award points to anyone, themselves included.
- An admin can remove a housemate. Their past entries stay in history; their waiting claims are rejected and their unfinished chores from this week on go back to unassigned. A removed housemate cannot rejoin.

## 4. Feature 1: Scoring (v1)

### 4.1 Deed catalog
- Admin-managed list: `name`, `points` (positive or negative integer), `kind` (`good` or `penalty`).
- Deeds can be sorted into admin-made groups (Kitchen, Laundry, ...). The admin drags a deed between groups; a deed with no group is Ungrouped.
- Seeded with examples: Cleaned toilet +5, Cooked dinner +4, Washed own dishes +1, Forgot to wash cup -1, Messy room -2. **[Default]** values; admin edits them.

### 4.2 Claims flow
1. Housemate taps a `good` deed from the catalog: "I did X". One tap, optional note.
2. A pending claim reaches the admin inbox (push on iOS, in-app on web).
3. Admin accepts or rejects. Accept creates a score entry with the catalog's points at that moment. Reject creates nothing and notifies the housemate.
4. Penalties: housemates cannot claim them. An admin enters a penalty from the catalog directly against a housemate, which scores at once.
5. Admin may also add an award directly (no claim) and may delete any entry. Deleting is soft: the entry is hidden, kept for audit.
- Custom claim: if a deed is not in the catalog, the housemate types a short description (1 to 80 characters) instead. The admin enters positive points when accepting; the entry stores that title and those points. Custom entries count for totals, MVP and streaks, never for Champion. A housemate cannot have two identical custom claims waiting.
- Changing a catalog deed's points never changes past entries (the points are copied onto the entry).
- An admin can delete a deed. It leaves the catalog and can no longer be claimed or awarded; past entries keep its name and points, waiting claims for it are rejected, and chores linked to it stop filing claims.
- Claims left pending are shown with age. **[Default]** No auto-expiry.

### 4.3 Score entries
Immutable apart from soft delete. Fields: `housemate`, `deed`, `points`, `source` (`claim` or `admin`), `approved_by`, `created_at`, `deleted_at`.
Nothing is ever reset. All views are queries over entries by date range (Q10).

### 4.4 Leaderboard
- Views: this week, this month, previous week, previous month.
- Rank by total points. Ties share a rank.
- Shows each housemate's points and their medals.

### 4.5 Medals
- Awarded automatically by rules over score entries and the schedule. Fixed set in v1; admins cannot create custom ones (Q13).
- **[Default]** starter set, worked out from score entries each time they are read (the `medals()` function), not stored. Deleting an entry therefore removes any medal it supported.
  - *Champion* (e.g. Toilet champion): the only housemate to do a deed in two weeks in a row. One medal per housemate and deed.
  - *MVP of the Month*: highest total in a finished calendar month. Ties share it. The current month has none yet.
  - *Streak*: at least 1 accepted claim in each of 4 or more weeks in a row. Admin-awarded entries do not count.

### 4.6 Monthly export image
- Button on the leaderboard renders the selected month as a shareable PNG: title, month, ranked list with points and medals, household name.
- Generated on the client and shared with the system share sheet (iOS) or downloaded (web). No server storage.

## 5. Feature 2: Scheduling (v2, needs Feature 1)

### 5.1 Setup (admin)
- **Washing machine**: each weekday maps to one housemate or none.
- **Chores**: `name`, `area` (e.g. CR, living room), `weekday(s)`, `weight` 1 to 3 (effort).
- A chore instance exists per chore per week.

### 5.2 Weekly cycle **[Default]**
| When (household time zone) | What happens |
|---|---|
| Any time until the week ends | Dibs. A housemate may dib any unclaimed chore of this week or next, first come first served, from the Available chores list on Home or the schedule. |
| Cap | A housemate may dib up to their fair share: `ceil(total weight / number of housemates)`. |
| Sunday 00:00 | Unclaimed chores of the coming week are allocated (5.3). Next week's schedule is published. |

### 5.3 Allocation of unclaimed chores
Each chore has a **queue**, worked out from history each time it is read, never stored. Points are not used.
- Queue order, front first: (1) the housemate whose last **completed** instance of that chore is oldest, never completed counting as oldest; (2) tie: the oldest last assignment, so whoever sat out longest goes first (the round robin); (3) tie: name, then id.
- Completed means the chore's claim was accepted and its score entry still stands. Being assigned and missing it does not move anyone back. Only weeks before the one being built count.
- An admin moving a card (drag and drop) changes that week's schedule only. It never counts as completing.

Allocation, from Sunday 00:00 before the week:
1. Dibs stay as taken.
2. Take unclaimed chores, heaviest first.
3. Give each chore to the housemate with the lowest current load (dibbed weight plus already allocated).
4. Tie on load: the housemate nearest the front of that chore's queue.
- No housemates: chores stay unassigned. Admins are never assigned a chore.
- Dibs are respected even if the queue would have chosen someone else.

### 5.4 Completion and swaps
- A housemate marks an assigned chore done. That goes through the same claim flow as 4.2, using the chore's catalog deed if it has one.
- A chore not marked done by the end of its day shows as missed. The admin may enter a penalty by hand. No automatic penalty. **[Default]**
- Swaps are not in v2. Admin can reassign a chore by hand.

## 6. Feature 3: Budget (v3)

- Envelope model (Q14), not linked to bank accounts.
- Monthly allowance = sum of category amounts.
- **Category cards**: `name` (rent, wifi, electricity, groceries, ...), `monthly amount`, `spent`, `left`. The layout follows the card grid in the original screenshot (name, amount in PHP, icon).
- **Top tile**: total allowance left for the month.
- Admin creates and edits categories and amounts. Any housemate logs a spending entry: `category`, `amount`, `note`, `who`, `date`.
- Leftover resets on the 1st of each month (Q15). No carry-over. Past months stay viewable.
- Overspending is allowed. The card shows a negative left amount in red.

## 7. Data model (sketch)

`household` (name, timezone), `member` (user, household, role), `deed` (name, points, kind, active), `claim` (member, deed, note, status, decided_by, decided_at), `score_entry`, `chore`, `chore_instance` (chore, week_start, assignee, dibbed, done), `washer_slot` (weekday, member), `budget_category`, `spend_entry`.
Postgres row-level security on `household_id` and role is required. Housemates cannot write `score_entry` directly.

## 8. Non-goals (v1 through v3)

- Android, multiple households, bill splitting or money owed, linking real bank accounts or e-wallets.
- Custom medals, chore swaps, automatic penalties, chat or comments, notifications beyond claim approval results and the admin inbox.

## 9. Build order

1. **v1 Scoring**: auth, household and invite, catalog, claims, admin inbox, entries, leaderboard, medals, export image.
2. **v2 Scheduling**: chores, washer, dibs, allocation, completion through claims.
3. **v3 Budget**: categories, spending, monthly reset.

## 10. Acceptance criteria

- A housemate's claim appears in the admin inbox within a few seconds. Accepting it adds exactly the catalog points to that housemate's totals and leaderboard.
- Rejecting a claim, or deleting an entry, leaves totals consistent. No negative claim can be made by a housemate.
- A housemate calling the API directly cannot create a score entry, approve a claim, or edit the catalog (rejected by row-level security).
- Editing a deed's points does not change any past total.
- The week and month boundaries follow the household time zone. An entry at 23:59 Sunday counts in that week.
- The exported image shows the selected month's ranking and matches the on-screen leaderboard.
- Allocation (v2): Ana and Ben completed Sweep recently, Cy and Dee did not. Cy and Dee are ahead of them in the Sweep queue, and the one who has sat out longest goes first. A dib beats the queue. An admin drag never changes the queue. This must be a pgTAP test (`supabase/tests/scheduling.test.sql`).
- Budget (v3): total left equals the sum of category lefts. Spending in one category never changes another.

## 11. Open items (your call)

- **O1**: Admin is not a housemate. If the person running the app also lives there, they need two logins. Confirm, or allow a "housemate + admin" role.
- **O2**: The dibs window, the fair-share cap, the starter medals, and the starter catalog are all **[Default]** proposals.
- **O3**: Penalties are admin-entered only. A housemate cannot report their own slip. Confirm.
