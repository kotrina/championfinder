alter table people
  add column if not exists needs_sync boolean default true;
