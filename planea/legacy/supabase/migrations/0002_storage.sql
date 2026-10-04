-- Bucket público para imágenes de planes. Cada usuario solo escribe en su carpeta (<uid>/archivo).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('plan-images', 'plan-images', true, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "imágenes de planes públicas" on storage.objects for select using (bucket_id = 'plan-images');
create policy "subir mis imágenes" on storage.objects for insert to authenticated
  with check (bucket_id = 'plan-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "borrar mis imágenes" on storage.objects for delete to authenticated
  using (bucket_id = 'plan-images' and (storage.foldername(name))[1] = auth.uid()::text);
