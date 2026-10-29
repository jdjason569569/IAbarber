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

-- Migration: walk-in clients (served without a booking). They do not hold a slot of the agenda,
-- so the unique (date, time) index ignores them. Run once; it is safe to repeat.
alter table appointments add column if not exists walk_in boolean not null default false;
drop index if exists appointments_active_slot_unique;
create unique index appointments_active_slot_unique
  on appointments (date, time)
  where not cancelled and not walk_in;

-- Migration: `completed` = the barber confirmed the service was done. Monthly revenue only
-- counts completed appointments. Run once; it is safe to repeat.
alter table appointments add column if not exists completed boolean not null default false;

-- Weekly availability (managed from the app's Settings tab). One row per configured weekday;
-- weekdays without a row use the default hours, 07:00 to midnight. close_hour 24 = midnight.
create table if not exists business_hours (
  weekday    smallint primary key check (weekday between 0 and 6), -- 0 = Sunday
  is_open    boolean  not null default true,
  open_hour  smallint not null default 7  check (open_hour between 0 and 23),
  close_hour smallint not null default 24 check (close_hour between 1 and 24),
  check (open_hour < close_hour)
);
alter table business_hours enable row level security;

-- Hours the barber is not available on a given date (managed from the app's Settings tab).
-- Whole hours; to_hour 24 = midnight. Appointments cannot start inside a block.
create table if not exists unavailable_slots (
  id        bigint generated always as identity primary key,
  date      date     not null,
  from_hour smallint not null check (from_hour between 0 and 23),
  to_hour   smallint not null check (to_hour between 1 and 24),
  check (from_hour < to_hour)
);
create index if not exists unavailable_slots_date on unavailable_slots (date);
alter table unavailable_slots enable row level security;
