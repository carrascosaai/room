-- Taimo: grupos compartidos.
--
-- Modelo de seguridad: no hay cuentas de usuario. Quien tiene el código de
-- invitación de un grupo puede verlo y editarlo (como un enlace de Splitwise o
-- Tricount). Las tablas no son accesibles directamente: RLS activado y sin
-- políticas. Todo pasa por funciones que exigen el código.
-- Solo se guardan gastos de grupos; los gastos personales nunca salen del móvil.

create table if not exists public.taimo_groups (
  id text primary key,
  code text not null unique,
  name text not null check (char_length(name) between 1 and 80),
  emoji text not null default '👥' check (char_length(emoji) <= 16),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.taimo_members (
  id text primary key,
  group_id text not null references public.taimo_groups (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  claimed boolean not null default false,
  updated_at timestamptz not null
);
create index if not exists taimo_members_group_idx on public.taimo_members (group_id);

create table if not exists public.taimo_expenses (
  id text primary key,
  group_id text not null references public.taimo_groups (id) on delete cascade,
  amount integer not null check (amount between 0 and 100000000),
  merchant text not null default '' check (char_length(merchant) <= 120),
  category text not null default 'otros' check (char_length(category) <= 30),
  date timestamptz not null,
  paid_by text not null default '',
  shares jsonb not null default '{}'::jsonb,
  source text not null default 'manual' check (char_length(source) <= 20),
  deleted boolean not null default false,
  updated_at timestamptz not null
);
create index if not exists taimo_expenses_group_idx on public.taimo_expenses (group_id);

create table if not exists public.taimo_settlements (
  id text primary key,
  group_id text not null references public.taimo_groups (id) on delete cascade,
  from_member text not null default '',
  to_member text not null default '',
  amount integer not null check (amount between 0 and 100000000),
  date timestamptz not null,
  deleted boolean not null default false,
  updated_at timestamptz not null
);
create index if not exists taimo_settlements_group_idx on public.taimo_settlements (group_id);

alter table public.taimo_groups enable row level security;
alter table public.taimo_members enable row level security;
alter table public.taimo_expenses enable row level security;
alter table public.taimo_settlements enable row level security;

revoke all on public.taimo_groups, public.taimo_members, public.taimo_expenses, public.taimo_settlements
  from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on public.taimo_groups, public.taimo_members, public.taimo_expenses, public.taimo_settlements
      from anon, authenticated;
  end if;
end $$;

-- Foto completa de un grupo en el formato que entiende la app.
create or replace function public.taimo_snapshot(p_group_id text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'group', (select jsonb_build_object('id', g.id, 'name', g.name, 'emoji', g.emoji, 'code', g.code)
              from taimo_groups g where g.id = p_group_id),
    'members', coalesce((select jsonb_agg(jsonb_build_object(
                  'id', m.id, 'name', m.name, 'claimed', m.claimed, 'updatedAt', m.updated_at) order by m.updated_at)
                from taimo_members m where m.group_id = p_group_id), '[]'::jsonb),
    'expenses', coalesce((select jsonb_agg(jsonb_build_object(
                  'id', e.id, 'amount', e.amount, 'merchant', e.merchant, 'category', e.category,
                  'date', e.date, 'paidBy', e.paid_by, 'shares', e.shares, 'note', null,
                  'source', e.source, 'updatedAt', e.updated_at, 'deleted', e.deleted) order by e.date desc)
                from taimo_expenses e where e.group_id = p_group_id), '[]'::jsonb),
    'settlements', coalesce((select jsonb_agg(jsonb_build_object(
                  'id', s.id, 'from', s.from_member, 'to', s.to_member, 'amount', s.amount,
                  'date', s.date, 'updatedAt', s.updated_at, 'deleted', s.deleted) order by s.date)
                from taimo_settlements s where s.group_id = p_group_id), '[]'::jsonb)
  );
$$;
revoke all on function public.taimo_snapshot(text) from public;
-- Supabase da permiso de ejecución a anon/authenticated por defecto: esta función
-- interna no lo debe tener (no exige el código del grupo).
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on function public.taimo_snapshot(text) from anon, authenticated;
  end if;
end $$;

-- Sube los cambios de un móvil y devuelve el grupo actualizado.
-- Gana el cambio con `updatedAt` más reciente. Las filas de otro grupo no se tocan.
create or replace function public.taimo_sync(
  p_code text,
  p_members jsonb default '[]'::jsonb,
  p_expenses jsonb default '[]'::jsonb,
  p_settlements jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_id text;
begin
  select id into v_group_id from taimo_groups where code = p_code;
  if v_group_id is null then
    raise exception 'grupo no encontrado' using errcode = 'P0002';
  end if;
  if jsonb_array_length(p_members) > 50 or jsonb_array_length(p_expenses) > 2000
     or jsonb_array_length(p_settlements) > 2000 then
    raise exception 'demasiados cambios de una vez' using errcode = '22023';
  end if;

  insert into taimo_members as t (id, group_id, name, claimed, updated_at)
  select x.id, v_group_id, left(x.name, 60), coalesce(x.claimed, false), x."updatedAt"
  from jsonb_to_recordset(p_members) as x(id text, name text, claimed boolean, "updatedAt" timestamptz)
  where x.id is not null and char_length(coalesce(x.name, '')) > 0 and x."updatedAt" is not null
  on conflict (id) do update
    set name = excluded.name,
        -- Un miembro reclamado sigue reclamado.
        claimed = t.claimed or excluded.claimed,
        updated_at = excluded.updated_at
    where t.group_id = v_group_id and excluded.updated_at > t.updated_at;

  insert into taimo_expenses as t (id, group_id, amount, merchant, category, date, paid_by, shares, source, deleted, updated_at)
  select x.id, v_group_id, x.amount, left(coalesce(x.merchant, ''), 120), left(coalesce(x.category, 'otros'), 30),
         x.date, coalesce(x."paidBy", ''), coalesce(x.shares, '{}'::jsonb), left(coalesce(x.source, 'manual'), 20),
         coalesce(x.deleted, false), x."updatedAt"
  from jsonb_to_recordset(p_expenses) as x(
    id text, amount integer, merchant text, category text, date timestamptz, "paidBy" text,
    shares jsonb, source text, deleted boolean, "updatedAt" timestamptz)
  where x.id is not null and x.amount is not null and x.date is not null and x."updatedAt" is not null
  on conflict (id) do update
    set amount = excluded.amount, merchant = excluded.merchant, category = excluded.category,
        date = excluded.date, paid_by = excluded.paid_by, shares = excluded.shares,
        source = excluded.source, deleted = excluded.deleted, updated_at = excluded.updated_at
    where t.group_id = v_group_id and excluded.updated_at > t.updated_at;

  insert into taimo_settlements as t (id, group_id, from_member, to_member, amount, date, deleted, updated_at)
  select x.id, v_group_id, coalesce(x."from", ''), coalesce(x."to", ''), x.amount, x.date,
         coalesce(x.deleted, false), x."updatedAt"
  from jsonb_to_recordset(p_settlements) as x(
    id text, "from" text, "to" text, amount integer, date timestamptz, deleted boolean, "updatedAt" timestamptz)
  where x.id is not null and x.amount is not null and x.date is not null and x."updatedAt" is not null
  on conflict (id) do update
    set from_member = excluded.from_member, to_member = excluded.to_member, amount = excluded.amount,
        date = excluded.date, deleted = excluded.deleted, updated_at = excluded.updated_at
    where t.group_id = v_group_id and excluded.updated_at > t.updated_at;

  update taimo_groups set updated_at = now() where id = v_group_id;
  return taimo_snapshot(v_group_id);
end;
$$;

-- Comparte un grupo que hasta ahora solo estaba en un móvil. Devuelve su foto con el código.
create or replace function public.taimo_create_group(
  p_id text,
  p_name text,
  p_emoji text,
  p_members jsonb default '[]'::jsonb,
  p_expenses jsonb default '[]'::jsonb,
  p_settlements jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
begin
  if exists (select 1 from taimo_groups where id = p_id) then
    raise exception 'el grupo ya está compartido' using errcode = '23505';
  end if;
  -- 16 caracteres sin letras confusas (0/O, 1/I/L): ~80 bits, imposible de adivinar.
  v_code := (
    select string_agg(substr('23456789ABCDEFGHJKMNPQRSTUVWXYZ', 1 + (get_byte(b, i) % 31), 1), '')
    from (select decode(md5(gen_random_uuid()::text || clock_timestamp()::text), 'hex') as b) r,
         generate_series(0, 15) as i
  );
  insert into taimo_groups (id, code, name, emoji) values (p_id, v_code, left(p_name, 80), left(coalesce(p_emoji, '👥'), 16));
  return taimo_sync(v_code, p_members, p_expenses, p_settlements);
end;
$$;

-- Entrar en un grupo con el código de invitación.
create or replace function public.taimo_join(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_id text;
begin
  select id into v_group_id from taimo_groups where code = upper(trim(p_code));
  if v_group_id is null then
    raise exception 'grupo no encontrado' using errcode = 'P0002';
  end if;
  return taimo_snapshot(v_group_id);
end;
$$;

revoke all on function public.taimo_sync(text, jsonb, jsonb, jsonb) from public;
revoke all on function public.taimo_create_group(text, text, text, jsonb, jsonb, jsonb) from public;
revoke all on function public.taimo_join(text) from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    grant execute on function public.taimo_sync(text, jsonb, jsonb, jsonb) to anon, authenticated;
    grant execute on function public.taimo_create_group(text, text, text, jsonb, jsonb, jsonb) to anon, authenticated;
    grant execute on function public.taimo_join(text) to anon, authenticated;
  end if;
end $$;
