alter table people
  add column if not exists email_linkedin text,
  add column if not exists email_linkedin_status text; -- null | 'pending' | 'not_found'
