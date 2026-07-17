begin;

do $$
declare
  handle_new_user_definition text;
begin
  if has_table_privilege('authenticated', 'public.profiles', 'UPDATE') then
    raise exception 'Güvenli profiles migration önkoşulu eksik: authenticated rolüne tablo düzeyinde UPDATE verilemez.';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'role_approved_at'
  ) then
    raise exception 'Güvenli profiles migration önkoşulu eksik: role_approved_at bulunamadı.';
  end if;

  select pg_get_functiondef('public.handle_new_user()'::regprocedure)
  into handle_new_user_definition;

  if handle_new_user_definition ~* 'raw_user_meta_data[[:space:]]*->>[[:space:]]*''role''' then
    raise exception 'Güvenli profiles migration önkoşulu eksik: handle_new_user metadata rolüne güveniyor.';
  end if;
end;
$$;

do $$
declare
  existing_return_type oid;
begin
  select procedure.prorettype
  into existing_return_type
  from pg_catalog.pg_proc as procedure
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = procedure.pronamespace
  where namespace.nspname = 'public'
    and procedure.proname = 'current_profile_role'
    and procedure.proargtypes = ''::oidvector;

  if existing_return_type is not null
    and existing_return_type <> 'public.user_role'::regtype then
    execute 'drop function public.current_profile_role() restrict';
  end if;
end;
$$;

create or replace function public.current_profile_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when role in ('editor'::public.user_role, 'publisher'::public.user_role)
      and role_approved_at is null
      then 'reader'::public.user_role
    else role
  end
  from public.profiles
  where id = (select auth.uid())
$$;

revoke all on function public.current_profile_role() from public, anon;
grant execute on function public.current_profile_role() to authenticated, service_role;

do $$
declare
  existing_return_type oid;
begin
  select procedure.prorettype
  into existing_return_type
  from pg_catalog.pg_proc as procedure
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = procedure.pronamespace
  where namespace.nspname = 'public'
    and procedure.proname = 'set_updated_at'
    and procedure.proargtypes = ''::oidvector;

  if existing_return_type is not null
    and existing_return_type <> 'pg_catalog.trigger'::regtype then
    execute 'drop function public.set_updated_at() restrict';
  end if;
end;
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public, anon, authenticated;

do $$
declare
  existing_return_type oid;
begin
  select procedure.prorettype
  into existing_return_type
  from pg_catalog.pg_proc as procedure
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = procedure.pronamespace
  where namespace.nspname = 'public'
    and procedure.proname = 'calculate_chapter_word_count'
    and procedure.proargtypes = ''::oidvector;

  if existing_return_type is not null
    and existing_return_type <> 'pg_catalog.trigger'::regtype then
    execute 'drop function public.calculate_chapter_word_count() restrict';
  end if;
end;
$$;

create or replace function public.calculate_chapter_word_count()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.word_count = case
    when btrim(new.content) = '' then 0
    else cardinality(regexp_split_to_array(btrim(new.content), E'\\s+'))
  end;
  return new;
end;
$$;

revoke all on function public.calculate_chapter_word_count() from public, anon, authenticated;

create table if not exists public.works (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete restrict,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  summary text check (summary is null or char_length(summary) <= 5000),
  work_type text not null check (work_type in ('novel', 'story', 'poetry', 'essay', 'memoir', 'other')),
  genre text not null check (char_length(btrim(genre)) between 1 and 100),
  status text not null default 'draft' check (status in ('draft', 'in_progress', 'completed', 'published', 'archived')),
  cover_url text,
  language text not null default 'tr' check (language ~ '^[a-z]{2,3}(?:-[A-Z]{2})?$'),
  is_public boolean not null default false,
  is_publisher_visible boolean not null default false,
  completed_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint works_author_slug_key unique (author_id, slug),
  constraint works_id_author_key unique (id, author_id),
  constraint works_completion_consistency check (status <> 'completed' or completed_at is not null),
  constraint works_publication_consistency check (status <> 'published' or published_at is not null)
);

create table if not exists public.chapters (
  id uuid primary key default gen_random_uuid(),
  work_id uuid not null,
  author_id uuid not null references public.profiles(id) on delete restrict,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  content text not null default '',
  position integer not null check (position > 0),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  word_count integer not null default 0 check (word_count >= 0),
  published_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint chapters_work_author_fkey
    foreign key (work_id, author_id)
    references public.works(id, author_id)
    on delete cascade,
  constraint chapters_work_slug_key unique (work_id, slug),
  constraint chapters_work_position_key unique (work_id, position),
  constraint chapters_publication_consistency check (status <> 'published' or published_at is not null)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete restrict,
  content text not null check (char_length(btrim(content)) between 1 and 4000),
  is_spoiler boolean not null default false,
  status text not null default 'visible' check (status in ('visible', 'reported', 'hidden')),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists works_author_updated_idx on public.works (author_id, updated_at desc);
create index if not exists works_public_discovery_idx on public.works (published_at desc) where is_public and status = 'published';
create index if not exists works_publisher_discovery_idx on public.works (updated_at desc) where is_publisher_visible;
create index if not exists chapters_work_position_idx on public.chapters (work_id, position);
create index if not exists chapters_public_idx on public.chapters (work_id, published_at desc) where status = 'published';
create index if not exists comments_chapter_created_idx on public.comments (chapter_id, created_at desc) where status = 'visible';
create index if not exists comments_user_idx on public.comments (user_id, created_at desc);

drop trigger if exists set_works_updated_at on public.works;
create trigger set_works_updated_at
  before update on public.works
  for each row execute function public.set_updated_at();

drop trigger if exists set_chapters_updated_at on public.chapters;
create trigger set_chapters_updated_at
  before update on public.chapters
  for each row execute function public.set_updated_at();

drop trigger if exists calculate_chapter_word_count on public.chapters;
create trigger calculate_chapter_word_count
  before insert or update of content on public.chapters
  for each row execute function public.calculate_chapter_word_count();

drop trigger if exists set_comments_updated_at on public.comments;
create trigger set_comments_updated_at
  before update on public.comments
  for each row execute function public.set_updated_at();

alter table public.works enable row level security;
alter table public.chapters enable row level security;
alter table public.comments enable row level security;

drop policy if exists "Herkes yayımlanmış açık eserleri okuyabilir" on public.works;
create policy "Herkes yayımlanmış açık eserleri okuyabilir"
  on public.works for select to anon, authenticated
  using (is_public and status = 'published' and published_at is not null);

drop policy if exists "Yazar kendi eserlerini okuyabilir" on public.works;
create policy "Yazar kendi eserlerini okuyabilir"
  on public.works for select to authenticated
  using (
    author_id = (select auth.uid())
    and public.current_profile_role() = 'writer'::public.user_role
  );

drop policy if exists "Yazar kendi eserini oluşturabilir" on public.works;
create policy "Yazar kendi eserini oluşturabilir"
  on public.works for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and public.current_profile_role() = 'writer'::public.user_role
  );

drop policy if exists "Yazar kendi eserini güncelleyebilir" on public.works;
create policy "Yazar kendi eserini güncelleyebilir"
  on public.works for update to authenticated
  using (
    author_id = (select auth.uid())
    and public.current_profile_role() = 'writer'::public.user_role
  )
  with check (
    author_id = (select auth.uid())
    and public.current_profile_role() = 'writer'::public.user_role
  );

drop policy if exists "Yazar kendi eserini silebilir" on public.works;

drop policy if exists "Herkes yayımlanmış açık bölümleri okuyabilir" on public.chapters;
create policy "Herkes yayımlanmış açık bölümleri okuyabilir"
  on public.chapters for select to anon, authenticated
  using (
    status = 'published'
    and published_at is not null
    and exists (
      select 1 from public.works
      where works.id = chapters.work_id
        and works.is_public
        and works.status = 'published'
    )
  );

drop policy if exists "Yazar kendi bölümlerini okuyabilir" on public.chapters;
create policy "Yazar kendi bölümlerini okuyabilir"
  on public.chapters for select to authenticated
  using (
    author_id = (select auth.uid())
    and public.current_profile_role() = 'writer'::public.user_role
    and exists (
      select 1
      from public.works
      where works.id = chapters.work_id
        and works.author_id = (select auth.uid())
    )
  );

drop policy if exists "Yazar kendi bölümünü oluşturabilir" on public.chapters;
create policy "Yazar kendi bölümünü oluşturabilir"
  on public.chapters for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and public.current_profile_role() = 'writer'::public.user_role
    and exists (
      select 1
      from public.works
      where works.id = chapters.work_id
        and works.author_id = (select auth.uid())
    )
  );

drop policy if exists "Yazar kendi bölümünü güncelleyebilir" on public.chapters;
create policy "Yazar kendi bölümünü güncelleyebilir"
  on public.chapters for update to authenticated
  using (
    author_id = (select auth.uid())
    and public.current_profile_role() = 'writer'::public.user_role
    and exists (
      select 1
      from public.works
      where works.id = chapters.work_id
        and works.author_id = (select auth.uid())
    )
  )
  with check (
    author_id = (select auth.uid())
    and public.current_profile_role() = 'writer'::public.user_role
    and exists (
      select 1
      from public.works
      where works.id = chapters.work_id
        and works.author_id = (select auth.uid())
    )
  );

drop policy if exists "Yazar kendi bölümünü silebilir" on public.chapters;

drop policy if exists "Herkes görünür açık bölüm yorumlarını okuyabilir" on public.comments;
create policy "Herkes görünür açık bölüm yorumlarını okuyabilir"
  on public.comments for select to anon, authenticated
  using (
    status = 'visible'
    and exists (
      select 1
      from public.chapters
      join public.works on works.id = chapters.work_id
      where chapters.id = comments.chapter_id
        and chapters.status = 'published'
        and chapters.published_at is not null
        and works.is_public
        and works.status = 'published'
        and works.published_at is not null
    )
  );

drop policy if exists "Kullanıcı kendi yorumunu okuyabilir" on public.comments;
create policy "Kullanıcı kendi yorumunu okuyabilir"
  on public.comments for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Kullanıcı açık bölüme yorum yazabilir" on public.comments;
create policy "Kullanıcı açık bölüme yorum yazabilir"
  on public.comments for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and status = 'visible'
    and exists (
      select 1
      from public.chapters
      join public.works on works.id = chapters.work_id
      where chapters.id = comments.chapter_id
        and chapters.status = 'published'
        and chapters.published_at is not null
        and works.is_public
        and works.status = 'published'
        and works.published_at is not null
    )
  );

drop policy if exists "Kullanıcı kendi yorumunu güncelleyebilir" on public.comments;
create policy "Kullanıcı kendi yorumunu güncelleyebilir"
  on public.comments for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "Kullanıcı kendi yorumunu silebilir" on public.comments;
create policy "Kullanıcı kendi yorumunu silebilir"
  on public.comments for delete to authenticated
  using (user_id = (select auth.uid()));

revoke all on table public.works, public.chapters, public.comments from public, anon, authenticated;

grant select on table public.works, public.chapters, public.comments to anon, authenticated;
grant insert (author_id, title, slug, summary, work_type, genre, status, cover_url, language, is_public, is_publisher_visible, completed_at, published_at)
  on public.works to authenticated;
grant update (title, slug, summary, work_type, genre, status, cover_url, language, is_public, is_publisher_visible, completed_at, published_at)
  on public.works to authenticated;
revoke delete on public.works from authenticated;

grant insert (work_id, author_id, title, slug, content, position, status, published_at)
  on public.chapters to authenticated;
grant update (title, slug, content, position, status, published_at)
  on public.chapters to authenticated;
revoke delete on public.chapters from authenticated;

grant insert (chapter_id, user_id, content, is_spoiler) on public.comments to authenticated;
grant update (content, is_spoiler) on public.comments to authenticated;
grant delete on public.comments to authenticated;

grant all on table public.works, public.chapters, public.comments to service_role;

notify pgrst, 'reload schema';

commit;
