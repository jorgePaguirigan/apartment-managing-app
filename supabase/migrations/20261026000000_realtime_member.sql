-- Removing (or adding) a housemate must refresh everyone's open screens, or the leaderboard keeps showing them until a reload.
alter publication supabase_realtime add table public.member;
