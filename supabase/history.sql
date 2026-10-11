-- Saved chat for the Tambayan. Run once in Supabase > SQL Editor.
create table if not exists public.tambayan_messages (
  id text primary key,
  thread text not null,
  from_id text not null,
  name text not null,
  body text not null default '',
  image text,
  reply jsonb,
  reactions jsonb not null default '{}'::jsonb,
  pinned boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists tambayan_messages_thread_time on public.tambayan_messages (thread, created_at desc);

alter table public.tambayan_messages enable row level security;

-- Rooms are readable by anyone in the office. A private chat ("dm:<id>:<id>") only by its two people.
drop policy if exists "read rooms and own private chats" on public.tambayan_messages;
create policy "read rooms and own private chats" on public.tambayan_messages for select to anon, authenticated
  using (thread not like 'dm:%' or auth.uid()::text in (split_part(thread, ':', 2), split_part(thread, ':', 3)));

drop policy if exists "post messages" on public.tambayan_messages;
create policy "post messages" on public.tambayan_messages for insert to anon, authenticated
  with check (
    (thread not like 'dm:%' or auth.uid()::text in (split_part(thread, ':', 2), split_part(thread, ':', 3)))
    and (auth.uid() is null or from_id = auth.uid()::text)
    and char_length(body) <= 300
    and (image is null or char_length(image) <= 220000)
  );

drop policy if exists "react and pin" on public.tambayan_messages;
create policy "react and pin" on public.tambayan_messages for update to anon, authenticated
  using (thread not like 'dm:%' or auth.uid()::text in (split_part(thread, ':', 2), split_part(thread, ':', 3)))
  with check (thread not like 'dm:%' or auth.uid()::text in (split_part(thread, ':', 2), split_part(thread, ':', 3)));

-- Nobody can rewrite or delete a message from the site: only reactions and the pin can change.
revoke update, delete on public.tambayan_messages from anon, authenticated;
grant select, insert on public.tambayan_messages to anon, authenticated;
grant update (reactions, pinned) on public.tambayan_messages to anon, authenticated;
