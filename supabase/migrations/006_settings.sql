create table if not exists settings (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);

alter table settings enable row level security;

create policy "Usuarios autenticados pueden leer settings"
  on settings for select
  using (auth.uid() is not null);
