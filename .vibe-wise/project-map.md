# Project Map

## Purpose
Shared app for housemates: points for chores and deeds, leaderboard, medals, scheduling, budget.

## Requirements
PRD.md is the source of truth. Scheduling: weekly table (columns housemates, rows Mon-Sun), top achievements strip, admin drag and drop, per-chore queue plus dibs.

## Components
- supabase/migrations: schema, RLS, SQL functions. supabase/tests: pgTAP.
- web/ (Next.js, App Router, Tailwind v4): src/app, _components, actions.ts, lib/.
- ios/ (SwiftUI): not touched by scheduling plan.

## Main Flow
housemate/admin UI -> server action (web/src/app/actions.ts) -> rpc -> security definer SQL function -> tables (read-only to authenticated).
Scheduling (implemented, uncommitted, on branch m-scheduling-db; AI-proposed queue rules approved via plan, learner has not yet explained them back): chore -> chore_instance per week; generate_week assigns dibs then queue; complete_chore -> existing claim flow. Plan: /Users/jorgepaguirigan/.claude/plans/make-a-plan-that-sunny-zebra.md

## Data and Trust Boundaries
Supabase Postgres + Auth; RLS on household_id; clients cannot write score data.

## Build and Deployment
`supabase test db` for pgTAP. Web dev server via .claude/launch.json.

## Unknowns
Queue is derived (AI proposal). Native HTML5 drag and drop (AI proposal).
