-- Quita Taimo de una base de datos (por ejemplo, para moverlo a su propio proyecto).
-- Incluye todas las versiones de las funciones que han existido en las migraciones.
drop function if exists public.taimo_join(text);
drop function if exists public.taimo_create_group(text, text, text, jsonb, jsonb, jsonb, jsonb);
drop function if exists public.taimo_create_group(text, text, text, jsonb, jsonb, jsonb);
drop function if exists public.taimo_sync(text, jsonb, jsonb, jsonb, jsonb);
drop function if exists public.taimo_sync(text, jsonb, jsonb, jsonb);
drop function if exists public.taimo_snapshot(text);
drop table if exists public.taimo_settlements, public.taimo_expenses, public.taimo_members, public.taimo_groups;
-- Copias de seguridad de los usuarios (sus políticas se borran con la tabla).
drop table if exists public.taimo_backups;
