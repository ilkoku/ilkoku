begin;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('system', 'comment', 'editor_request', 'editor_review', 'publisher_request', 'work')),
  title text not null check (char_length(btrim(title)) between 1 and 160),
  message text not null check (char_length(btrim(message)) between 1 and 1000),
  related_entity_type text check (
    related_entity_type is null
    or related_entity_type in ('work', 'chapter', 'comment', 'editor_request', 'editor_review', 'publisher_request')
  ),
  related_entity_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  constraint notifications_related_entity_pair check (
    (related_entity_type is null and related_entity_id is null)
    or (related_entity_type is not null and related_entity_id is not null)
  )
);

create index if not exists notifications_user_unread_idx
  on public.notifications (user_id, created_at desc)
  where read_at is null;
create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "Kullanıcı kendi bildirimlerini okuyabilir" on public.notifications;
create policy "Kullanıcı kendi bildirimlerini okuyabilir"
  on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Kullanıcı kendi bildirimini okundu işaretleyebilir" on public.notifications;
create policy "Kullanıcı kendi bildirimini okundu işaretleyebilir"
  on public.notifications for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and read_at is not null);

revoke all on table public.notifications from public, anon, authenticated;
grant select on table public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;
grant all on table public.notifications to service_role;

commit;
