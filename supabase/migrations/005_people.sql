create table if not exists people (
  pipedrive_id      integer primary key,
  nombre            text,
  apellidos         text,
  email             text,
  organizacion      text,
  marketing_status  text,
  rol               text,
  linkedin_url      text,
  won_deals         integer not null default 0,
  total_activities  integer not null default 0,
  location          text,
  synced_at         timestamptz,
  created_at        timestamptz not null default now()
);

alter table people enable row level security;

create policy "Usuarios autenticados pueden leer contactos"
  on people for select
  using (auth.uid() is not null);
