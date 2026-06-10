alter table people
  add column if not exists is_historical boolean default false;
