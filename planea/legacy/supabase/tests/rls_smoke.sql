-- Prueba de humo de RLS, triggers y moderación. Ver README → "Probar el esquema en local".
-- Los ERROR esperados son denegaciones de seguridad (suplantación, teléfonos, xp, anon).
\set ON_ERROR_STOP 0
\pset tuples_only on
insert into auth.users (id, email, raw_user_meta_data) values
 ('11111111-1111-4111-8111-111111111111','ana@x.com','{"display_name":"Ana","city_slug":"sevilla"}'),
 ('22222222-2222-4222-8222-222222222222','beto@x.com','{"display_name":"Beto"}'),
 ('33333333-3333-4333-8333-333333333333','caro@x.com','{}'),
 ('44444444-4444-4444-8444-444444444444','mod@x.com','{"display_name":"Mod"}');
update profiles set role='moderator' where id='44444444-4444-4444-8444-444444444444';
select 'perfiles creados por trigger: ' || count(*) from profiles;
select 'username ana: ' || username || ' ciudad ' || coalesce(city_slug,'-') from profiles where display_name='Ana';

-- Ana actúa
set role authenticated; set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
insert into plans (city_slug, title, place_name, category, starts_at) values ('sevilla','Plan de Ana','Triana','copas', now()) returning 'plan creado';
insert into plans (city_slug, title, place_name, category, starts_at, creator_id) values ('sevilla','Suplantación','x','copas', now(), '22222222-2222-4222-8222-222222222222');
insert into plans (city_slug, title, place_name, category, starts_at) values ('sevilla','Llamad al 612345678','x','copas', now());
insert into attendances (target_type, target_id) select 'venue', id from venues where slug='sala-giralda-club';
insert into votes (target_type, target_id, value) select 'venue', id, 1 from venues where slug='sala-giralda-club';
insert into posts (target_type, target_id, kind, body, is_anonymous) select 'venue', id, 'confession', 'Confesión de Ana', true from venues where slug='sala-giralda-club' returning 'post anónimo creado';
update profiles set xp = 99999 where id = auth.uid();
update profiles set display_name = 'Ana B' where id = auth.uid() returning 'nombre actualizado';
select 'xp ana (plan 50 + attend 10 + vote 5 + post 10 = 75): ' || xp from profiles where id = auth.uid();
select 'ana ve sus asistencias: ' || count(*) from attendances;

-- Beto
set request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';
select 'beto ve asistencias de otros: ' || count(*) from attendances;
select 'beto ve votos de otros: ' || count(*) from votes;
select 'beto ve perfiles privados ajenos: ' || count(*) from profiles;
select 'autor de la confesión visto por beto: ' || coalesce(author_id::text, 'NULL (anónimo)') || ' / ' || author_name from posts_public where body = 'Confesión de Ana';
select 'beto lee tabla posts de ana: ' || count(*) from posts where body='Confesión de Ana';
delete from plans where title = 'Plan de Ana';
select 'plan de ana sigue: ' || count(*) from plans_public where title='Plan de Ana';
select 'stats: ' || interested || ' interesados, ' || votes_yes || ' sí' from get_target_stats('venue', array(select id from venues where slug='sala-giralda-club'));
select public.moderation_queue();
-- denuncias: 3 personas → oculto
insert into reports (target_type, target_id, reason) select 'post', id, 'spam' from posts_public where body='Confesión de Ana';
set request.jwt.claim.sub = '33333333-3333-4333-8333-333333333333';
insert into reports (target_type, target_id, reason) select 'post', id, 'acoso' from posts_public where body='Confesión de Ana';
set request.jwt.claim.sub = '44444444-4444-4444-8444-444444444444';
insert into reports (target_type, target_id, reason) select 'post', id, 'otro' from posts_public where body='Confesión de Ana';
select 'visible tras 3 denuncias: ' || count(*) from posts_public where body='Confesión de Ana';
select 'cola moderación: ' || count(*) from moderation_queue();
select 'oculto (tabla): ' || status from posts where body='Confesión de Ana';
select moderate((select id from reports limit 1), 'dismiss');
select 'visible tras descartar: ' || count(*) from posts_public where body='Confesión de Ana';
-- bloqueo de autor anónimo
set request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';
select block_post_author((select id from posts where body='Confesión de Ana' and false union select p.id from posts_public p where p.body='Confesión de Ana'));
select 'beto ve la confesión tras bloquear: ' || count(*) from posts_public where body='Confesión de Ana';
select 'plans de ana vistos por beto tras bloqueo: ' || count(*) from plans_public where title='Plan de Ana';
-- anónimo (sin sesión)
reset request.jwt.claim.sub; set role anon;
select 'anon lee locales: ' || count(*) from venues;
insert into posts (target_type, target_id, kind, body) values ('venue', gen_random_uuid(), 'opinion', 'hola');
select 'anon ve plans_public: ' || count(*) from plans_public;
reset role;
