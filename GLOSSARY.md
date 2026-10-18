# Glossary

Use these words exactly. They match the PRD and the database.

- **Household**: the apartment. One in v1. Has a time zone (default `Asia/Manila`).
- **Admin**: runs the household. Approves claims, enters penalties, edits the catalog. Not scored, not on the leaderboard.
- **Housemate**: a scored resident. Submits claims, never awards points.
- **Member**: the database row for either an admin or a housemate (`member.role`). Use "admin" or "housemate" in prose.
- **Deed**: one entry in the catalog: a name, a point value, a kind.
- **Catalog**: the household's list of deeds, edited by admins.
- **Good deed / penalty**: `kind`. Good deeds are positive and claimable. Penalties are negative and entered by an admin only.
- **Claim**: a housemate's "I did X" waiting for an admin. Status: pending, accepted, rejected.
- **Score entry**: one signed point change on a housemate's total. Points are copied from the deed when it is created. Never edited; only soft-deleted.
- **Award**: an admin creating a score entry directly, without a claim.
- **Leaderboard**: housemates ranked by points for a period. Ties share a rank.
- **Period**: this week, previous week, this month, previous month, in the household time zone. Weeks start Monday.
- **Medal**: a badge worked out from score entries when read (champion, MVP of the month, streak). Never stored.
