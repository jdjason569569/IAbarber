-- Migration 001: workspaces (admin / guest). Run once in the Supabase SQL editor; it is safe to repeat.
-- Every appointment, weekly hour and day block belongs to a workspace. The admin (Supabase Auth user)
-- works on the "admin" workspace; "Entrar como invitado" uses the shared "guest" demo workspace.
-- The ids are fixed: the API knows them (src/shared/workspace/workspace-context.ts).

create table if not exists workspaces (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  kind       text not null check (kind in ('admin', 'guest')),
  created_at timestamptz not null default now()
);
alter table workspaces enable row level security;

insert into workspaces (id, name, kind) values
  ('00000000-0000-0000-0000-000000000001', 'Barbería', 'admin'),
  ('00000000-0000-0000-0000-000000000002', 'Demo invitado', 'guest')
on conflict (id) do nothing;

-- Which Supabase Auth user manages which workspace.
create table if not exists workspace_members (
  user_id      uuid not null references auth.users (id) on delete cascade,
  workspace_id uuid not null references workspaces (id) on delete cascade,
  role         text not null default 'admin',
  primary key (user_id, workspace_id)
);
alter table workspace_members enable row level security;

-- Owner column. Existing rows go to the admin workspace. The default keeps rows inserted by an
-- older API version (deployed before this migration) in the admin workspace too.
alter table appointments
  add column if not exists workspace_id uuid not null
  default '00000000-0000-0000-0000-000000000001' references workspaces (id);
alter table business_hours
  add column if not exists workspace_id uuid not null
  default '00000000-0000-0000-0000-000000000001' references workspaces (id);
alter table unavailable_slots
  add column if not exists workspace_id uuid not null
  default '00000000-0000-0000-0000-000000000001' references workspaces (id);

-- One weekly schedule per workspace: the primary key becomes (workspace_id, weekday).
alter table business_hours drop constraint if exists business_hours_pkey;
alter table business_hours add primary key (workspace_id, weekday);

-- The guest demo starts with a copy of the admin's weekly hours.
insert into business_hours (workspace_id, weekday, is_open, open_hour, close_hour)
select '00000000-0000-0000-0000-000000000002', weekday, is_open, open_hour, close_hour
from business_hours
where workspace_id = '00000000-0000-0000-0000-000000000001'
on conflict (workspace_id, weekday) do nothing;

-- A slot is unique per workspace: the admin and the guest demo can book the same date and time.
drop index if exists appointments_active_slot_unique;
create unique index appointments_active_slot_unique
  on appointments (workspace_id, date, time)
  where not cancelled and not walk_in and not completed;

create index if not exists appointments_workspace_date_idx on appointments (workspace_id, date);
drop index if exists unavailable_slots_date;
create index if not exists unavailable_slots_workspace_date on unavailable_slots (workspace_id, date);

-- After creating the admin user in Authentication > Users, link it to the admin workspace:
-- insert into workspace_members (user_id, workspace_id)
-- select id, '00000000-0000-0000-0000-000000000001' from auth.users where email = 'TU_EMAIL'
-- on conflict do nothing;
