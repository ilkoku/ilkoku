begin;

create table if not exists public.editor_feedback (
  id uuid primary key default gen_random_uuid(),
  work_id uuid not null references public.works(id) on delete restrict,
  chapter_id uuid references public.chapters(id) on delete restrict,
  editor_id uuid not null references public.profiles(id) on delete restrict,
  author_id uuid not null references public.profiles(id) on delete restrict,
  title text not null check (char_length(btrim(title)) between 3 and 160),
  content text not null check (char_length(btrim(content)) between 20 and 20000),
  category text not null check (category in ('genel', 'kurgu', 'karakter', 'anlatım', 'dil', 'yapı', 'yayın_hazırlığı')),
  status text not null default 'unread' check (status in ('unread', 'read', 'archived')),
  priority text not null default 'normal' check (priority in ('normal', 'important')),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  read_at timestamptz,
  archived_at timestamptz,
  constraint editor_feedback_work_author_fkey
    foreign key (work_id, author_id) references public.works(id, author_id) on delete restrict,
  constraint editor_feedback_participants_differ check (editor_id <> author_id),
  constraint editor_feedback_read_consistency check (status = 'unread' or read_at is not null),
  constraint editor_feedback_archive_consistency check (status <> 'archived' or archived_at is not null)
);

create index if not exists editor_feedback_author_status_created_idx
  on public.editor_feedback (author_id, status, created_at desc);
create index if not exists editor_feedback_author_priority_idx
  on public.editor_feedback (author_id, priority, created_at desc);
create index if not exists editor_feedback_editor_work_idx
  on public.editor_feedback (editor_id, work_id, created_at desc);
create index if not exists editor_feedback_work_chapter_idx
  on public.editor_feedback (work_id, chapter_id);

create or replace function public.validate_editor_feedback_record()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  work_author uuid;
begin
  select works.author_id into work_author
  from public.works
  where works.id = new.work_id;

  if work_author is null or new.author_id <> work_author then
    raise exception 'Geri bildirim yazarı eser sahibiyle eşleşmiyor.' using errcode = '23514';
  end if;

  if new.chapter_id is not null and not exists (
    select 1 from public.chapters
    where chapters.id = new.chapter_id and chapters.work_id = new.work_id
  ) then
    raise exception 'Bölüm seçilen esere ait değil.' using errcode = '23514';
  end if;

  if not exists (
    select 1 from public.profiles
    where profiles.id = new.editor_id
      and profiles.role = 'editor'::public.user_role
      and profiles.role_approved_at is not null
  ) then
    raise exception 'Geri bildirim yalnızca onaylı bir editör tarafından oluşturulabilir.' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.editor_requests
    where editor_requests.work_id = new.work_id
      and editor_requests.editor_id = new.editor_id
      and editor_requests.author_id = new.author_id
      and editor_requests.status in ('accepted', 'in_review', 'completed')
  ) then
    raise exception 'Editör bu eser için yetkili değil.' using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function public.validate_editor_feedback_record() from public, anon, authenticated;

create or replace function public.enforce_editor_feedback_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  actor_role public.user_role := public.current_profile_role();
begin
  if actor is null then
    return new;
  end if;

  if actor_role = 'writer'::public.user_role and old.author_id = actor then
    if (new.editor_id, new.author_id, new.work_id, new.chapter_id, new.title, new.content, new.category, new.priority)
      is distinct from
      (old.editor_id, old.author_id, old.work_id, old.chapter_id, old.title, old.content, old.category, old.priority) then
      raise exception 'Yazar geri bildirim içeriğini değiştiremez.' using errcode = '42501';
    end if;

    if old.status = 'unread' and new.status = 'read' then
      new.read_at := coalesce(new.read_at, timezone('utc'::text, now()));
      new.archived_at := null;
    elsif old.status = 'read' and new.status = 'archived' then
      new.read_at := coalesce(old.read_at, timezone('utc'::text, now()));
      new.archived_at := coalesce(new.archived_at, timezone('utc'::text, now()));
    else
      raise exception 'İzin verilmeyen geri bildirim durum geçişi.' using errcode = '42501';
    end if;
  elsif actor_role = 'editor'::public.user_role and old.editor_id = actor then
    if (new.editor_id, new.author_id, new.work_id, new.chapter_id, new.status, new.read_at, new.archived_at)
      is distinct from
      (old.editor_id, old.author_id, old.work_id, old.chapter_id, old.status, old.read_at, old.archived_at) then
      raise exception 'Editör geri bildirimin kimlik veya okunma alanlarını değiştiremez.' using errcode = '42501';
    end if;
  else
    raise exception 'Bu geri bildirimi güncelleme yetkiniz yok.' using errcode = '42501';
  end if;

  new.updated_at := timezone('utc'::text, now());
  return new;
end;
$$;

revoke all on function public.enforce_editor_feedback_update() from public, anon, authenticated;

drop trigger if exists validate_editor_feedback_record on public.editor_feedback;
create trigger validate_editor_feedback_record
  before insert or update of work_id, chapter_id, editor_id, author_id on public.editor_feedback
  for each row execute function public.validate_editor_feedback_record();

drop trigger if exists enforce_editor_feedback_update on public.editor_feedback;
create trigger enforce_editor_feedback_update
  before update on public.editor_feedback
  for each row execute function public.enforce_editor_feedback_update();

drop trigger if exists set_editor_feedback_updated_at on public.editor_feedback;
create trigger set_editor_feedback_updated_at
  before update on public.editor_feedback
  for each row execute function public.set_updated_at();

alter table public.editor_feedback enable row level security;

drop policy if exists "Yazar kendi geri bildirimlerini okuyabilir" on public.editor_feedback;
create policy "Yazar kendi geri bildirimlerini okuyabilir"
  on public.editor_feedback for select to authenticated
  using (
    author_id = (select auth.uid())
    and public.current_profile_role() = 'writer'::public.user_role
  );

drop policy if exists "Editör kendi geri bildirimlerini okuyabilir" on public.editor_feedback;
create policy "Editör kendi geri bildirimlerini okuyabilir"
  on public.editor_feedback for select to authenticated
  using (
    editor_id = (select auth.uid())
    and public.current_profile_role() = 'editor'::public.user_role
  );

drop policy if exists "Yetkili editör geri bildirim oluşturabilir" on public.editor_feedback;
create policy "Yetkili editör geri bildirim oluşturabilir"
  on public.editor_feedback for insert to authenticated
  with check (
    editor_id = (select auth.uid())
    and public.current_profile_role() = 'editor'::public.user_role
    and author_id = (select works.author_id from public.works where works.id = work_id)
    and exists (
      select 1 from public.editor_requests
      where editor_requests.work_id = editor_feedback.work_id
        and editor_requests.editor_id = (select auth.uid())
        and editor_requests.status in ('accepted', 'in_review', 'completed')
    )
  );

drop policy if exists "Yazar geri bildirim durumunu güncelleyebilir" on public.editor_feedback;
create policy "Yazar geri bildirim durumunu güncelleyebilir"
  on public.editor_feedback for update to authenticated
  using (author_id = (select auth.uid()) and public.current_profile_role() = 'writer'::public.user_role)
  with check (author_id = (select auth.uid()) and public.current_profile_role() = 'writer'::public.user_role);

drop policy if exists "Editör kendi geri bildirimini güncelleyebilir" on public.editor_feedback;
create policy "Editör kendi geri bildirimini güncelleyebilir"
  on public.editor_feedback for update to authenticated
  using (editor_id = (select auth.uid()) and public.current_profile_role() = 'editor'::public.user_role)
  with check (editor_id = (select auth.uid()) and public.current_profile_role() = 'editor'::public.user_role);

create or replace function public.create_editor_feedback(
  target_work uuid,
  target_chapter uuid,
  feedback_title text,
  feedback_content text,
  feedback_category text,
  feedback_priority text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  work_author uuid;
  feedback_id uuid;
begin
  if actor is null or public.current_profile_role() <> 'editor'::public.user_role then
    raise exception 'Bu işlem için onaylı editör yetkisi gerekli.' using errcode = '42501';
  end if;

  select author_id into work_author from public.works where id = target_work;
  if work_author is null then
    raise exception 'Eser bulunamadı.' using errcode = 'P0002';
  end if;

  if target_chapter is not null and not exists (
    select 1 from public.chapters where id = target_chapter and work_id = target_work
  ) then
    raise exception 'Bölüm seçilen esere ait değil.' using errcode = '22023';
  end if;

  insert into public.editor_feedback (
    work_id, chapter_id, editor_id, author_id, title, content, category, priority
  ) values (
    target_work, target_chapter, actor, work_author,
    btrim(feedback_title), btrim(feedback_content), feedback_category, feedback_priority
  ) returning id into feedback_id;

  return feedback_id;
end;
$$;

create or replace function public.get_feedback_editor_names(editor_ids uuid[])
returns table (id uuid, full_name text)
language sql
stable
security definer
set search_path = ''
as $$
  select profiles.id, profiles.full_name
  from public.profiles
  where profiles.id = any(editor_ids)
    and profiles.role = 'editor'::public.user_role
    and profiles.role_approved_at is not null
    and exists (
      select 1 from public.editor_feedback
      where editor_feedback.editor_id = profiles.id
        and (
          editor_feedback.author_id = (select auth.uid())
          or editor_feedback.editor_id = (select auth.uid())
        )
    );
$$;

revoke all on function public.create_editor_feedback(uuid, uuid, text, text, text, text) from public, anon, authenticated;
revoke all on function public.get_feedback_editor_names(uuid[]) from public, anon, authenticated;
grant execute on function public.create_editor_feedback(uuid, uuid, text, text, text, text) to authenticated, service_role;
grant execute on function public.get_feedback_editor_names(uuid[]) to authenticated, service_role;

revoke all on table public.editor_feedback from public, anon, authenticated;
grant select on table public.editor_feedback to authenticated;
grant update (title, content, category, priority, status, read_at, archived_at) on public.editor_feedback to authenticated;
grant all on table public.editor_feedback to service_role;

commit;
