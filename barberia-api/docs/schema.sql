-- Run in the Supabase SQL editor.
create table if not exists appointments (
  id           bigint generated always as identity primary key,
  client       text not null,
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

-- Migration: the services catalog was removed; the barber says the price of each appointment
-- (stored in service_cost). Run it once after deploying the API without services; it is safe to repeat.
alter table appointments drop column if exists service;
drop table if exists services;

-- Haircut advisor catalog. The app measures the face on the phone and the API ranks these cuts
-- by `suitability` (0 to 1 per face shape: oval, round, square, oblong, heart, diamond, triangle).
-- Example pictures go in the public Storage bucket `haircut-images`, in a folder named after the
-- cut id (e.g. `haircut-images/pompadour/1.jpg`); the API lists that folder. Run once; it is safe to repeat.
create table if not exists haircuts (
  id          text primary key,
  name        text     not null,
  description text     not null default '',
  suitability jsonb    not null default '{}'::jsonb,
  sort_order  smallint not null default 0,
  active      boolean  not null default true
);
alter table haircuts enable row level security;

insert into haircuts (id, name, description, suitability, sort_order) values
  ('buzz', 'Rapado', 'Pelo muy corto y parejo en toda la cabeza. Resalta la mandíbula.',
    '{"oval":0.8,"square":0.9,"oblong":0.3,"diamond":0.4,"heart":0.3,"round":0.2,"triangle":0.3}', 1),
  ('crewCut', 'Crew cut', 'Arriba un poco más largo y lados en degradado. Clásico y fácil de llevar.',
    '{"oval":0.9,"square":1,"oblong":0.6,"diamond":0.5,"heart":0.4,"round":0.5,"triangle":0.5}', 2),
  ('sidePart', 'Raya al lado', 'Corte clásico peinado hacia un lado con la raya marcada.',
    '{"oval":0.9,"square":0.9,"oblong":0.7,"diamond":0.6,"heart":0.7,"round":0.7,"triangle":0.7}', 3),
  ('pompadour', 'Pompadour', 'Mucho volumen hacia arriba y atrás en el frente, lados en degradado.',
    '{"oval":0.8,"round":1,"triangle":0.9,"square":0.6,"diamond":0.5,"heart":0.4,"oblong":0.1}', 4),
  ('quiff', 'Tupé', 'Frente levantado con textura y lados cortos. Da altura sin ser tan formal.',
    '{"oval":0.9,"round":0.9,"triangle":0.9,"diamond":0.7,"square":0.6,"heart":0.5,"oblong":0.2}', 5),
  ('texturedCrop', 'Crop texturizado', 'Arriba corto y con textura hacia adelante, flequillo corto y degradado.',
    '{"oval":0.9,"oblong":0.9,"square":0.8,"diamond":0.9,"heart":0.8,"round":0.3,"triangle":0.5}', 6),
  ('undercut', 'Undercut', 'Lados y nuca muy cortos con contraste fuerte; arriba largo peinado hacia atrás o al lado.',
    '{"oval":0.8,"round":0.8,"square":0.8,"triangle":0.6,"diamond":0.5,"heart":0.4,"oblong":0.3}', 7),
  ('fringe', 'Flequillo', 'El pelo cae hacia adelante y cubre parte de la frente. Acorta visualmente el rostro.',
    '{"oblong":1,"heart":0.9,"diamond":0.9,"oval":0.7,"square":0.5,"triangle":0.4,"round":0.1}', 8),
  ('mediumFlow', 'Medio largo', 'Largo medio con movimiento, cubre parte de las orejas y la nuca.',
    '{"heart":1,"diamond":0.9,"oblong":0.8,"triangle":0.8,"oval":0.8,"square":0.6,"round":0.3}', 9)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('haircut-images', 'haircut-images', true)
on conflict (id) do nothing;
