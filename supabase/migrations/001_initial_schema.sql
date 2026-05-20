-- Enum para el estado de una ejecución
create type run_status as enum ('pending', 'processing', 'done', 'error');

-- Tabla de ejecuciones
create table runs (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  filename      text not null,
  status        run_status not null default 'pending',
  total_contacts integer not null default 0,
  changed_count  integer not null default 0,
  error_count    integer not null default 0
);

-- Tabla de contactos procesados
create table contacts (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  run_id           uuid not null references runs(id) on delete cascade,
  contact_id       text not null,
  nombre           text not null,
  apellidos        text not null,
  linkedin_url     text not null,
  empresa_original text not null,
  empresa_actual   text,
  changed          boolean not null default false,
  error            text
);

-- Índices
create index contacts_run_id_idx on contacts(run_id);
create index runs_user_id_idx on runs(user_id);

-- RLS
alter table runs enable row level security;
alter table contacts enable row level security;

-- Políticas: cada usuario solo ve sus propias ejecuciones
create policy "users_own_runs" on runs
  for all using (auth.uid() = user_id);

-- Políticas: acceso a contactos a través del run del usuario
create policy "users_own_contacts" on contacts
  for all using (
    exists (
      select 1 from runs
      where runs.id = contacts.run_id
        and runs.user_id = auth.uid()
    )
  );
