-- Taimo v4: endurecimiento de la sincronización de grupos.
--
-- 1. Las fechas `updatedAt` las pone el móvil. Antes, una fecha en el futuro
--    (p. ej. 2099) dejaba un gasto, una liquidación, los ajustes del grupo o los
--    datos de cobro de un miembro "congelados" para siempre: nadie podía
--    sobrescribirlos con "gana el más reciente". Ahora toda fecha se recorta a
--    como mucho now() + 5 minutos (margen para relojes algo adelantados).
-- 2. Límites de tamaño: ids <= 64, comercio <= 120, datos de cobro <= 64 por
--    campo y solo las claves conocidas, reparto (shares) <= 4096 bytes,
--    filas por llamada y filas totales por grupo.
-- 3. Datos de cobro (`pay`) de un miembro ya reclamado: solo se cambian si la
--    fila entrante también lo marca como reclamado y es más reciente.
--    LIMITACIÓN: no hay cuentas, así que el servidor no sabe quién llama;
--    cualquiera con el código del grupo puede enviar `claimed: true`. Esto solo
--    evita sobrescrituras accidentales; la protección real necesitaría
--    autenticación por miembro (fuera del alcance de este cambio).
--
-- Las firmas de las funciones no cambian: la app sigue funcionando igual.

-- Repara filas que ya tengan fechas en el futuro (posibles ataques previos).
update public.taimo_expenses set updated_at = now() where updated_at > now() + interval '5 minutes';
update public.taimo_settlements set updated_at = now() where updated_at > now() + interval '5 minutes';
update public.taimo_members set updated_at = now() where updated_at > now() + interval '5 minutes';
update public.taimo_groups set meta_updated_at = now() where meta_updated_at > now() + interval '5 minutes';

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
  -- Ninguna fecha del móvil puede quedar más allá de este punto.
  v_max timestamptz := now() + interval '5 minutes';
begin
  if p_code is null or char_length(p_code) > 64 then
    raise exception 'grupo no encontrado' using errcode = 'P0002';
  end if;
  select id into v_group_id from taimo_groups where code = p_code;
  if v_group_id is null then
    raise exception 'grupo no encontrado' using errcode = 'P0002';
  end if;
  p_members := coalesce(p_members, '[]'::jsonb);
  p_expenses := coalesce(p_expenses, '[]'::jsonb);
  p_settlements := coalesce(p_settlements, '[]'::jsonb);
  if jsonb_typeof(p_members) <> 'array' or jsonb_typeof(p_expenses) <> 'array'
     or jsonb_typeof(p_settlements) <> 'array' then
    raise exception 'formato no válido' using errcode = '22023';
  end if;
  if jsonb_array_length(p_members) > 50 or jsonb_array_length(p_expenses) > 2000
     or jsonb_array_length(p_settlements) > 2000 then
    raise exception 'demasiados cambios de una vez' using errcode = '22023';
  end if;
  if p_group is not null and pg_column_size(p_group) > 50000 then
    raise exception 'ajustes del grupo demasiado grandes' using errcode = '22023';
  end if;

  -- Ajustes del grupo: solo si son más recientes que los guardados.
  if jsonb_typeof(p_group) = 'object' and p_group ? 'updatedAt' then
    v_meta_at := least((p_group->>'updatedAt')::timestamptz, v_max);
    update taimo_groups set
      name = left(coalesce(nullif(p_group->>'name', ''), name), 80),
      emoji = left(coalesce(nullif(p_group->>'emoji', ''), emoji), 16),
      kind = case when p_group->>'kind' in ('couple', 'flat', 'trip', 'other') then p_group->>'kind' else kind end,
      currency = case when coalesce(p_group->>'currency', '') ~ '^[A-Z]{3}$' then p_group->>'currency' else currency end,
      meta = case when jsonb_typeof(p_group->'meta') = 'object' and pg_column_size(p_group->'meta') < 50000
                  then p_group->'meta' else meta end,
      meta_updated_at = v_meta_at
    where id = v_group_id and v_meta_at is not null and (meta_updated_at is null or v_meta_at > meta_updated_at);
  end if;

  insert into taimo_members as t (id, group_id, name, claimed, updated_at, pay)
  select x.id, v_group_id, left(x.name, 60), coalesce(x.claimed, false), least(x."updatedAt", v_max),
         case when jsonb_typeof(x.pay) = 'object' then (
           select jsonb_object_agg(k, v)
           from jsonb_each(x.pay) as e(k, v)
           where k in ('bizum', 'iban', 'paypal', 'revolut')
             and jsonb_typeof(v) = 'string' and char_length(v #>> '{}') between 1 and 64
         ) else null end
  from jsonb_to_recordset(p_members) as x(id text, name text, claimed boolean, "updatedAt" timestamptz, pay jsonb)
  where x.id is not null and char_length(x.id) <= 64
    and char_length(coalesce(x.name, '')) > 0 and x."updatedAt" is not null
  on conflict (id) do update
    set name = excluded.name,
        claimed = t.claimed or excluded.claimed,
        updated_at = excluded.updated_at,
        -- Un miembro reclamado solo cambia sus datos de cobro si la fila también viene reclamada.
        pay = case when t.claimed and not excluded.claimed then t.pay else excluded.pay end
    where t.group_id = v_group_id and excluded.updated_at > t.updated_at;

  insert into taimo_expenses as t (id, group_id, amount, merchant, category, date, paid_by, shares, source, deleted, updated_at, extra)
  select x.id, v_group_id, x.amount, left(coalesce(x.merchant, ''), 120), left(coalesce(x.category, 'otros'), 30),
         x.date, coalesce(x."paidBy", ''), coalesce(x.shares, '{}'::jsonb), left(coalesce(x.source, 'manual'), 20),
         coalesce(x.deleted, false), least(x."updatedAt", v_max),
         case when jsonb_typeof(x.extra) = 'object' and pg_column_size(x.extra) < 5000 then x.extra else null end
  from jsonb_to_recordset(p_expenses) as x(
    id text, amount integer, merchant text, category text, date timestamptz, "paidBy" text,
    shares jsonb, source text, deleted boolean, "updatedAt" timestamptz, extra jsonb)
  where x.id is not null and char_length(x.id) <= 64
    and x.amount is not null and x.amount between 0 and 100000000
    and x.date is not null and x."updatedAt" is not null
    and char_length(coalesce(x."paidBy", '')) <= 64
    and (x.shares is null or (jsonb_typeof(x.shares) = 'object' and pg_column_size(x.shares) <= 4096))
  on conflict (id) do update
    set amount = excluded.amount, merchant = excluded.merchant, category = excluded.category,
        date = excluded.date, paid_by = excluded.paid_by, shares = excluded.shares,
        source = excluded.source, deleted = excluded.deleted, updated_at = excluded.updated_at,
        extra = excluded.extra
    where t.group_id = v_group_id and excluded.updated_at > t.updated_at;

  insert into taimo_settlements as t (id, group_id, from_member, to_member, amount, date, deleted, updated_at)
  select x.id, v_group_id, coalesce(x."from", ''), coalesce(x."to", ''), x.amount, x.date,
         coalesce(x.deleted, false), least(x."updatedAt", v_max)
  from jsonb_to_recordset(p_settlements) as x(
    id text, "from" text, "to" text, amount integer, date timestamptz, deleted boolean, "updatedAt" timestamptz)
  where x.id is not null and char_length(x.id) <= 64
    and x.amount is not null and x.amount between 0 and 100000000
    and x.date is not null and x."updatedAt" is not null
    and char_length(coalesce(x."from", '')) <= 64 and char_length(coalesce(x."to", '')) <= 64
  on conflict (id) do update
    set from_member = excluded.from_member, to_member = excluded.to_member, amount = excluded.amount,
        date = excluded.date, deleted = excluded.deleted, updated_at = excluded.updated_at
    where t.group_id = v_group_id and excluded.updated_at > t.updated_at;

  -- Topes por grupo (deshace toda la llamada si se superan).
  if (select count(*) from taimo_members where group_id = v_group_id) > 200
     or (select count(*) from taimo_expenses where group_id = v_group_id) > 20000
     or (select count(*) from taimo_settlements where group_id = v_group_id) > 20000 then
    raise exception 'el grupo es demasiado grande' using errcode = '54000';
  end if;

  update taimo_groups set updated_at = now() where id = v_group_id;
  return taimo_snapshot(v_group_id);
end;
$$;

create or replace function public.taimo_create_group(
  p_id text,
  p_name text,
  p_emoji text,
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
  v_code text;
begin
  if p_id is null or char_length(p_id) not between 1 and 64 then
    raise exception 'id de grupo no válido' using errcode = '22023';
  end if;
  if exists (select 1 from taimo_groups where id = p_id) then
    raise exception 'el grupo ya está compartido' using errcode = '23505';
  end if;
  v_code := (
    select string_agg(substr('23456789ABCDEFGHJKMNPQRSTUVWXYZ', 1 + (get_byte(b, i) % 31), 1), '')
    from (select decode(md5(gen_random_uuid()::text || clock_timestamp()::text), 'hex') as b) r,
         generate_series(0, 15) as i
  );
  insert into taimo_groups (id, code, name, emoji)
  values (p_id, v_code, left(coalesce(nullif(p_name, ''), '?'), 80), left(coalesce(nullif(p_emoji, ''), '👥'), 16));
  return taimo_sync(v_code, p_members, p_expenses, p_settlements, p_group);
end;
$$;

create or replace function public.taimo_join(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_id text;
begin
  if p_code is null or char_length(p_code) > 64 then
    raise exception 'grupo no encontrado' using errcode = 'P0002';
  end if;
  select id into v_group_id from taimo_groups where code = upper(trim(p_code));
  if v_group_id is null then
    raise exception 'grupo no encontrado' using errcode = 'P0002';
  end if;
  return taimo_snapshot(v_group_id);
end;
$$;

revoke all on function public.taimo_sync(text, jsonb, jsonb, jsonb, jsonb) from public;
revoke all on function public.taimo_create_group(text, text, text, jsonb, jsonb, jsonb, jsonb) from public;
revoke all on function public.taimo_join(text) from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    grant execute on function public.taimo_sync(text, jsonb, jsonb, jsonb, jsonb) to anon, authenticated;
    grant execute on function public.taimo_create_group(text, text, text, jsonb, jsonb, jsonb, jsonb) to anon, authenticated;
    grant execute on function public.taimo_join(text) to anon, authenticated;
  end if;
end $$;
