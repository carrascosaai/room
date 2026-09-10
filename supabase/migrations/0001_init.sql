-- ═══════════════════════════════════════════════════════════════
-- ROOM — initial schema
--
-- Design note: ROOM games are ephemeral (5–10 min, 3–10 anonymous
-- players) and the whole game state is a small, self-consistent
-- object that the deterministic engine rewrites atomically every
-- transition. Storing it as one versioned `jsonb` document (with
-- optimistic concurrency on `version`) is simpler and safer than a
-- normalized per-entity schema that would need a transaction on
-- every answer. The engine's TypeScript types ARE the schema.
--
-- `game_archives` keeps a normalized-enough snapshot of finished
-- games for later analysis; `game_events` is the analytics stream.
-- ═══════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ── live room state ────────────────────────────────────────────
create table if not exists public.rooms (
  code        text primary key check (char_length(code) between 3 and 8),
  version     integer not null default 1,
  phase       text not null default 'LOBBY',
  state       jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists rooms_updated_at_idx on public.rooms (updated_at);
create index if not exists rooms_phase_idx on public.rooms (phase);

-- ── analytics events (anonymous) ───────────────────────────────
create table if not exists public.game_events (
  id          uuid primary key default gen_random_uuid(),
  room_code   text,
  name        text not null,
  props       jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists game_events_name_idx on public.game_events (name, created_at);
create index if not exists game_events_room_idx on public.game_events (room_code);

-- ── finished-game archive (for offline analysis of the model) ──
create table if not exists public.game_archives (
  id             uuid primary key default gen_random_uuid(),
  room_code      text not null,
  player_count   integer not null,
  rounds         integer not null,
  ai_accuracy    numeric,
  theories       jsonb not null default '[]'::jsonb,
  behavior       jsonb not null default '{}'::jsonb,
  group_model    jsonb not null default '{}'::jsonb,
  report         jsonb,
  started_at     timestamptz,
  ended_at       timestamptz,
  created_at     timestamptz not null default now()
);

create index if not exists game_archives_created_idx on public.game_archives (created_at);

-- ── auto-touch updated_at ──────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists rooms_touch on public.rooms;
create trigger rooms_touch before update on public.rooms
  for each row execute function public.touch_updated_at();

-- ── TTL cleanup helper (call from a scheduled job / pg_cron) ────
create or replace function public.purge_stale_rooms(max_age interval default interval '6 hours')
returns integer language plpgsql as $$
declare deleted integer;
begin
  delete from public.rooms where updated_at < now() - max_age;
  get diagnostics deleted = row_count;
  return deleted;
end $$;

-- ═══════════════════════════════════════════════════════════════
-- Row Level Security
--
-- All writes go through the Next.js server using the SERVICE ROLE
-- key (which bypasses RLS). The browser only ever uses the ANON
-- key, and only to (a) read the room row for Realtime and (b)
-- receive change notifications. So: anon can SELECT rooms, nothing
-- else. No client can INSERT/UPDATE/DELETE anything.
-- ═══════════════════════════════════════════════════════════════
alter table public.rooms enable row level security;
alter table public.game_events enable row level security;
alter table public.game_archives enable row level security;

drop policy if exists "rooms: anon read" on public.rooms;
create policy "rooms: anon read" on public.rooms
  for select using (true);

-- game_events / game_archives: no anon access at all (server-only)
drop policy if exists "events: no anon" on public.game_events;
create policy "events: no anon" on public.game_events
  for select using (false);

drop policy if exists "archives: no anon" on public.game_archives;
create policy "archives: no anon" on public.game_archives
  for select using (false);

-- ── Realtime ───────────────────────────────────────────────────
-- Push row changes on `rooms` to subscribed clients.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'rooms'
  ) then
    alter publication supabase_realtime add table public.rooms;
  end if;
end $$;

alter table public.rooms replica identity full;
