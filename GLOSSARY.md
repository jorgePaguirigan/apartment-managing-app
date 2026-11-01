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
- **Contributor**: a scored member a claimer names as having done the deed with them. On acceptance each contributor gets their own score entry with the full points. The claimer is always counted, and a claim has at most as many people as the household has housemates.
- **Report**: a housemate telling the admin that a housemate (themselves included) did a penalty deed, or a typed demerit not in the catalog. Status: pending, accepted, rejected. The admin decides; accepting scores the penalty at once. The reporter may stay **anonymous**: the reported housemate is then not told who reported (the admin always sees).
- **Score entry**: one signed point change on a housemate's total. Points are copied from the deed when it is created. Never edited; only soft-deleted.
- **Award**: an admin creating a score entry directly, without a claim.
- **Leaderboard**: housemates ranked by points for a period. Ties share a rank. A housemate's card opens to their entries for that period only.
- **Period**: this week, previous week, this month, previous month, in the household time zone. Weeks start Sunday.
- **Locked day**: a day before today in the household time zone. The admin cannot move a chore card from or to a locked day; today and later days can still be edited.
- **Chore**: a recurring task with a name, area, weekday and an optional deed claimed when it is done. A chore's **points** are its deed's points (0 without a deed).
- **Schedule**: the week's chore instances and who has each one. A new one is generated every week.
- **Dibs**: a housemate taking an unclaimed chore, any time until its week ends, up to a fair share of the points. Open chores are listed under Available chores on Home. An admin who moves a chore to Unassigned keeps it unassigned for that week; it is not handed out again.
- **Queue**: the order of housemates for one chore, worked out from history: oldest completion first, then longest without it. Never stored.
- **Medal**: a badge worked out from score entries when read (champion, MVP of the month, streak). Never stored.
- **Scored member**: an admin or housemate who is on the leaderboard: every housemate, and an admin who opted in as a housemate.
- **Admin email**: the one email the admins get when a claim is submitted (first admin to, the others cc), with Accept and Reject buttons.
- **Housemate email**: the one email scored members get after a claim is decided (first to, the rest cc), with the leaderboards, who was overtaken and medals gained or lost.
- **Decision link**: the single-use, expiring link in the admin email, shared by the admins, that opens a confirm page for one claim. The admin picks who they are there, and nothing is decided until they confirm.
- **Send schedule**: the admin's choice of when housemate emails go out: instant, or at set times, with an optional hold-after rule. Admin emails ignore it.
