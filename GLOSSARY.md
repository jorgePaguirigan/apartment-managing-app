# Glossary

Use these words exactly. They match the PRD and the database.

- **Household**: the apartment. One in v1. Has a time zone (default `Asia/Manila`).
- **Admin**: runs the household. Approves claims, enters penalties, edits the catalog. Not scored unless they also live there (a **scored member**); an admin never decides their own claim. An admin can promote a housemate (`make_admin`), who stays scored.
- **Housemate**: a scored resident. Submits claims, never awards points.
- **Member**: the database row for either an admin or a housemate (`member.role`). Use "admin" or "housemate" in prose.
- **Removed housemate**: a housemate an admin removed (`member.role = 'removed'`). Their history stays; they are off the leaderboard and schedule and can read nothing of the household. A new invite brings them back with their history.
- **Deed**: one entry in the catalog: a name, a point value, a kind.
- **Catalog**: the household's list of deeds, edited by admins.
- **Group**: a named section of the catalog (`deed_group`), such as Kitchen. A deed belongs to at most one. The admin sets the order (`position`); a housemate may keep their own order (`member_group_order`).
- **Good deed / penalty**: `kind`. Good deeds are positive and claimable. Penalties are negative and entered by an admin only.
- **Claim**: a housemate's "I did X" waiting for an admin. Status: pending, accepted, rejected. A **custom claim** has a typed title instead of a catalog deed, and the admin sets its points on acceptance.
- **Report**: a housemate telling the admin that a housemate (themselves included) did a penalty deed, or a typed demerit not in the catalog. Status: pending, accepted, rejected. The admin decides; accepting scores the penalty at once. The reporter may stay **anonymous**: the reported housemate is then not told who reported (the admin always sees).
- **Score entry**: one signed point change on a housemate's total. Points are copied from the deed when it is created. Never edited; only soft-deleted.
- **Award**: an admin creating a score entry directly, without a claim.
- **Leaderboard**: housemates ranked by points for a period. Ties share a rank. A housemate's card opens to their entries for that period only.
- **Period**: this week, previous week, this month, previous month, in the household time zone. Weeks start Monday.
- **Chore**: a recurring task with a name, area, weekday, weight (1 to 3) and an optional deed claimed when it is done.
- **Schedule**: the week's chore instances and who has each one. A new one is generated every week.
- **Dibs**: a housemate taking an unclaimed chore, any time until its week ends, up to a fair share of the weight. Open chores are listed under Available chores on Home. An admin who moves a chore to Unassigned keeps it unassigned for that week; it is not handed out again.
- **Queue**: the order of housemates for one chore, worked out from history: oldest completion first, then longest without it. Never stored.
- **Medal**: a badge worked out from score entries when read (champion, MVP of the month, streak). Never stored.
- **Scored member**: an admin or housemate who is on the leaderboard: every housemate, and an admin who opted in as a housemate.
- **Admin email**: the email an admin gets when a claim is submitted, with Accept and Reject buttons.
- **Housemate email**: the email scored members get after a claim is decided, with the leaderboards, who was overtaken and medals gained or lost.
- **Decision link**: the single-use, expiring link in an admin email that opens a confirm page for one claim. Nothing is decided until the admin confirms.
- **Send schedule**: the admin's choice of when housemate emails go out: instant, or at set times, with an optional hold-after rule. Admin emails ignore it.
