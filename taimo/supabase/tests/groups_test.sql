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

\echo 'OK: todas las pruebas de grupos pasan'
rollback;
