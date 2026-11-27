-- Migration 007: the barber's name, used in the appointment reminders ("¡Pilas Andrés! En 10 minuticos…").
-- Run once in the Supabase SQL editor before deploying; it is safe to repeat.
-- The app reads and writes it through GET/PUT /settings/barber-name.
alter table shop_settings add column if not exists barber_name text not null default '';
