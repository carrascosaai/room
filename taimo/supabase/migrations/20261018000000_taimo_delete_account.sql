-- Borrar la cuenta desde la app (lo exige Apple, guía 5.1.1(v)).
-- Borra la copia en la nube y el usuario de Supabase Auth del que llama.
-- Los grupos compartidos no son de nadie (se entra con el código), así que
-- no se tocan: quien se va solo deja de tenerlos en su móvil.
create or replace function public.taimo_delete_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not signed in';
  end if;
  delete from public.taimo_backups where user_id = uid;
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.taimo_delete_account() from public, anon;
grant execute on function public.taimo_delete_account() to authenticated;
