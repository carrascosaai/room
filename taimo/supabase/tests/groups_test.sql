-- Prueba de extremo a extremo de los grupos compartidos, como el rol `anon` de Supabase.
-- Ejecutar: psql -v ON_ERROR_STOP=1 -f supabase/tests/groups_test.sql
\set ON_ERROR_STOP 1
begin;
set local role anon;

-- Sin código no se ve nada: las tablas están cerradas.
do $$ begin
  perform 1 from public.taimo_groups;
  raise exception 'FALLO: anon puede leer taimo_groups';
exception when insufficient_privilege then null;
end $$;

-- La función interna no se puede llamar sin código.
do $$ begin
  perform public.taimo_snapshot('g1');
  raise exception 'FALLO: anon puede llamar a taimo_snapshot';
exception when insufficient_privilege then null;
end $$;

-- Ana comparte su grupo con un gasto.
select (public.taimo_create_group('g1', 'Piso', '🏠',
  '[{"id":"m-ana","name":"Ana","claimed":true,"updatedAt":"2026-10-01T10:00:00Z"},
    {"id":"m-luis","name":"Luis","claimed":false,"updatedAt":"2026-10-01T10:00:00Z"}]',
  '[{"id":"e1","amount":9000,"merchant":"Mercadona","category":"super","date":"2026-10-02T10:00:00Z",
     "paidBy":"m-ana","shares":{"m-ana":4500,"m-luis":4500},"source":"applepay","deleted":false,
     "updatedAt":"2026-10-02T10:00:00Z"}]'
)) ->> 'group' as created \gset
select (:'created'::jsonb ->> 'code') as code \gset
\echo código: :code

-- Luis se une con el código y ve el gasto.
select (public.taimo_join(lower(:'code')) -> 'group' ->> 'name') = 'Piso' as join_minusculas \gset
\if :join_minusculas \else \echo 'FALLO join en minúsculas' \quit \endif
select jsonb_array_length(public.taimo_join(:'code') -> 'expenses') = 1 as join_ve_gasto \gset
\if :join_ve_gasto \else \echo 'FALLO join' \quit \endif

-- Luis reclama su miembro, edita el gasto (más reciente) y Ana manda una versión vieja: gana Luis.
select public.taimo_sync(:'code',
  '[{"id":"m-luis","name":"Luis","claimed":true,"updatedAt":"2026-10-03T10:00:00Z"}]',
  '[{"id":"e1","amount":9500,"merchant":"Mercadona","category":"super","date":"2026-10-02T10:00:00Z",
     "paidBy":"m-ana","shares":{"m-ana":4750,"m-luis":4750},"source":"applepay","deleted":false,
     "updatedAt":"2026-10-03T10:00:00Z"}]') is not null;
select (public.taimo_sync(:'code', '[]',
  '[{"id":"e1","amount":1,"merchant":"viejo","category":"super","date":"2026-10-02T10:00:00Z",
     "paidBy":"m-ana","shares":{},"source":"manual","deleted":false,"updatedAt":"2026-10-02T11:00:00Z"}]')
  -> 'expenses' -> 0 ->> 'amount')::int = 9500 as gana_el_mas_reciente \gset
\if :gana_el_mas_reciente \else \echo 'FALLO last-write-wins' \quit \endif

select (public.taimo_join(:'code') -> 'members') @> '[{"id":"m-luis","claimed":true}]' as luis_reclamado \gset
\if :luis_reclamado \else \echo 'FALLO claimed' \quit \endif

-- Borrado: queda como marca para que los demás móviles lo quiten.
select (public.taimo_sync(:'code', '[]',
  '[{"id":"e1","amount":0,"merchant":"","category":"otros","date":"2026-10-04T10:00:00Z",
     "paidBy":"","shares":{},"source":"manual","deleted":true,"updatedAt":"2026-10-04T10:00:00Z"}]')
  -> 'expenses' -> 0 ->> 'deleted')::boolean as borrado \gset
\if :borrado \else \echo 'FALLO borrado' \quit \endif

-- Otro grupo no puede pisar filas del primero aunque conozca sus ids.
select (public.taimo_create_group('g2', 'Viaje', '✈️') -> 'group' ->> 'code') as code2 \gset
select public.taimo_sync(:'code2', '[]',
  '[{"id":"e1","amount":666,"merchant":"hack","category":"otros","date":"2026-10-05T10:00:00Z",
     "paidBy":"x","shares":{},"source":"manual","deleted":false,"updatedAt":"2030-01-01T00:00:00Z"}]') is not null;
select (public.taimo_join(:'code') -> 'expenses' -> 0 ->> 'merchant') = '' as aislado \gset
\if :aislado \else \echo 'FALLO aislamiento entre grupos' \quit \endif
select jsonb_array_length(public.taimo_join(:'code2') -> 'expenses') = 0 as aislado2 \gset
\if :aislado2 \else \echo 'FALLO aislamiento 2' \quit \endif

-- Código falso.
do $$ begin
  perform public.taimo_join('NOEXISTE');
  raise exception 'FALLO: código falso aceptado';
exception when no_data_found then null;
end $$;

-- v2: ajustes del grupo (tipo, moneda, presupuesto…) con "gana el más reciente".
select public.taimo_sync(:'code', '[]', '[]', '[]',
  '{"name":"Viaje a Japón","emoji":"✈️","kind":"trip","currency":"EUR","meta":{"budget":150000,"trip":{"start":"2026-11-01","end":"2026-11-10"}},"updatedAt":"2026-10-05T00:00:00Z"}') is not null;
select public.taimo_sync(:'code', '[]', '[]', '[]',
  '{"name":"viejo","emoji":"x","kind":"flat","currency":"USD","meta":{},"updatedAt":"2026-10-01T00:00:00Z"}') is not null;
select (public.taimo_join(:'code')->'group') @> '{"name":"Viaje a Japón","kind":"trip","currency":"EUR","meta":{"budget":150000}}' as meta_ok \gset
\if :meta_ok \else \echo 'FALLO ajustes del grupo' \quit \endif
-- v2: el gasto conserva cómo se repartió y la moneda original.
select (public.taimo_sync(:'code', '[]',
  '[{"id":"e9","amount":1800,"merchant":"Ramen","category":"comer","date":"2026-11-02T10:00:00Z","paidBy":"m-ana","shares":{"m-ana":1200,"m-luis":600},"source":"manual","deleted":false,"updatedAt":"2026-11-02T10:00:00Z","extra":{"splitMode":"weights","weights":{"m-ana":2,"m-luis":1},"original":{"amount":300000,"currency":"JPY","rate":0.006}}}]')
  -> 'expenses') @> '[{"id":"e9","extra":{"original":{"currency":"JPY"}}}]' as extra_ok \gset
\if :extra_ok \else \echo 'FALLO extra del gasto' \quit \endif

-- v3: cada miembro comparte cómo cobra; el bote común es un "miembro" especial en los pagos.
select (public.taimo_sync(:'code',
  '[{"id":"m-ana","name":"Ana","claimed":true,"updatedAt":"2026-12-01T00:00:00Z","pay":{"bizum":"600111222","paypal":"ana"}}]')
  -> 'members') @> '[{"id":"m-ana","pay":{"paypal":"ana"}}]' as pay_ok \gset
\if :pay_ok \else \echo 'FALLO datos de cobro del miembro' \quit \endif
select (public.taimo_sync(:'code', '[]', '[]',
  '[{"id":"p1","from":"m-ana","to":"__pot__","amount":5000,"date":"2026-12-01T00:00:00Z","deleted":false,"updatedAt":"2026-12-01T00:00:00Z"}]')
  -> 'settlements') @> '[{"id":"p1","to":"__pot__"}]' as pot_ok \gset
\if :pot_ok \else \echo 'FALLO aportación al bote' \quit \endif

-- v4: una fecha en el futuro (2099) se recorta a "ahora + 5 min" y no congela la fila.
select (public.taimo_sync(:'code', '[]',
  '[{"id":"e-fut","amount":100,"merchant":"futuro","category":"otros","date":"2026-10-05T10:00:00Z",
     "paidBy":"m-ana","shares":{},"source":"manual","deleted":false,"updatedAt":"2099-01-01T00:00:00Z"}]')
  -> 'expenses') @> '[{"id":"e-fut"}]' as fut_insertado \gset
\if :fut_insertado \else \echo 'FALLO gasto con fecha futura' \quit \endif
select (select (e ->> 'updatedAt')::timestamptz <= now() + interval '5 minutes'
        from jsonb_array_elements(public.taimo_join(:'code') -> 'expenses') e where e ->> 'id' = 'e-fut') as fut_recortado \gset
\if :fut_recortado \else \echo 'FALLO fecha futura no recortada' \quit \endif
select public.taimo_sync(:'code', '[]', '[]', '[]',
  '{"name":"congelado","emoji":"x","kind":"flat","currency":"USD","meta":{},"updatedAt":"2099-01-01T00:00:00Z"}') is not null;
select (public.taimo_join(:'code') -> 'group' ->> 'updatedAt')::timestamptz <= now() + interval '5 minutes' as meta_recortado \gset
\if :meta_recortado \else \echo 'FALLO fecha futura de ajustes no recortada' \quit \endif

-- v4: datos de cobro de un miembro reclamado: una fila "no reclamada" no los cambia; campos raros fuera.
select public.taimo_sync(:'code',
  '[{"id":"m-luis","name":"Luis","claimed":false,"updatedAt":"2026-10-06T00:00:00Z","pay":{"bizum":"666000666"}}]') is not null;
select (public.taimo_join(:'code') -> 'members') @> '[{"id":"m-luis","pay":{"bizum":"666000666"}}]' = false as pay_protegido \gset
\if :pay_protegido \else \echo 'FALLO pay de miembro reclamado sobrescrito' \quit \endif
select (select m -> 'pay' from jsonb_array_elements(public.taimo_sync(:'code',
  '[{"id":"m-new","name":"Eva","claimed":false,"updatedAt":"2026-10-06T00:00:00Z","pay":{"bizum":"600","evil":"x","iban":"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"}}]')
  -> 'members') m where m ->> 'id' = 'm-new') = '{"bizum":"600"}'::jsonb as pay_limpio \gset
\if :pay_limpio \else \echo 'FALLO limpieza de datos de cobro' \quit \endif

-- v4: ids demasiado largos se ignoran.
select jsonb_array_length(public.taimo_sync(:'code', '[]',
  format('[{"id":"%s","amount":1,"merchant":"x","category":"otros","date":"2026-10-05T10:00:00Z","paidBy":"m-ana","shares":{},"source":"manual","deleted":false,"updatedAt":"2026-10-05T10:00:00Z"}]', repeat('x', 65))::jsonb)
  -> 'expenses') = (select count(*) from jsonb_array_elements(public.taimo_join(:'code') -> 'expenses') e
                     where char_length(e ->> 'id') <= 64) as id_largo \gset
\if :id_largo \else \echo 'FALLO id demasiado largo aceptado' \quit \endif

\echo 'OK: todas las pruebas de grupos pasan'
rollback;
