-- WhatsApp chat id of the client who booked through the open-wa bot ("138392604016645@lid"):
-- with it the bot finds the client's pending booking, so each client holds at most one.
-- Apply before deploying the API version that reads it. The API only writes the column when it
-- has a value, so an older database keeps working for app edits.
alter table appointments add column if not exists whatsapp_chat_id text;

create index if not exists appointments_whatsapp_chat_id_idx
  on appointments (whatsapp_chat_id)
  where whatsapp_chat_id is not null;
