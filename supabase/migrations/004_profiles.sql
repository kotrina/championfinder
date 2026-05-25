-- Tabla de perfiles con rol por usuario
create table if not exists profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  role       text not null default 'user' check (role in ('admin', 'user')),
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

-- Cada usuario puede leer su propio perfil (para saber su rol en el cliente)
create policy "Usuarios leen su propio perfil"
  on profiles for select
  using (auth.uid() = id);

-- La escritura solo se hace desde el service role (API admin), no desde el cliente

-- ─── Bootstrap: primer admin ────────────────────────────────────────────────
-- Ejecutar UNA VEZ en Supabase SQL Editor tras aplicar esta migración:
--
--   insert into profiles (id, role)
--   select id, 'admin'
--   from auth.users
--   where email = 'raul.cotrina@getmanfred.com'
--   on conflict (id) do update set role = 'admin';
