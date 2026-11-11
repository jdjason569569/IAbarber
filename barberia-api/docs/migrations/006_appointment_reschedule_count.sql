-- Times the client moved a booking to another slot from WhatsApp (the bot allows one move).
-- Apply before deploying the API version that reads it. The API only writes the column when it
-- is above 0, so an older database keeps working for app edits.
alter table appointments add column if not exists reschedule_count integer not null default 0;
