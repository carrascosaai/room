-- ═══════════════════════════════════════════════════════════════
-- Scheduled cleanup — at real scale (many rooms, running for
-- months), finished/abandoned rooms would otherwise sit in the
-- `rooms` table forever. This schedules the purge_stale_rooms()
-- helper (already defined in 0001_init.sql) to run automatically.
-- ═══════════════════════════════════════════════════════════════

create extension if not exists pg_cron with schema extensions;

-- remove any previous schedule with the same name so this migration
-- can be re-run safely
select cron.unschedule('purge-stale-rooms')
where exists (select 1 from cron.job where jobname = 'purge-stale-rooms');

-- every 30 minutes, delete rooms that haven't been touched in 6+ hours
select cron.schedule(
  'purge-stale-rooms',
  '*/30 * * * *',
  $$select public.purge_stale_rooms();$$
);
