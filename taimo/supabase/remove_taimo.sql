-- Quita Taimo de una base de datos (por ejemplo, para moverlo a su propio proyecto).
drop function if exists public.taimo_join(text);
drop function if exists public.taimo_create_group(text, text, text, jsonb, jsonb, jsonb);
drop function if exists public.taimo_sync(text, jsonb, jsonb, jsonb);
drop function if exists public.taimo_snapshot(text);
drop table if exists public.taimo_settlements, public.taimo_expenses, public.taimo_members, public.taimo_groups;
