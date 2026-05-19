-- Bucket para almacenar los ficheros subidos por los usuarios
insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', false);

-- Solo el propietario puede subir y leer sus ficheros
create policy "users_upload_own_files" on storage.objects
  for insert with check (
    bucket_id = 'uploads'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "users_read_own_files" on storage.objects
  for select using (
    bucket_id = 'uploads'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "users_delete_own_files" on storage.objects
  for delete using (
    bucket_id = 'uploads'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
