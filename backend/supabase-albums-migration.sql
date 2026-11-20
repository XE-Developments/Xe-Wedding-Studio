-- Run this in Supabase SQL Editor after backing up your database.
create extension if not exists pgcrypto;
create table if not exists public.gallery_albums (
 id uuid primary key default gen_random_uuid(),
 slug text not null unique,
 name text not null,
 pass_hash text not null,
 sort_order integer not null default 0,
 created_at timestamptz not null default now()
);
create table if not exists public.gallery_album_photos (
 id uuid primary key default gen_random_uuid(),
 album_id uuid not null references public.gallery_albums(id) on delete cascade,
 storage_key text not null,
 thumbnail_key text,
 caption text not null default '',
 download_name text not null default 'photo',
 width integer, height integer, mime_type text, size bigint,
 sort_order integer not null default 0,
 created_at timestamptz not null default now()
);
create index if not exists gallery_album_photos_album_order_idx on public.gallery_album_photos(album_id, sort_order, created_at);
grant usage on schema public to service_role;
grant select, insert, update, delete on public.gallery_albums to service_role;
grant select, insert, update, delete on public.gallery_album_photos to service_role;
