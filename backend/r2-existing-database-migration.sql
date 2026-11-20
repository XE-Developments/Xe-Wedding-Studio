-- R2-ONLY EXISTING DATABASE MIGRATION
-- BACK UP SUPABASE FIRST.
-- IMPORTANT: Before running the UPDATE, make sure every existing original and thumbnail
-- object is already copied into the Cloudflare R2 bucket xe-wedding-studio under the same keys.
-- This script changes metadata only; it does NOT copy files from Backblaze or another provider.

alter table public.gallery_photos
  add column if not exists storage_bucket text not null default 'r2';

alter table public.gallery_photos
  alter column storage_bucket set default 'r2';

-- Run this only after the objects have been copied into R2:
update public.gallery_photos set storage_bucket = 'r2';

grant usage on schema public to service_role;
grant select, insert, update, delete on table public.gallery_photos to service_role;
grant select, insert, update, delete on table public.gallery_settings to service_role;
