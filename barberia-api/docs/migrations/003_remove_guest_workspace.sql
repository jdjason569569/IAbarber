-- Migration 003: removes the guest demo workspace. Run once in the Supabase SQL editor; it is safe to repeat.
-- The app no longer has a guest mode (only the admin logs in), so its workspace and data are deleted.
-- Applied on 2026-11-10.

begin;
delete from appointments       where workspace_id = '00000000-0000-0000-0000-000000000002';
delete from unavailable_slots  where workspace_id = '00000000-0000-0000-0000-000000000002';
delete from business_hours     where workspace_id = '00000000-0000-0000-0000-000000000002';
delete from device_tokens      where workspace_id = '00000000-0000-0000-0000-000000000002';
delete from workspace_members  where workspace_id = '00000000-0000-0000-0000-000000000002';
delete from workspaces         where id = '00000000-0000-0000-0000-000000000002' and kind = 'guest';
commit;
