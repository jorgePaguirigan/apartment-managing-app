# Apartment Manager

[PRD.md](PRD.md) is the source of truth. [GLOSSARY.md](GLOSSARY.md) defines the words. Check both before changing behavior.

## Layout
- `supabase/migrations`: schema, row-level security and SQL functions. Business rules live here.
- `supabase/tests`: pgTAP tests. Run with `supabase test db`.
- `web/` (Next.js) and `ios/` (SwiftUI): thin clients over the same backend.

## Rules
- Clients never write score data directly. Points change only through `submit_claim`, `decide_claim`, `award`, `delete_entry`. Tables are read-only to `authenticated`.
- Score entries copy the deed's points when created. Never recompute history from the catalog.
- Time ranges (week, month) are computed in the household time zone, in SQL. Do not redo that in a client.
- An admin is not a housemate: never score or rank an admin.
- Any new rule or policy needs a pgTAP test that fails without it.
- Work on a branch per milestone, merged by PR. Keep changes small; do not build beyond the PRD.
