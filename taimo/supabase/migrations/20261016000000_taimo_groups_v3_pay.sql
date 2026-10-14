-- Taimo v3: cada miembro puede compartir cómo le pagan (Bizum, IBAN, PayPal.me,
-- Revolut) para que quien le debe dinero le pague en un toque. Solo lo ven los
-- miembros del grupo (como todo lo demás, a través del código del grupo).

alter table public.taimo_members add column if not exists pay jsonb
  check (pay is null or pg_column_size(pay) < 2000);

create or replace function public.taimo_snapshot(p_group_id text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'group', (select jsonb_build_object(
                'id', g.id, 'name', g.name, 'emoji', g.emoji, 'code', g.code,
                'kind', g.kind, 'currency', g.currency, 'meta', g.meta, 'updatedAt', g.meta_updated_at)
              from taimo_groups g where g.id = p_group_id),
    'members', coalesce((select jsonb_agg(jsonb_build_object(
                  'id', m.id, 'name', m.name, 'claimed', m.claimed, 'updatedAt', m.updated_at, 'pay', m.pay) order by m.updated_at)
                from taimo_members m where m.group_id = p_group_id), '[]'::jsonb),
    'expenses', coalesce((select jsonb_agg(jsonb_build_object(
                  'id', e.id, 'amount', e.amount, 'merchant', e.merchant, 'category', e.category,
                  'date', e.date, 'paidBy', e.paid_by, 'shares', e.shares, 'note', null,
                  'source', e.source, 'updatedAt', e.updated_at, 'deleted', e.deleted, 'extra', e.extra) order by e.date desc)
                from taimo_expenses e where e.group_id = p_group_id), '[]'::jsonb),
    'settlements', coalesce((select jsonb_agg(jsonb_build_object(
                  'id', s.id, 'from', s.from_member, 'to', s.to_member, 'amount', s.amount,
                  'date', s.date, 'updatedAt', s.updated_at, 'deleted', s.deleted) order by s.date)
                from taimo_settlements s where s.group_id = p_group_id), '[]'::jsonb)
  );
$$;
revoke all on function public.taimo_snapshot(text) from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on function public.taimo_snapshot(text) from anon, authenticated;
  end if;
end $$;

create or replace function public.taimo_sync(
  p_code text,
  p_members jsonb default '[]'::jsonb,
  p_expenses jsonb default '[]'::jsonb,
  p_settlements jsonb default '[]'::jsonb,
  p_group jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_id text;
  v_meta_at timestamptz;
begin
  select id into v_group_id from taimo_groups where code = p_code;
  if v_group_id is null then
    raise exception 'grupo no encontrado' using errcode = 'P0002';
  end if;
  if jsonb_array_length(p_members) > 50 or jsonb_array_length(p_expenses) > 2000
     or jsonb_array_length(p_settlements) > 2000 then
    raise exception 'demasiados cambios de una vez' using errcode = '22023';
  end if;

  -- Ajustes del grupo: solo si son más recientes que los guardados.
  if p_group is not null and p_group ? 'updatedAt' then
    v_meta_at := (p_group->>'updatedAt')::timestamptz;
    update taimo_groups set
      name = left(coalesce(nullif(p_group->>'name', ''), name), 80),
      emoji = left(coalesce(nullif(p_group->>'emoji', ''), emoji), 16),
      kind = case when p_group->>'kind' in ('couple', 'flat', 'trip', 'other') then p_group->>'kind' else kind end,
      currency = case when coalesce(p_group->>'currency', '') ~ '^[A-Z]{3}$' then p_group->>'currency' else currency end,
      meta = case when jsonb_typeof(p_group->'meta') = 'object' then p_group->'meta' else meta end,
      meta_updated_at = v_meta_at
    where id = v_group_id and (meta_updated_at is null or v_meta_at > meta_updated_at);
  end if;

  insert into taimo_members as t (id, group_id, name, claimed, updated_at, pay)
  select x.id, v_group_id, left(x.name, 60), coalesce(x.claimed, false), x."updatedAt",
         case when jsonb_typeof(x.pay) = 'object' and pg_column_size(x.pay) < 2000 then x.pay else null end
  from jsonb_to_recordset(p_members) as x(id text, name text, claimed boolean, "updatedAt" timestamptz, pay jsonb)
  where x.id is not null and char_length(coalesce(x.name, '')) > 0 and x."updatedAt" is not null
  on conflict (id) do update
    set name = excluded.name,
        claimed = t.claimed or excluded.claimed,
        updated_at = excluded.updated_at,
        pay = excluded.pay
    where t.group_id = v_group_id and excluded.updated_at > t.updated_at;

  insert into taimo_expenses as t (id, group_id, amount, merchant, category, date, paid_by, shares, source, deleted, updated_at, extra)
  select x.id, v_group_id, x.amount, left(coalesce(x.merchant, ''), 120), left(coalesce(x.category, 'otros'), 30),
         x.date, coalesce(x."paidBy", ''), coalesce(x.shares, '{}'::jsonb), left(coalesce(x.source, 'manual'), 20),
         coalesce(x.deleted, false), x."updatedAt",
         case when jsonb_typeof(x.extra) = 'object' then x.extra else null end
  from jsonb_to_recordset(p_expenses) as x(
    id text, amount integer, merchant text, category text, date timestamptz, "paidBy" text,
    shares jsonb, source text, deleted boolean, "updatedAt" timestamptz, extra jsonb)
  where x.id is not null and x.amount is not null and x.date is not null and x."updatedAt" is not null
  on conflict (id) do update
    set amount = excluded.amount, merchant = excluded.merchant, category = excluded.category,
        date = excluded.date, paid_by = excluded.paid_by, shares = excluded.shares,
        source = excluded.source, deleted = excluded.deleted, updated_at = excluded.updated_at,
        extra = excluded.extra
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

revoke all on function public.taimo_sync(text, jsonb, jsonb, jsonb, jsonb) from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    grant execute on function public.taimo_sync(text, jsonb, jsonb, jsonb, jsonb) to anon, authenticated;
  end if;
end $$;
