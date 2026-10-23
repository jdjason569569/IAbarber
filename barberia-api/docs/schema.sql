-- Run in the Supabase SQL editor.
create table if not exists appointments (
  id           bigint generated always as identity primary key,
  client       text not null,
  service      text not null,
  date         date not null,
  time         time not null,
  service_cost numeric(10, 2) not null default 0,
  extras       jsonb not null default '[]'::jsonb,
  cancelled    boolean not null default false,
  created_at   timestamptz not null default now()
);

-- The API uses the service key (bypasses RLS); enable RLS so the anon key has no access.
alter table appointments enable row level security;

-- Single-barber shop: two active appointments can never share a date and time.
-- Cancelled appointments free the slot. Also guards against concurrent bookings.
create unique index if not exists appointments_active_slot_unique
  on appointments (date, time)
  where not cancelled;

-- Services offered by the shop (managed from the app's Settings tab).
create table if not exists services (
  id    bigint generated always as identity primary key,
  name  text not null check (length(trim(name)) > 0),
  price numeric(10, 2) not null check (price >= 0)
);
create unique index if not exists services_name_unique on services (lower(name));
alter table services enable row level security;

-- Migration: the `barber` column was removed (the shop has a single barber).
-- Run it once on a database created before this change; it is safe to repeat.
alter table appointments drop column if exists barber;

-- Migration: the `status` text column became the boolean flag `cancelled`
-- (true = cancelled, false = active). Run once on a database created before this change;
-- it is safe to repeat. Cancelled appointments are kept, never deleted.
alter table appointments add column if not exists cancelled boolean not null default false;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'appointments' and column_name = 'status'
  ) then
    update appointments set cancelled = true where status = 'cancelled';
    drop index if exists appointments_active_slot_unique;
    alter table appointments drop column status;
  end if;
end $$;

create unique index if not exists appointments_active_slot_unique
  on appointments (date, time)
  where not cancelled;
