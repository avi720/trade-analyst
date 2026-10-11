-- Temporary: verifies the Supabase GitHub integration applies migrations pushed to dev.
-- Removed right after the check (row deleted from dev's schema_migrations, file deleted).
create table if not exists public._integration_smoke_test (
  id int primary key
);
alter table public._integration_smoke_test enable row level security;
