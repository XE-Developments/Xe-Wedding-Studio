create extension if not exists pgcrypto;

create table if not exists public.gallery_settings (
  id integer primary key check (id = 1),
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.gallery_photos (
  id uuid primary key default gen_random_uuid(),
  storage_key text not null unique,
  thumbnail_key text,
  caption text not null default '',
  download_name text not null,
  width integer not null,
  height integer not null,
  mime_type text not null,
  size bigint not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.gallery_settings enable row level security;
alter table public.gallery_photos enable row level security;

-- No public table policies are created. Only the backend service-role key accesses these tables.
insert into public.gallery_settings (id, settings)
values (1, '{"name":"XE Moments","title":"The moments we keep","description":"A collection of moments, gathered in one place.","showDownloads":true,"accent":"#b7a58a","background":"#f8f7f4","textColor":"#26251f"}'::jsonb)
on conflict (id) do nothing;

-- Migration for existing deployments: add the thumbnail key column if absent.
alter table public.gallery_photos add column if not exists thumbnail_key text;

-- Storage provider marker: new uploads use r2; existing rows default to legacy B2.
alter table public.gallery_photos add column if not exists storage_bucket text not null default 'b2';
