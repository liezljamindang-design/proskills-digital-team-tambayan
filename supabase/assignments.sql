-- Batch assignments made by admins. A member with a row here is locked to that batch.
-- Run once in Supabase > SQL Editor.
create table if not exists public.tambayan_assignments (
  member_id text primary key,
  batches int[] not null,
  updated_at timestamptz not null default now()
);

alter table public.tambayan_assignments enable row level security;

drop policy if exists "everyone reads assignments" on public.tambayan_assignments;
create policy "everyone reads assignments" on public.tambayan_assignments for select to anon, authenticated using (true);

drop policy if exists "admins assign" on public.tambayan_assignments;
create policy "admins assign" on public.tambayan_assignments for insert to authenticated
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "admins reassign" on public.tambayan_assignments;
create policy "admins reassign" on public.tambayan_assignments for update to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "admins unassign" on public.tambayan_assignments;
create policy "admins unassign" on public.tambayan_assignments for delete to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

grant select on public.tambayan_assignments to anon, authenticated;
grant insert, update, delete on public.tambayan_assignments to authenticated;
