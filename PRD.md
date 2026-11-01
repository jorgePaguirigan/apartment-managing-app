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
- Currency: PHP only. Time zone: household setting, default `Asia/Manila`. Week runs Sunday to Saturday in that zone.

## 3. Roles

| Role | Can do |
|---|---|
| **Admin** | Creates the household, invites people, edits the deed catalog, approves or rejects claims, enters penalties, deletes entries, sets budget categories and amounts. Multiple admins allowed; the creator is the first. |
| **Housemate** | Submits "I did X" claims, views the leaderboard and schedule, dibs chores, logs budget spending. |

- An admin is **not** a housemate: no points, no chores, not on the leaderboard.
- A person has exactly one role. If an admin also lives in the apartment, they need a second login as a housemate. **[Default]** See open item O1.
- Housemates never award points to anyone, themselves included.
- An admin can make a housemate an admin (Edit menu on the Housemates card). They stay a scored housemate, so they keep their points and chores and can score other people's claims. Nobody can accept or reject their own claim; another admin decides it. There is no way to take admin back in the app yet.
- An admin can remove a housemate. Their past entries stay in history and still count in medal contests, but they show no medals; their waiting claims are rejected and their unfinished chores from this week on go back to unassigned. A removed housemate can rejoin through a new invite; their old history is theirs again.

## 4. Feature 1: Scoring (v1)

### 4.1 Deed catalog
- Admin-managed list: `name`, `points` (positive or negative integer), `kind` (`good` or `penalty`).
- Deeds can be sorted into admin-made groups (Kitchen, Laundry, ...). The admin drags a deed between groups and orders groups with up/down arrows; a deed with no group is Ungrouped, always last.
- Housemates see their "I did" deeds under the same groups. Each housemate may order the groups for themselves with the same arrows, which only changes their view; groups they have not placed follow the admin's order.
- Seeded with examples: Cleaned toilet +5, Cooked dinner +4, Washed own dishes +1, Forgot to wash cup -1, Messy room -2. **[Default]** values; admin edits them.

### 4.2 Claims flow
1. Housemate taps a `good` deed from the catalog: "I did X". One tap, optional note.
2. A pending claim reaches the admin inbox (push on iOS, in-app on web).
3. Admin accepts or rejects. Accept creates a score entry with the catalog's points at that moment. Reject creates nothing and notifies the housemate.
4. Penalties: housemates cannot claim them. An admin enters a penalty from the catalog directly against a housemate, which scores at once.
- Reports: a housemate may report a housemate (themselves included) for a penalty from the catalog, or type a demerit that is not in the catalog (1 to 80 characters). The report waits in the admin inbox; the admin accepts or rejects. Accepting a catalog report scores that penalty's points; a typed demerit needs negative points from the admin. The reporter chooses whether the reported housemate sees "Reported by <name>" or "Reported anonymously" beside the entry; the admin always sees the reporter. The reported housemate cannot read the report itself. A reporter cannot have two identical reports waiting. Removing a housemate rejects their waiting reports, about them or from them. Housemates still never award points: only the admin's decision creates the entry.
5. Admin may also add an award directly (no claim) and may delete any entry. Deleting is soft: the entry is hidden, kept for audit.
- Custom claim: if a deed is not in the catalog, the housemate types a short description (1 to 80 characters) instead. The admin enters positive points when accepting; the entry stores that title and those points. Custom entries count for totals, MVP and streaks, never for Champion. A housemate cannot have two identical custom claims waiting.
- Contributors: a claim, catalog or custom, may name other scored members who did it with the claimer (the **Contributors** dropdown under "I did…"). The claimer is always counted. Everyone named must be a scored member of the household, listed once, so a claim never has more people than the household has housemates. Accepting scores the deed's full points once for each person (the points are not split); rejecting scores nobody. A contributor removed before the decision gets nothing. Each person's entry can be deleted on its own, and each contributor sees the claim in their own History as if they had claimed it. Chore-done claims do not take contributors.
- Changing a catalog deed's points never changes past entries (the points are copied onto the entry).
- An admin can delete a deed. It leaves the catalog and can no longer be claimed or awarded; past entries keep its name and points, waiting claims for it are rejected, and chores linked to it stop filing claims.
- Claims left pending are shown with age. **[Default]** No auto-expiry.

### 4.3 Score entries
Immutable apart from soft delete. Fields: `housemate`, `deed`, `points`, `source` (`claim` or `admin`; a claim with contributors scores one entry per person), `report_note`, `approved_by`, `created_at`, `deleted_at`.
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

### 4.7 Claim emails
- Sent from one Gmail account of the product owner over SMTP, with the display name "Kasangga". A custom sender address needs a domain, which the product owner does not have. **[Default]**
- **Admin email**: when a housemate submits a claim, the admins get one email at once, to the first admin with the others in cc, with the housemate, the deed, its points and the note, and Accept and Reject buttons. A button opens a confirm page (no sign-in) that asks which admin you are, then the decision is made only when the admin confirms there; that admin is recorded as the decider. It lists the admins except the housemate who made the claim. The link is shared by the admins, single use, and expires. A custom claim has no Accept button, since the admin must type its points; it links to the inbox. If two admins decide, the first decision wins.
- **Housemate email**: when a claim is decided, every scored member (housemates, and an admin who is also a housemate) gets the same email, sent once to the first with the others in cc: who, which deed, the points, the leaderboard for this week and for this month after the decision, who was overtaken (or that nobody was), and any medal gained or lost because of it. A rejected claim gets a short email saying it was rejected, with no ranks or medals.
- Only claims send emails. Admin awards, penalties, reports and deletions send none.
- **Frequency**: an admin sets how often housemate emails go out. Instant, or a list of send times (e.g. 13:00 and 21:00) in the household time zone, with an optional rule "after a given time, hold everything and send once at a given time". A batched email lists every decided claim since the last send. Admin emails are always instant.
- Medals gained or lost are the difference between the medals just before and just after the decision, per 4.5.

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
| Sunday 00:00, the week starts | Unclaimed chores of that week are allocated (5.3). The schedule is final for the week apart from admin moves (5.3) and dibs. |
| Release | A housemate may release a chore they dibbed until its week starts (Sunday 00:00), and not once it is marked done. |

### 5.3 Allocation of unclaimed chores
Each chore has a **queue**, worked out from history each time it is read, never stored. Points are not used.
- Queue order, front first: (1) the housemate whose last **completed** instance of that chore is oldest, never completed counting as oldest; (2) tie: the oldest last assignment, so whoever sat out longest goes first (the round robin); (3) tie: name, then id.
- Completed means the chore's claim was accepted and its score entry still stands. Being assigned and missing it does not move anyone back. Only weeks before the one being built count.
- An admin moving a card (drag and drop) changes that week's schedule only. It never counts as completing.
- **Admin edits run from today on.** In this week and next, the admin may move a card to another housemate (or to Unassigned) and to another day of its own week, as long as the card's day and the day it lands on are today or later in the household time zone. A card on yesterday or any earlier day is locked, and so is a card already marked done. A move to today takes effect at once for the housemate. The chore itself keeps its weekday; only that week's card moves. This is for sudden changes and schedule conflicts.
- A card the admin moves to Unassigned stays unassigned for the rest of that week: the allocation does not hand it out again. Housemates can still dib it.

Allocation, at the start of the week (Sunday 00:00):
1. Dibs stay as taken.
2. Take unclaimed chores, heaviest first.
3. Give each chore to the housemate with the lowest current load (dibbed weight plus already allocated).
4. Tie on load: the housemate nearest the front of that chore's queue.
- No housemates: chores stay unassigned. Admins are never assigned a chore.
- Dibs are respected even if the queue would have chosen someone else.

### 5.4 Completion and swaps
- A housemate marks an assigned chore done. That goes through the same claim flow as 4.2, using the chore's catalog deed if it has one.
- A chore not marked done by the end of its day shows as missed. The admin may enter a penalty by hand. No automatic penalty. **[Default]**
- Swaps are not in v2. Admin can reassign a chore by hand, from today on (5.3).

## 6. Feature 3: Budget (v3)

- Envelope model (Q14), not linked to bank accounts.
- Monthly allowance = sum of category amounts.
- **Category cards**: `name` (rent, wifi, electricity, groceries, ...), `monthly amount`, `spent`, `left`. The layout follows the card grid in the original screenshot (name, amount in PHP, icon).
- **Top tile**: total allowance left for the month.
- Admin creates and edits categories and amounts. Any housemate logs a spending entry: `category`, `amount`, `note`, `who`, `date`.
- Leftover resets on the 1st of each month (Q15). No carry-over. Past months stay viewable.
- Overspending is allowed. The card shows a negative left amount in red.

## 7. Data model (sketch)

`household` (name, timezone), `member` (user, household, role), `deed` (name, points, kind, active), `claim` (member, deed, note, status, decided_by, decided_at), `claim_contributor` (claim, member), `score_entry`, `chore`, `chore_instance` (chore, week_start, assignee, dibbed, done), `washer_slot` (weekday, member), `budget_category`, `spend_entry`.
Postgres row-level security on `household_id` and role is required. Housemates cannot write `score_entry` directly.

## 8. Non-goals (v1 through v3)

- Android, multiple households, bill splitting or money owed, linking real bank accounts or e-wallets.
- Custom medals, chore swaps, automatic penalties, chat or comments, notifications beyond claim approval results, the admin inbox and the claim emails in 4.7.

## 9. Build order

1. **v1 Scoring**: auth, household and invite, catalog, claims, admin inbox, entries, leaderboard, medals, export image.
2. **v2 Scheduling**: chores, washer, dibs, allocation, completion through claims.
3. **v3 Budget**: categories, spending, monthly reset.

## 10. Acceptance criteria

- A housemate's claim appears in the admin inbox within a few seconds. Accepting it adds exactly the catalog points to that housemate's totals and leaderboard.
- Rejecting a claim, or deleting an entry, leaves totals consistent. No negative claim can be made by a housemate.
- A housemate calling the API directly cannot create a score entry, approve a claim, or edit the catalog (rejected by row-level security).
- Editing a deed's points does not change any past total.
- The week and month boundaries follow the household time zone. An entry at 23:59 Saturday counts in that week; one at 00:00 Sunday starts the next.
- The exported image shows the selected month's ranking and matches the on-screen leaderboard.
- Allocation (v2): Ana and Ben completed Sweep recently, Cy and Dee did not. Cy and Dee are ahead of them in the Sweep queue, and the one who has sat out longest goes first. A dib beats the queue. An admin drag never changes the queue. This must be a pgTAP test (`supabase/tests/scheduling.test.sql`).
- Budget (v3): total left equals the sum of category lefts. Spending in one category never changes another.

## 11. Open items (your call)

- **O1**: Admin is not a housemate. If the person running the app also lives there, they need two logins. Confirm, or allow a "housemate + admin" role.
- **O2**: The dibs window, the fair-share cap, the starter medals, and the starter catalog are all **[Default]** proposals.
- **O3**: Penalties are admin-entered only. A housemate cannot report their own slip. Confirm.
