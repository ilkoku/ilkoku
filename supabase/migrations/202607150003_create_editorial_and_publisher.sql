begin;

create table if not exists public.editor_requests (
  id uuid primary key default gen_random_uuid(),
  work_id uuid not null,
  author_id uuid not null references public.profiles(id) on delete restrict,
  editor_id uuid not null references public.profiles(id) on delete restrict,
  request_type text not null check (request_type in ('general', 'developmental', 'line', 'sensitivity')),
  expectation_note text check (expectation_note is null or char_length(expectation_note) <= 5000),
  preferred_delivery text not null check (preferred_delivery in ('one_week', 'two_weeks', 'one_month', 'flexible')),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'in_review', 'completed', 'declined', 'cancelled')),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint editor_requests_work_author_fkey
    foreign key (work_id, author_id)
    references public.works(id, author_id)
    on delete restrict,
  constraint editor_requests_participants_differ check (author_id <> editor_id),
  constraint editor_requests_id_work_editor_key unique (id, work_id, editor_id)
);

create table if not exists public.editor_reviews (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null,
  work_id uuid not null references public.works(id) on delete restrict,
  editor_id uuid not null references public.profiles(id) on delete restrict,
  summary text not null check (char_length(btrim(summary)) between 1 and 10000),
  strengths text not null check (char_length(btrim(strengths)) between 1 and 20000),
  development_points text not null check (char_length(btrim(development_points)) between 1 and 20000),
  status text not null default 'draft' check (status in ('draft', 'delivered', 'withdrawn')),
  delivered_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint editor_reviews_request_assignment_fkey
    foreign key (request_id, work_id, editor_id)
    references public.editor_requests(id, work_id, editor_id)
    on delete restrict,
  constraint editor_reviews_request_key unique (request_id),
  constraint editor_reviews_delivery_consistency check (status <> 'delivered' or delivered_at is not null)
);

create table if not exists public.editor_review_publisher_access (
  review_id uuid primary key references public.editor_reviews(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete restrict,
  granted_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.publisher_requests (
  id uuid primary key default gen_random_uuid(),
  work_id uuid not null,
  publisher_user_id uuid not null references public.profiles(id) on delete restrict,
  author_id uuid not null references public.profiles(id) on delete restrict,
  request_type text not null check (request_type in ('contact', 'manuscript', 'meeting', 'rights')),
  message text not null check (char_length(btrim(message)) between 1 and 5000),
  requested_material text check (requested_material is null or char_length(requested_material) <= 2000),
  meeting_preference text not null check (meeting_preference in ('email', 'video', 'phone', 'in_person', 'flexible')),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled', 'completed')),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint publisher_requests_work_author_fkey
    foreign key (work_id, author_id)
    references public.works(id, author_id)
    on delete restrict,
  constraint publisher_requests_participants_differ check (publisher_user_id <> author_id)
);

create index if not exists editor_requests_author_idx on public.editor_requests (author_id, created_at desc);
create index if not exists editor_requests_editor_status_idx on public.editor_requests (editor_id, status, created_at desc);
create index if not exists editor_requests_work_idx on public.editor_requests (work_id, created_at desc);
create index if not exists editor_reviews_work_idx on public.editor_reviews (work_id, delivered_at desc);
create index if not exists editor_reviews_editor_idx on public.editor_reviews (editor_id, updated_at desc);
create index if not exists editor_review_access_author_idx on public.editor_review_publisher_access (author_id, granted_at desc);
create index if not exists publisher_requests_publisher_idx on public.publisher_requests (publisher_user_id, created_at desc);
create index if not exists publisher_requests_author_idx on public.publisher_requests (author_id, created_at desc);
create index if not exists publisher_requests_work_idx on public.publisher_requests (work_id, created_at desc);

create or replace function public.validate_editor_request_participants()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.profiles
    where id = new.editor_id
      and role = 'editor'::public.user_role
      and role_approved_at is not null
  ) then
    raise exception 'Seçilen kullanıcı onaylı bir editör değildir.' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function public.validate_editor_request_participants() from public, anon, authenticated;

create or replace function public.validate_review_publisher_access()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.editor_reviews er
    join public.works w on w.id = er.work_id
    where er.id = new.review_id and w.author_id = new.author_id
  ) then
    raise exception 'Değerlendirme izni yalnızca eser sahibi tarafından verilebilir.' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function public.validate_review_publisher_access() from public, anon, authenticated;

drop trigger if exists validate_editor_request_participants on public.editor_requests;
create trigger validate_editor_request_participants
  before insert or update of editor_id on public.editor_requests
  for each row execute function public.validate_editor_request_participants();

drop trigger if exists validate_review_publisher_access on public.editor_review_publisher_access;
create trigger validate_review_publisher_access
  before insert or update on public.editor_review_publisher_access
  for each row execute function public.validate_review_publisher_access();

drop trigger if exists set_editor_requests_updated_at on public.editor_requests;
create trigger set_editor_requests_updated_at
  before update on public.editor_requests
  for each row execute function public.set_updated_at();

drop trigger if exists set_editor_reviews_updated_at on public.editor_reviews;
create trigger set_editor_reviews_updated_at
  before update on public.editor_reviews
  for each row execute function public.set_updated_at();

drop trigger if exists set_publisher_requests_updated_at on public.publisher_requests;
create trigger set_publisher_requests_updated_at
  before update on public.publisher_requests
  for each row execute function public.set_updated_at();

alter table public.editor_requests enable row level security;
alter table public.editor_reviews enable row level security;
alter table public.editor_review_publisher_access enable row level security;
alter table public.publisher_requests enable row level security;

drop policy if exists "Yazar ve editör ilgili talebi okuyabilir" on public.editor_requests;
create policy "Yazar ve editör ilgili talebi okuyabilir"
  on public.editor_requests for select to authenticated
  using (
    author_id = (select auth.uid())
    or (
      editor_id = (select auth.uid())
      and public.current_profile_role() = 'editor'::public.user_role
    )
  );

drop policy if exists "Yazar editör talebi oluşturabilir" on public.editor_requests;
create policy "Yazar editör talebi oluşturabilir"
  on public.editor_requests for insert to authenticated
  with check (author_id = (select auth.uid()) and status = 'pending');

drop policy if exists "Editör talep durumunu güncelleyebilir" on public.editor_requests;
create policy "Editör talep durumunu güncelleyebilir"
  on public.editor_requests for update to authenticated
  using (
    editor_id = (select auth.uid())
    and public.current_profile_role() = 'editor'::public.user_role
  )
  with check (
    editor_id = (select auth.uid())
    and public.current_profile_role() = 'editor'::public.user_role
  );

drop policy if exists "Editör kendi değerlendirmesini okuyabilir" on public.editor_reviews;
create policy "Editör kendi değerlendirmesini okuyabilir"
  on public.editor_reviews for select to authenticated
  using (
    editor_id = (select auth.uid())
    and public.current_profile_role() = 'editor'::public.user_role
  );

drop policy if exists "Yazar eserinin değerlendirmesini okuyabilir" on public.editor_reviews;
create policy "Yazar eserinin değerlendirmesini okuyabilir"
  on public.editor_reviews for select to authenticated
  using (exists (
    select 1 from public.works
    where works.id = editor_reviews.work_id
      and works.author_id = (select auth.uid())
  ));

drop policy if exists "İzinli değerlendirmeyi yayınevi okuyabilir" on public.editor_reviews;
create policy "İzinli değerlendirmeyi yayınevi okuyabilir"
  on public.editor_reviews for select to authenticated
  using (
    status = 'delivered'
    and public.current_profile_role() = 'publisher'::public.user_role
    and exists (
      select 1 from public.editor_review_publisher_access access
      where access.review_id = editor_reviews.id
    )
  );

drop policy if exists "İlgili editör değerlendirme oluşturabilir" on public.editor_reviews;
create policy "İlgili editör değerlendirme oluşturabilir"
  on public.editor_reviews for insert to authenticated
  with check (
    editor_id = (select auth.uid())
    and public.current_profile_role() = 'editor'::public.user_role
    and exists (
      select 1 from public.editor_requests
      where editor_requests.id = editor_reviews.request_id
        and editor_requests.editor_id = (select auth.uid())
        and editor_requests.status in ('accepted', 'in_review')
    )
  );

drop policy if exists "İlgili editör değerlendirmeyi güncelleyebilir" on public.editor_reviews;
create policy "İlgili editör değerlendirmeyi güncelleyebilir"
  on public.editor_reviews for update to authenticated
  using (
    editor_id = (select auth.uid())
    and public.current_profile_role() = 'editor'::public.user_role
  )
  with check (
    editor_id = (select auth.uid())
    and public.current_profile_role() = 'editor'::public.user_role
  );

drop policy if exists "Yazar değerlendirme paylaşımını okuyabilir" on public.editor_review_publisher_access;
create policy "Yazar değerlendirme paylaşımını okuyabilir"
  on public.editor_review_publisher_access for select to authenticated
  using (author_id = (select auth.uid()));

drop policy if exists "Yayınevi açık değerlendirme paylaşımını okuyabilir" on public.editor_review_publisher_access;
create policy "Yayınevi açık değerlendirme paylaşımını okuyabilir"
  on public.editor_review_publisher_access for select to authenticated
  using (public.current_profile_role() = 'publisher'::public.user_role);

drop policy if exists "Yazar değerlendirmeyi yayınevine açabilir" on public.editor_review_publisher_access;
create policy "Yazar değerlendirmeyi yayınevine açabilir"
  on public.editor_review_publisher_access for insert to authenticated
  with check (author_id = (select auth.uid()));

drop policy if exists "Yazar değerlendirme paylaşımını kaldırabilir" on public.editor_review_publisher_access;
create policy "Yazar değerlendirme paylaşımını kaldırabilir"
  on public.editor_review_publisher_access for delete to authenticated
  using (author_id = (select auth.uid()));

drop policy if exists "Yazar ve yayınevi ilgili iletişim talebini okuyabilir" on public.publisher_requests;
create policy "Yazar ve yayınevi ilgili iletişim talebini okuyabilir"
  on public.publisher_requests for select to authenticated
  using (
    author_id = (select auth.uid())
    or (
      publisher_user_id = (select auth.uid())
      and public.current_profile_role() = 'publisher'::public.user_role
    )
  );

drop policy if exists "Yayınevi iletişim talebi oluşturabilir" on public.publisher_requests;
create policy "Yayınevi iletişim talebi oluşturabilir"
  on public.publisher_requests for insert to authenticated
  with check (
    publisher_user_id = (select auth.uid())
    and public.current_profile_role() = 'publisher'::public.user_role
    and status = 'pending'
  );

drop policy if exists "Editör atanmış eseri okuyabilir" on public.works;
create policy "Editör atanmış eseri okuyabilir"
  on public.works for select to authenticated
  using (
    public.current_profile_role() = 'editor'::public.user_role
    and exists (
      select 1 from public.editor_requests
      where editor_requests.work_id = works.id
        and editor_requests.editor_id = (select auth.uid())
        and editor_requests.status in ('pending', 'accepted', 'in_review', 'completed')
    )
  );

drop policy if exists "Yayınevi açık eserleri okuyabilir" on public.works;
create policy "Yayınevi açık eserleri okuyabilir"
  on public.works for select to authenticated
  using (
    public.current_profile_role() = 'publisher'::public.user_role
    and (is_public or is_publisher_visible)
  );

drop policy if exists "Editör atanmış eserin bölümlerini okuyabilir" on public.chapters;
create policy "Editör atanmış eserin bölümlerini okuyabilir"
  on public.chapters for select to authenticated
  using (
    public.current_profile_role() = 'editor'::public.user_role
    and exists (
      select 1 from public.editor_requests
      where editor_requests.work_id = chapters.work_id
        and editor_requests.editor_id = (select auth.uid())
        and editor_requests.status in ('accepted', 'in_review', 'completed')
    )
  );

revoke all on table public.editor_requests, public.editor_reviews, public.editor_review_publisher_access, public.publisher_requests
  from public, anon, authenticated;

grant select on table public.editor_requests, public.editor_reviews, public.editor_review_publisher_access, public.publisher_requests
  to authenticated;
grant insert (work_id, author_id, editor_id, request_type, expectation_note, preferred_delivery)
  on public.editor_requests to authenticated;
grant update (status) on public.editor_requests to authenticated;
grant insert (request_id, work_id, editor_id, summary, strengths, development_points, status, delivered_at)
  on public.editor_reviews to authenticated;
grant update (summary, strengths, development_points, status, delivered_at)
  on public.editor_reviews to authenticated;
grant insert (review_id, author_id) on public.editor_review_publisher_access to authenticated;
grant delete on public.editor_review_publisher_access to authenticated;
grant insert (work_id, publisher_user_id, author_id, request_type, message, requested_material, meeting_preference)
  on public.publisher_requests to authenticated;

grant all on table public.editor_requests, public.editor_reviews, public.editor_review_publisher_access, public.publisher_requests
  to service_role;

commit;
