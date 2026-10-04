-- ════════════════════════════════════════════════════════════════
--  PLANEA — esquema inicial
--  Principios:
--   · Privacidad: nunca se expone la ubicación de nadie. Las asistencias
--     y votos individuales solo los ve su dueño; el resto ve agregados.
--   · Anonimato real: las vistas públicas ocultan author_id cuando
--     is_anonymous = true (la moderación sí puede verlo).
--   · Todo con Row Level Security.
-- ════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ─── Catálogo ────────────────────────────────────────────────────

create table public.cities (
  slug text primary key check (slug ~ '^[a-z0-9-]{2,40}$'),
  name text not null,
  region text not null default '',
  lat double precision not null,
  lng double precision not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.categories (
  slug text primary key,
  label text not null,
  emoji text not null,
  position smallint not null default 0
);

-- ─── Usuarios ────────────────────────────────────────────────────

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,24}$'),
  display_name text not null check (char_length(display_name) between 2 and 40),
  avatar_emoji text not null default '🙂' check (char_length(avatar_emoji) <= 16),
  avatar_color text not null default '#C8FF3D' check (avatar_color ~ '^#[0-9A-Fa-f]{6}$'),
  age smallint check (age between 16 and 99),
  city_slug text references public.cities (slug) on delete set null,
  xp integer not null default 0,
  role text not null default 'user' check (role in ('user', 'moderator', 'admin')),
  created_at timestamptz not null default now()
);

create table public.venues (
  id uuid primary key default gen_random_uuid(),
  slug text not null check (slug ~ '^[a-z0-9-]{2,80}$'),
  city_slug text not null references public.cities (slug),
  name text not null,
  category text not null references public.categories (slug),
  description text not null default '',
  neighborhood text not null default '',
  lat double precision not null,
  lng double precision not null,
  price_level smallint not null default 2 check (price_level between 1 and 4),
  price_from numeric(6, 2) not null default 0,
  age_min smallint not null default 18,
  age_max smallint not null default 35,
  music text[] not null default '{}',
  vibe text not null default 'fiesta' check (vibe in ('fiesta', 'tranquilo')),
  tags text[] not null default '{}',
  -- {"5": ["00:30","06:30"], ...} — clave = día de la noche (0 domingo); horas < 07:00 = día siguiente
  hours jsonb not null default '{}',
  nightly jsonb not null default '[]',
  image_url text,
  base_interest integer not null default 0,     -- línea base (demo / importación)
  base_rating numeric(2, 1) not null default 0,
  base_rating_count integer not null default 0,
  is_demo boolean not null default false,
  is_featured boolean not null default false,   -- monetización: local destacado
  owner_id uuid references public.profiles (id) on delete set null, -- futuro: panel para locales
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (city_slug, slug)
);
create index venues_city_idx on public.venues (city_slug);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null check (slug ~ '^[a-z0-9-]{2,80}$'),
  city_slug text not null references public.cities (slug),
  venue_id uuid references public.venues (id) on delete set null,
  title text not null,
  category text not null references public.categories (slug),
  description text not null default '',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  price_from numeric(6, 2) not null default 0,
  lineup jsonb not null default '[]',
  music text[] not null default '{}',
  vibe text not null default 'fiesta' check (vibe in ('fiesta', 'tranquilo')),
  age_min smallint not null default 18,
  age_max smallint not null default 35,
  lat double precision not null,
  lng double precision not null,
  image_url text,
  ticket_url text,                               -- monetización: venta de entradas
  base_interest integer not null default 0,
  is_demo boolean not null default false,
  is_featured boolean not null default false,    -- monetización: evento patrocinado
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  unique (city_slug, slug, starts_at)
);
create index events_city_time_idx on public.events (city_slug, starts_at);

-- Monetización futura: promociones / destacados con fechas.
create table public.promotions (
  id uuid primary key default gen_random_uuid(),
  city_slug text not null references public.cities (slug),
  target_type text not null check (target_type in ('venue', 'event')),
  target_id uuid not null,
  kind text not null check (kind in ('featured', 'sponsored', 'deal')),
  label text not null default '',
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- ─── Contenido de la comunidad ───────────────────────────────────

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  city_slug text not null references public.cities (slug),
  creator_id uuid default auth.uid() references public.profiles (id) on delete cascade,
  demo_author text,
  title text not null check (char_length(title) between 3 and 80),
  place_name text not null check (char_length(place_name) between 2 and 80),
  venue_id uuid references public.venues (id) on delete set null,
  category text not null references public.categories (slug),
  description text not null default '' check (char_length(description) <= 500),
  starts_at timestamptz not null,
  visibility text not null default 'public' check (visibility in ('public', 'link')),
  image_url text,
  base_attendees integer not null default 0,
  status text not null default 'visible' check (status in ('visible', 'hidden', 'removed')),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  check (creator_id is not null or is_demo)
);
create index plans_city_time_idx on public.plans (city_slug, starts_at);

-- "Me interesa" / "Me apunto" / "Estoy aquí". Privado: solo lo ve su dueño.
create table public.attendances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  target_type text not null check (target_type in ('venue', 'event', 'plan')),
  target_id uuid not null,
  kind text not null default 'interested' check (kind in ('interested', 'here')),
  night_key date not null default ((now() at time zone 'Europe/Madrid') - interval '7 hours')::date,
  created_at timestamptz not null default now(),
  unique (user_id, target_type, target_id, kind, night_key)
);
create index attendances_target_idx on public.attendances (target_type, target_id, kind);

-- "¿Merece la pena esta noche?" — un voto por persona y noche.
create table public.votes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  target_type text not null check (target_type in ('venue', 'event', 'plan')),
  target_id uuid not null,
  value smallint not null check (value in (-1, 1)),
  night_key date not null default ((now() at time zone 'Europe/Madrid') - interval '7 hours')::date,
  created_at timestamptz not null default now(),
  unique (user_id, target_type, target_id, night_key)
);
create index votes_target_idx on public.votes (target_type, target_id, night_key);

-- Salseo: encuestas (Poll), preguntas, confesiones (Confession), opiniones y predicciones.
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('venue', 'event', 'plan')),
  target_id uuid not null,
  author_id uuid default auth.uid() references public.profiles (id) on delete cascade,
  demo_author text,
  demo_emoji text,
  is_anonymous boolean not null default false,
  kind text not null check (kind in ('poll', 'question', 'confession', 'opinion', 'prediction')),
  body text not null check (char_length(body) between 3 and 280),
  status text not null default 'visible' check (status in ('visible', 'hidden', 'removed')),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  check (author_id is not null or is_demo)
);
create index posts_target_idx on public.posts (target_type, target_id, created_at desc);

create table public.poll_options (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  label text not null check (char_length(label) between 1 and 60),
  position smallint not null default 0,
  base_votes integer not null default 0
);
create index poll_options_post_idx on public.poll_options (post_id);

create table public.poll_votes (
  post_id uuid not null references public.posts (id) on delete cascade,
  option_id uuid not null references public.poll_options (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table public.post_replies (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  author_id uuid default auth.uid() references public.profiles (id) on delete cascade,
  is_anonymous boolean not null default true,
  body text not null check (char_length(body) between 1 and 200),
  status text not null default 'visible' check (status in ('visible', 'hidden', 'removed')),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  check (author_id is not null or is_demo)
);
create index post_replies_post_idx on public.post_replies (post_id, created_at);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues (id) on delete cascade,
  user_id uuid default auth.uid() references public.profiles (id) on delete cascade,
  demo_author text,
  demo_emoji text,
  rating smallint not null check (rating between 1 and 5),
  body text not null default '' check (char_length(body) <= 400),
  status text not null default 'visible' check (status in ('visible', 'hidden', 'removed')),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  check (user_id is not null or is_demo),
  unique (venue_id, user_id)
);

-- ─── Moderación ──────────────────────────────────────────────────

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  target_type text not null check (target_type in ('post', 'reply', 'plan', 'review', 'profile')),
  target_id uuid not null,
  reason text not null check (reason in ('spam', 'acoso', 'sexual', 'datos_personales', 'fraude', 'otro')),
  details text not null default '' check (char_length(details) <= 500),
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  resolved_by uuid references public.profiles (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (reporter_id, target_type, target_id)
);
create index reports_status_idx on public.reports (status, created_at);

create table public.blocks (
  blocker_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

-- ─── Métricas y gamificación ─────────────────────────────────────

create table public.page_views (
  target_type text not null check (target_type in ('venue', 'event', 'plan')),
  target_id uuid not null,
  day date not null default ((now() at time zone 'Europe/Madrid'))::date,
  views integer not null default 0,
  primary key (target_type, target_id, day)
);

create table public.xp_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  reason text not null,
  ref text not null,
  amount integer not null,
  created_at timestamptz not null default now(),
  unique (user_id, reason, ref)
);

-- ════════════════════════════════════════════════════════════════
--  Funciones
-- ════════════════════════════════════════════════════════════════

create or replace function public.is_moderator() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role in ('moderator', 'admin'));
$$;

create or replace function public.current_night() returns date
language sql stable as $$
  select ((now() at time zone 'Europe/Madrid') - interval '7 hours')::date;
$$;

-- Perfil automático al registrarse.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  base text;
  candidate text;
  n int := 0;
begin
  base := lower(regexp_replace(coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1), 'user'), '[^a-zA-Z0-9]+', '', 'g'));
  if char_length(base) < 3 then base := base || 'planea'; end if;
  base := left(base, 18);
  candidate := base;
  while exists (select 1 from profiles where username = candidate) loop
    n := n + 1;
    candidate := base || n::text;
  end loop;
  insert into profiles (id, username, display_name, city_slug)
  values (
    new.id,
    candidate,
    left(coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), nullif(new.raw_user_meta_data ->> 'full_name', ''), candidate), 40),
    (select slug from cities where slug = new.raw_user_meta_data ->> 'city_slug')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Barrera de contenido en base de datos (el cliente aplica un filtro más amplio).
create or replace function public.check_content() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  txt text;
  recent int;
begin
  if tg_table_name = 'plans' then
    txt := new.title || ' ' || new.place_name || ' ' || new.description;
  else
    txt := new.body;
  end if;
  if txt ~* '(\+?34[ .-]?)?[6789][0-9]{2}[ .-]?[0-9]{3}[ .-]?[0-9]{3}' then
    raise exception 'No compartas teléfonos.' using errcode = 'P0001';
  end if;
  if txt ~* '[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}' then
    raise exception 'No compartas emails.' using errcode = 'P0001';
  end if;
  if txt ~* '(https?://|www\.)' then
    raise exception 'No se permiten enlaces.' using errcode = 'P0001';
  end if;
  -- Límite anti-spam: 6 publicaciones cada 5 minutos por persona.
  if tg_table_name in ('posts', 'post_replies') and auth.uid() is not null then
    execute format('select count(*) from %I where author_id = $1 and created_at > now() - interval ''5 minutes''', tg_table_name)
      into recent using auth.uid();
    if recent >= 6 then
      raise exception 'Vas muy rápido. Espera un momento.' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

create trigger posts_content before insert or update of body on public.posts
  for each row when (not new.is_demo) execute function public.check_content();
create trigger replies_content before insert or update of body on public.post_replies
  for each row when (not new.is_demo) execute function public.check_content();
create trigger reviews_content before insert or update of body on public.reviews
  for each row when (not new.is_demo) execute function public.check_content();
create trigger plans_content before insert or update of title, place_name, description on public.plans
  for each row when (not new.is_demo) execute function public.check_content();

-- XP: se otorga en servidor, una vez por acción (evita farmear con toggles).
create or replace function public.award_xp(p_user uuid, p_reason text, p_ref text, p_amount int) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_user is null then return; end if;
  insert into xp_events (user_id, reason, ref, amount) values (p_user, p_reason, p_ref, p_amount)
  on conflict (user_id, reason, ref) do nothing;
  if found then
    update profiles set xp = xp + p_amount where id = p_user;
  end if;
end;
$$;

create or replace function public.xp_trigger() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  case tg_table_name
    when 'plans' then perform award_xp(new.creator_id, 'createPlan', new.id::text, 50);
    when 'reviews' then perform award_xp(new.user_id, 'review', new.venue_id::text, 25);
    when 'posts' then perform award_xp(new.author_id, 'post', new.id::text, 10);
    when 'post_replies' then perform award_xp(new.author_id, 'reply', new.post_id::text, 5);
    when 'poll_votes' then perform award_xp(new.user_id, 'pollVote', new.post_id::text, 5);
    when 'votes' then perform award_xp(new.user_id, 'vote', new.target_id::text || ':' || new.night_key::text, 5);
    when 'attendances' then
      if new.kind = 'here' then
        perform award_xp(new.user_id, 'discover', new.target_id::text, 20);
      else
        perform award_xp(new.user_id, 'attend', new.target_id::text || ':' || new.night_key::text, 10);
      end if;
  end case;
  return new;
end;
$$;

create trigger xp_plans after insert on public.plans for each row when (not new.is_demo) execute function public.xp_trigger();
create trigger xp_reviews after insert on public.reviews for each row when (not new.is_demo) execute function public.xp_trigger();
create trigger xp_posts after insert on public.posts for each row when (not new.is_demo) execute function public.xp_trigger();
create trigger xp_replies after insert on public.post_replies for each row when (not new.is_demo) execute function public.xp_trigger();
create trigger xp_poll_votes after insert on public.poll_votes for each row execute function public.xp_trigger();
create trigger xp_votes after insert on public.votes for each row execute function public.xp_trigger();
create trigger xp_attendances after insert on public.attendances for each row execute function public.xp_trigger();

-- Quien crea un plan se apunta automáticamente.
create or replace function public.plan_autojoin() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.creator_id is not null then
    insert into attendances (user_id, target_type, target_id, kind) values (new.creator_id, 'plan', new.id, 'interested')
    on conflict do nothing;
  end if;
  return new;
end;
$$;
create trigger plans_autojoin after insert on public.plans for each row execute function public.plan_autojoin();

-- Ocultación automática tras 3 denuncias de personas distintas.
create or replace function public.auto_hide_reported() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  n int;
begin
  select count(distinct reporter_id) into n from reports
  where target_type = new.target_type and target_id = new.target_id and status = 'open';
  if n >= 3 then
    case new.target_type
      when 'post' then update posts set status = 'hidden' where id = new.target_id and status = 'visible';
      when 'reply' then update post_replies set status = 'hidden' where id = new.target_id and status = 'visible';
      when 'plan' then update plans set status = 'hidden' where id = new.target_id and status = 'visible';
      when 'review' then update reviews set status = 'hidden' where id = new.target_id and status = 'visible';
      else null;
    end case;
  end if;
  return new;
end;
$$;
create trigger reports_auto_hide after insert on public.reports for each row execute function public.auto_hide_reported();

-- Visualizaciones (para tendencias). Anónimas, sin identificar a nadie.
create or replace function public.track_view(p_type text, p_id uuid) returns void
language sql security definer set search_path = public as $$
  insert into page_views (target_type, target_id, views) values (p_type, p_id, 1)
  on conflict (target_type, target_id, day) do update set views = page_views.views + 1;
$$;

-- Métricas agregadas por objetivo. Nunca devuelve identidades.
create or replace function public.get_target_stats(p_type text, p_ids uuid[])
returns table (target_id uuid, interested bigint, here_now bigint, votes_yes bigint, votes_no bigint, posts bigint, views_24h bigint, interested_24h bigint)
language sql stable security definer set search_path = public as $$
  select
    t.id,
    (select count(*) from attendances a where a.target_type = p_type and a.target_id = t.id and a.kind = 'interested'
       and (p_type <> 'venue' or a.night_key = current_night())),
    (select count(*) from attendances a where a.target_type = p_type and a.target_id = t.id and a.kind = 'here'
       and a.created_at > now() - interval '4 hours'),
    (select count(*) from votes v where v.target_type = p_type and v.target_id = t.id and v.night_key = current_night() and v.value = 1),
    (select count(*) from votes v where v.target_type = p_type and v.target_id = t.id and v.night_key = current_night() and v.value = -1),
    (select count(*) from posts p where p.target_type = p_type and p.target_id = t.id and p.status = 'visible'),
    (select coalesce(sum(views), 0) from page_views pv where pv.target_type = p_type and pv.target_id = t.id and pv.day >= current_date - 1),
    (select count(*) from attendances a where a.target_type = p_type and a.target_id = t.id and a.created_at > now() - interval '24 hours')
  from unnest(p_ids) as t(id);
$$;

-- Bloquear al autor de una publicación (también si es anónima) sin revelar quién es.
create or replace function public.block_post_author(p_post uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  target uuid;
begin
  if auth.uid() is null then raise exception 'Inicia sesión'; end if;
  select author_id into target from posts where id = p_post;
  if target is null or target = auth.uid() then return; end if;
  insert into blocks (blocker_id, blocked_id) values (auth.uid(), target) on conflict do nothing;
end;
$$;

-- Cola de moderación (solo moderadores).
create or replace function public.moderation_queue()
returns table (id uuid, target_type text, target_id uuid, reason text, details text, status text, created_at timestamptz, preview text, reports bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_moderator() then raise exception 'Solo moderación'; end if;
  return query
  select r.id, r.target_type, r.target_id, r.reason, r.details, r.status, r.created_at,
    coalesce(
      (select p.body from posts p where r.target_type = 'post' and p.id = r.target_id),
      (select pr.body from post_replies pr where r.target_type = 'reply' and pr.id = r.target_id),
      (select pl.title || ' — ' || pl.description from plans pl where r.target_type = 'plan' and pl.id = r.target_id),
      (select rv.body from reviews rv where r.target_type = 'review' and rv.id = r.target_id),
      (select pf.display_name from profiles pf where r.target_type = 'profile' and pf.id = r.target_id),
      '(contenido eliminado)'
    ),
    (select count(*) from reports r2 where r2.target_type = r.target_type and r2.target_id = r.target_id)
  from reports r
  where r.status = 'open'
  order by r.created_at desc
  limit 200;
end;
$$;

create or replace function public.moderate(p_report uuid, p_action text) returns void
language plpgsql security definer set search_path = public as $$
declare
  r reports%rowtype;
begin
  if not is_moderator() then raise exception 'Solo moderación'; end if;
  select * into r from reports where id = p_report;
  if not found then return; end if;
  if p_action = 'remove' then
    case r.target_type
      when 'post' then update posts set status = 'removed' where id = r.target_id;
      when 'reply' then update post_replies set status = 'removed' where id = r.target_id;
      when 'plan' then update plans set status = 'removed' where id = r.target_id;
      when 'review' then update reviews set status = 'removed' where id = r.target_id;
      else null;
    end case;
    update reports set status = 'resolved', resolved_by = auth.uid(), resolved_at = now()
    where target_type = r.target_type and target_id = r.target_id and status = 'open';
  elsif p_action = 'dismiss' then
    update reports set status = 'dismissed', resolved_by = auth.uid(), resolved_at = now() where id = p_report;
    -- Si estaba oculto automáticamente, se restaura.
    case r.target_type
      when 'post' then update posts set status = 'visible' where id = r.target_id and status = 'hidden';
      when 'reply' then update post_replies set status = 'visible' where id = r.target_id and status = 'hidden';
      when 'plan' then update plans set status = 'visible' where id = r.target_id and status = 'hidden';
      when 'review' then update reviews set status = 'visible' where id = r.target_id and status = 'hidden';
      else null;
    end case;
  else
    raise exception 'Acción no válida';
  end if;
end;
$$;

-- Estadísticas del perfil propio.
create or replace function public.my_stats()
returns table (plans_created bigint, places_visited bigint, votes bigint, reviews bigint, posts bigint, interested bigint, concerts bigint, copas bigint, university bigint, late_nights bigint, cities bigint)
language sql stable security definer set search_path = public as $$
  select
    (select count(*) from plans where creator_id = auth.uid()),
    (select count(distinct target_id) from attendances where user_id = auth.uid() and kind = 'here'),
    (select count(*) from votes where user_id = auth.uid()) + (select count(*) from poll_votes where user_id = auth.uid()),
    (select count(*) from reviews where user_id = auth.uid()),
    (select count(*) from posts where author_id = auth.uid()),
    (select count(*) from attendances where user_id = auth.uid() and kind = 'interested'),
    (select count(*) from attendances a join events e on e.id = a.target_id where a.user_id = auth.uid() and a.target_type = 'event' and e.category = 'conciertos'),
    (select count(distinct a.target_id) from attendances a join venues v on v.id = a.target_id where a.user_id = auth.uid() and a.target_type = 'venue' and v.category in ('copas', 'pubs')),
    (select count(*) from attendances a join events e on e.id = a.target_id where a.user_id = auth.uid() and a.target_type = 'event' and e.category = 'universitario'),
    (select count(*) from attendances a join events e on e.id = a.target_id where a.user_id = auth.uid() and a.target_type = 'event'
       and extract(hour from e.starts_at at time zone 'Europe/Madrid') between 1 and 6),
    (select count(distinct city_slug) from plans where creator_id = auth.uid());
$$;

-- ════════════════════════════════════════════════════════════════
--  Vistas públicas (sin identidades de anónimos, sin asistencias individuales)
-- ════════════════════════════════════════════════════════════════

create view public.profiles_public as
  select id, username, display_name, avatar_emoji, avatar_color, xp, created_at from public.profiles;

create view public.posts_public as
  select
    p.id, p.target_type, p.target_id,
    case when p.is_anonymous then null else p.author_id end as author_id,
    case when p.is_anonymous then 'Anónimo' else coalesce(pr.display_name, p.demo_author, 'Alguien') end as author_name,
    case when p.is_anonymous then '🎭' else coalesce(pr.avatar_emoji, p.demo_emoji, '🙂') end as author_emoji,
    p.is_anonymous, p.kind, p.body, p.created_at, p.is_demo,
    (select count(*) from public.post_replies r where r.post_id = p.id and r.status = 'visible') as reply_count,
    coalesce((
      select json_agg(json_build_object(
        'id', o.id, 'label', o.label,
        'votes', o.base_votes + (select count(*) from public.poll_votes v where v.option_id = o.id)
      ) order by o.position)
      from public.poll_options o where o.post_id = p.id
    ), '[]'::json) as options
  from public.posts p
  left join public.profiles pr on pr.id = p.author_id
  where p.status = 'visible'
    and not exists (select 1 from public.blocks b where b.blocker_id = auth.uid() and b.blocked_id = p.author_id);

create view public.replies_public as
  select
    r.id, r.post_id,
    case when r.is_anonymous then null else r.author_id end as author_id,
    case when r.is_anonymous then 'Anónimo' else coalesce(pr.display_name, 'Alguien') end as author_name,
    case when r.is_anonymous then '🎭' else coalesce(pr.avatar_emoji, '🙂') end as author_emoji,
    r.is_anonymous, r.body, r.created_at
  from public.post_replies r
  left join public.profiles pr on pr.id = r.author_id
  where r.status = 'visible'
    and not exists (select 1 from public.blocks b where b.blocker_id = auth.uid() and b.blocked_id = r.author_id);

create view public.reviews_public as
  select
    rv.id, rv.venue_id, rv.user_id as author_id,
    coalesce(pr.display_name, rv.demo_author, 'Alguien') as author_name,
    coalesce(pr.avatar_emoji, rv.demo_emoji, '🙂') as author_emoji,
    rv.rating, rv.body, rv.created_at
  from public.reviews rv
  left join public.profiles pr on pr.id = rv.user_id
  where rv.status = 'visible'
    and not exists (select 1 from public.blocks b where b.blocker_id = auth.uid() and b.blocked_id = rv.user_id);

create view public.plans_public as
  select
    pl.id, pl.city_slug, pl.creator_id,
    coalesce(pr.display_name, pl.demo_author, 'Alguien') as creator_name,
    pl.title, pl.place_name, pl.venue_id, pl.category, pl.description, pl.starts_at,
    pl.visibility, pl.image_url, pl.is_demo, pl.created_at,
    pl.base_attendees + (select count(*) from public.attendances a where a.target_type = 'plan' and a.target_id = pl.id) as attendees
  from public.plans pl
  left join public.profiles pr on pr.id = pl.creator_id
  where pl.status = 'visible'
    and not exists (select 1 from public.blocks b where b.blocker_id = auth.uid() and b.blocked_id = pl.creator_id);

create view public.venue_ratings as
  select v.id as venue_id,
    round(((v.base_rating * v.base_rating_count) + coalesce(sum(r.rating) filter (where not r.is_demo), 0))
      / nullif(v.base_rating_count + count(r.id) filter (where not r.is_demo), 0), 1) as rating,
    v.base_rating_count + count(r.id) filter (where not r.is_demo) as rating_count
  from public.venues v
  left join public.reviews r on r.venue_id = v.id and r.status = 'visible'
  group by v.id;

-- ════════════════════════════════════════════════════════════════
--  Row Level Security
-- ════════════════════════════════════════════════════════════════

alter table public.cities enable row level security;
alter table public.categories enable row level security;
alter table public.profiles enable row level security;
alter table public.venues enable row level security;
alter table public.events enable row level security;
alter table public.promotions enable row level security;
alter table public.plans enable row level security;
alter table public.attendances enable row level security;
alter table public.votes enable row level security;
alter table public.posts enable row level security;
alter table public.poll_options enable row level security;
alter table public.poll_votes enable row level security;
alter table public.post_replies enable row level security;
alter table public.reviews enable row level security;
alter table public.reports enable row level security;
alter table public.blocks enable row level security;
alter table public.page_views enable row level security;
alter table public.xp_events enable row level security;

-- Catálogo: lectura pública; escritura solo admin (o service role desde el panel).
create policy "catálogo público" on public.cities for select using (true);
create policy "categorías públicas" on public.categories for select using (true);
create policy "locales públicos" on public.venues for select using (true);
create policy "eventos públicos" on public.events for select using (true);
create policy "promociones activas" on public.promotions for select using (now() between starts_at and ends_at);
create policy "admin gestiona locales" on public.venues for all using (public.is_moderator()) with check (public.is_moderator());
create policy "admin gestiona eventos" on public.events for all using (public.is_moderator()) with check (public.is_moderator());

-- Perfiles: cada cual ve y edita el suyo (lo público va por profiles_public).
create policy "ver mi perfil" on public.profiles for select using (id = auth.uid() or public.is_moderator());
create policy "editar mi perfil" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
revoke update on public.profiles from anon, authenticated;
grant update (display_name, avatar_emoji, avatar_color, age, city_slug) on public.profiles to authenticated;

-- Planes: lectura de visibles; los de "solo con enlace" se leen por id (uuid no adivinable).
create policy "planes visibles" on public.plans for select using (status = 'visible' or creator_id = auth.uid() or public.is_moderator());
create policy "crear plan" on public.plans for insert to authenticated
  with check (creator_id = auth.uid() and not is_demo and base_attendees = 0 and status = 'visible');
create policy "borrar mi plan" on public.plans for delete using (creator_id = auth.uid());

-- Asistencias y votos: privados.
create policy "mis asistencias" on public.attendances for select using (user_id = auth.uid());
create policy "apuntarme" on public.attendances for insert to authenticated with check (user_id = auth.uid());
create policy "desapuntarme" on public.attendances for delete using (user_id = auth.uid());

create policy "mis votos" on public.votes for select using (user_id = auth.uid());
create policy "votar" on public.votes for insert to authenticated with check (user_id = auth.uid());
create policy "cambiar voto" on public.votes for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "quitar voto" on public.votes for delete using (user_id = auth.uid());

-- Salseo: lectura vía posts_public; escritura propia.
create policy "mis posts" on public.posts for select using (author_id = auth.uid() or public.is_moderator());
create policy "publicar" on public.posts for insert to authenticated
  with check (author_id = auth.uid() and not is_demo and status = 'visible');
create policy "borrar mi post" on public.posts for delete using (author_id = auth.uid());

create policy "opciones públicas" on public.poll_options for select using (true);
create policy "crear opciones de mi encuesta" on public.poll_options for insert to authenticated
  with check (base_votes = 0 and exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid() and p.kind = 'poll'));

create policy "mis votos de encuesta" on public.poll_votes for select using (user_id = auth.uid());
create policy "votar encuesta" on public.poll_votes for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.poll_options o where o.id = option_id and o.post_id = poll_votes.post_id));

create policy "mis respuestas" on public.post_replies for select using (author_id = auth.uid() or public.is_moderator());
create policy "responder" on public.post_replies for insert to authenticated
  with check (author_id = auth.uid() and not is_demo and status = 'visible');
create policy "borrar mi respuesta" on public.post_replies for delete using (author_id = auth.uid());

create policy "reseñas propias" on public.reviews for select using (user_id = auth.uid() or public.is_moderator());
create policy "reseñar" on public.reviews for insert to authenticated with check (user_id = auth.uid() and not is_demo and status = 'visible');
create policy "editar mi reseña" on public.reviews for update using (user_id = auth.uid()) with check (user_id = auth.uid() and status = 'visible');
create policy "borrar mi reseña" on public.reviews for delete using (user_id = auth.uid());

-- Denuncias: cualquiera con sesión denuncia; solo moderación las gestiona.
create policy "denunciar" on public.reports for insert to authenticated with check (reporter_id = auth.uid() and status = 'open');
create policy "mis denuncias" on public.reports for select using (reporter_id = auth.uid() or public.is_moderator());

create policy "mis bloqueos" on public.blocks for select using (blocker_id = auth.uid());
create policy "bloquear" on public.blocks for insert to authenticated with check (blocker_id = auth.uid());
create policy "desbloquear" on public.blocks for delete using (blocker_id = auth.uid());

create policy "mi xp" on public.xp_events for select using (user_id = auth.uid());
-- page_views: sin políticas → solo accesible vía track_view() / get_target_stats().

-- Permisos de ejecución de las funciones públicas.
revoke execute on function public.award_xp(uuid, text, text, int) from public, anon, authenticated;
grant execute on function public.track_view(text, uuid) to anon, authenticated;
grant execute on function public.get_target_stats(text, uuid[]) to anon, authenticated;
grant execute on function public.block_post_author(uuid) to authenticated;
grant execute on function public.moderation_queue() to authenticated;
grant execute on function public.moderate(uuid, text) to authenticated;
grant execute on function public.my_stats() to authenticated;
