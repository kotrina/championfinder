alter table people
  add column if not exists empresa_linkedin text,
  add column if not exists cargo_linkedin   text;
