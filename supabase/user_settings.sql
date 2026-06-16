-- Per-user settings storage for CryptoPredict.
-- Run this once in your Supabase project: SQL Editor → paste → Run.
--
-- One row per user holding a JSON blob of their localStorage settings
-- (strategy filters, backtest profiles, appended coins, scanner/terminal prefs).
-- Row Level Security ensures a signed-in user can only read/write THEIR OWN row,
-- so the public anon key is safe to ship in the browser.

create table if not exists public.user_settings (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

-- Each policy scopes access to the caller's own row (auth.uid() = the logged-in user's id).
drop policy if exists "user_settings_select_own" on public.user_settings;
create policy "user_settings_select_own"
  on public.user_settings for select
  using (auth.uid() = user_id);

drop policy if exists "user_settings_insert_own" on public.user_settings;
create policy "user_settings_insert_own"
  on public.user_settings for insert
  with check (auth.uid() = user_id);

drop policy if exists "user_settings_update_own" on public.user_settings;
create policy "user_settings_update_own"
  on public.user_settings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
