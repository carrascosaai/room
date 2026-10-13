-- Prueba de la copia de seguridad: cada usuario solo ve y toca su propia fila.
-- En local hace falta simular el esquema auth de Supabase (ver bloque inicial).
\set ON_ERROR_STOP 1
begin;
do $$ begin
  if not exists (select 1 from pg_namespace where nspname = 'auth') then
    execute 'create schema auth';
    execute 'create table auth.users (id uuid primary key)';
    execute $f$create function auth.uid() returns uuid language sql stable as
      'select nullif(current_setting(''request.jwt.claim.sub'', true), '''')::uuid'$f$;
    execute 'grant usage on schema auth to anon, authenticated';
    execute 'grant execute on function auth.uid() to anon, authenticated';
  end if;
end $$;
\i supabase/migrations/20261014000000_taimo_backups.sql
insert into auth.users values ('11111111-1111-1111-1111-111111111111'), ('22222222-2222-2222-2222-222222222222');

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
insert into public.taimo_backups (user_id, data) values ('11111111-1111-1111-1111-111111111111', '{"v":1}');
do $$ begin
  insert into public.taimo_backups (user_id, data) values ('22222222-2222-2222-2222-222222222222', '{"hack":1}');
  raise exception 'FALLO: puede escribir la copia de otro';
exception when insufficient_privilege then null;
end $$;

select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
select count(*) = 0 as no_ve_ajena from public.taimo_backups \gset
\if :no_ve_ajena \else \echo 'FALLO: ve la copia de otro' \quit \endif
update public.taimo_backups set data = '{"hack":2}';
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
select (data->>'v') = '1' as intacta from public.taimo_backups \gset
\if :intacta \else \echo 'FALLO: otro usuario cambió la copia' \quit \endif

reset role;
set local role anon;
do $$ begin
  perform 1 from public.taimo_backups;
  raise exception 'FALLO: anon puede leer copias';
exception when insufficient_privilege then null;
end $$;
\echo 'OK: las copias de seguridad son privadas'
rollback;
