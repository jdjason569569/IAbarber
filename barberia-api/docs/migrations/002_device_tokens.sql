-- Migration 002: device tokens for push notifications. Run once in the Supabase SQL editor; it is safe to repeat.
-- Each row is one phone (Firebase Cloud Messaging registration token) that receives the pushes of a
-- workspace, e.g. "new booking from WhatsApp" for the admin. The API writes it with the service key.

create table if not exists device_tokens (
  token        text primary key,
  workspace_id uuid not null references workspaces (id) on delete cascade,
  platform     text not null default 'android',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
alter table device_tokens enable row level security;

create index if not exists device_tokens_workspace_idx on device_tokens (workspace_id);
