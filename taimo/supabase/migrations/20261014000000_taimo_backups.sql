-- Taimo: copia de seguridad privada de cada usuario (requiere iniciar sesión con Apple o Google).
-- Solo el dueño puede leer o escribir su fila (RLS con auth.uid()).

create table if not exists public.taimo_backups (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  -- Límite de tamaño razonable (~2 MB) para evitar abusos.
  constraint taimo_backups_size check (pg_column_size(data) < 2000000)
);

alter table public.taimo_backups enable row level security;

revoke all on public.taimo_backups from anon;
grant select, insert, update, delete on public.taimo_backups to authenticated;

drop policy if exists "taimo_backups_owner_select" on public.taimo_backups;
create policy "taimo_backups_owner_select" on public.taimo_backups
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "taimo_backups_owner_insert" on public.taimo_backups;
create policy "taimo_backups_owner_insert" on public.taimo_backups
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "taimo_backups_owner_update" on public.taimo_backups;
create policy "taimo_backups_owner_update" on public.taimo_backups
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "taimo_backups_owner_delete" on public.taimo_backups;
create policy "taimo_backups_owner_delete" on public.taimo_backups
  for delete to authenticated using ((select auth.uid()) = user_id);
