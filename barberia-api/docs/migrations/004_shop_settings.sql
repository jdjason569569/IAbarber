-- Migration 004: shop settings (one row per workspace). Run once in the Supabase SQL editor; it is safe to repeat.
-- service_price: value of the haircut; WhatsApp bookings are created with it (before: always $0).
-- The API writes it with the service key; the app goes through GET/PUT /settings/service-price.

create table if not exists shop_settings (
  workspace_id  uuid primary key references workspaces (id) on delete cascade,
  service_price numeric(12, 2) not null default 0 check (service_price >= 0),
  updated_at    timestamptz not null default now()
);
alter table shop_settings enable row level security;
