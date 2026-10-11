-- The team list for the Tambayan, so the People tab can show every member, online or offline.
-- Run once in Supabase > SQL Editor.
create table if not exists public.tambayan_members (
  id text primary key,
  name text not null,
  first_name text,
  role text,
  look jsonb,
  batches int[] not null default '{}',
  admin boolean not null default false,
  last_seen timestamptz not null default now()
);

alter table public.tambayan_members enable row level security;

drop policy if exists "everyone sees the team list" on public.tambayan_members;
create policy "everyone sees the team list" on public.tambayan_members for select to anon, authenticated using (true);

drop policy if exists "add yourself" on public.tambayan_members;
create policy "add yourself" on public.tambayan_members for insert to authenticated with check (id = auth.uid()::text);

drop policy if exists "update yourself" on public.tambayan_members;
create policy "update yourself" on public.tambayan_members for update to authenticated using (id = auth.uid()::text) with check (id = auth.uid()::text);

grant select on public.tambayan_members to anon, authenticated;
grant insert, update on public.tambayan_members to authenticated;
