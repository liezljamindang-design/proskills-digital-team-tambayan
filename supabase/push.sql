-- Phone and desktop notifications. Run once in Supabase > SQL Editor.
create table if not exists public.tambayan_push (
  endpoint text primary key,
  member_id text not null,
  sub jsonb not null,
  scope text not null default 'direct',
  batches int[] not null default '{}',
  updated_at timestamptz not null default now()
);
alter table public.tambayan_push enable row level security;
drop policy if exists "save my device" on public.tambayan_push;
create policy "save my device" on public.tambayan_push for insert to authenticated with check (member_id = auth.uid()::text);
drop policy if exists "update my device" on public.tambayan_push;
create policy "update my device" on public.tambayan_push for update to authenticated using (member_id = auth.uid()::text) with check (member_id = auth.uid()::text);
drop policy if exists "remove my device" on public.tambayan_push;
create policy "remove my device" on public.tambayan_push for delete to authenticated using (member_id = auth.uid()::text);
drop policy if exists "see my device" on public.tambayan_push;
create policy "see my device" on public.tambayan_push for select to authenticated using (member_id = auth.uid()::text);
grant select, insert, update, delete on public.tambayan_push to authenticated;

-- The keys that sign notifications. No policies on purpose: browsers cannot read this table.
create table if not exists public.tambayan_push_config (
  id int primary key,
  public_key text not null,
  private_key text not null
);
alter table public.tambayan_push_config enable row level security;
revoke all on public.tambayan_push_config from anon, authenticated;
