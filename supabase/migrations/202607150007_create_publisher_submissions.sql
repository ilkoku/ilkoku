begin;

create table if not exists public.publishers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete restrict,
  company_name text not null check (char_length(btrim(company_name)) between 2 and 160),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text check (description is null or char_length(description) <= 2000),
  website_url text check (website_url is null or char_length(website_url) <= 500),
  contact_email text check (contact_email is null or char_length(contact_email) <= 320),
  logo_url text check (logo_url is null or char_length(logo_url) <= 1000),
  verified boolean not null default false,
  active boolean not null default true,
  accepts_submissions boolean not null default false,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  archived_at timestamptz,
  constraint publishers_archive_consistency check (archived_at is null or active = false)
);

create table if not exists public.publisher_submissions (
  id uuid primary key default gen_random_uuid(),
  publisher_id uuid not null references public.publishers(id) on delete restrict,
  work_id uuid not null,
  author_id uuid not null references public.profiles(id) on delete restrict,
  status text not null default 'pending' check (status in ('pending', 'reviewing', 'accepted', 'rejected', 'withdrawn')),
  cover_letter text not null check (char_length(btrim(cover_letter)) between 20 and 3000),
  publisher_note text check (publisher_note is null or char_length(publisher_note) <= 5000),
  submitted_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  reviewed_at timestamptz,
  withdrawn_at timestamptz,
  archived_at timestamptz,
  constraint publisher_submissions_work_author_fkey
    foreign key (work_id, author_id) references public.works(id, author_id) on delete restrict,
  constraint publisher_submissions_withdrawal_consistency
    check ((status = 'withdrawn' and withdrawn_at is not null) or (status <> 'withdrawn' and withdrawn_at is null)),
  constraint publisher_submissions_review_consistency
    check (status not in ('accepted', 'rejected') or reviewed_at is not null)
);

create index if not exists publishers_discovery_idx
  on public.publishers (verified, active, accepts_submissions, company_name)
  where archived_at is null;
create index if not exists publisher_submissions_author_idx
  on public.publisher_submissions (author_id, updated_at desc);
create index if not exists publisher_submissions_publisher_idx
  on public.publisher_submissions (publisher_id, status, updated_at desc);
create index if not exists publisher_submissions_work_idx
  on public.publisher_submissions (work_id, submitted_at desc);
create unique index if not exists publisher_submissions_active_unique_idx
  on public.publisher_submissions (publisher_id, work_id)
  where archived_at is null and status in ('pending', 'reviewing', 'accepted');

create or replace function public.validate_publisher_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.profiles
    where id = new.profile_id
      and role = 'publisher'::public.user_role
      and role_approved_at is not null
  ) then
    raise exception 'Yayınevi profili onaylı bir yayınevi hesabına bağlı olmalıdır.' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function public.validate_publisher_profile() from public, anon, authenticated;

drop trigger if exists validate_publisher_profile on public.publishers;
create trigger validate_publisher_profile
  before insert or update of profile_id on public.publishers
  for each row execute function public.validate_publisher_profile();

drop trigger if exists set_publishers_updated_at on public.publishers;
create trigger set_publishers_updated_at
  before update on public.publishers
  for each row execute function public.set_updated_at();

drop trigger if exists set_publisher_submissions_updated_at on public.publisher_submissions;
create trigger set_publisher_submissions_updated_at
  before update on public.publisher_submissions
  for each row execute function public.set_updated_at();

create or replace function public.create_publisher_submission(
  target_publisher uuid,
  target_work uuid,
  submission_cover_letter text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  new_submission_id uuid;
begin
  if current_user_id is null or public.current_profile_role() <> 'writer'::public.user_role then
    raise exception 'Bu işlem yalnızca yazarlar tarafından yapılabilir.' using errcode = '42501';
  end if;

  if char_length(btrim(submission_cover_letter)) not between 20 and 3000 then
    raise exception 'Ön yazı 20 ile 3000 karakter arasında olmalıdır.' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.works
    where id = target_work
      and author_id = current_user_id
      and status <> 'archived'
  ) then
    raise exception 'Başvuruya uygun eser bulunamadı.' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.publishers
    where id = target_publisher
      and verified
      and active
      and accepts_submissions
      and archived_at is null
  ) then
    raise exception 'Bu yayınevi şu anda başvuru kabul etmiyor.' using errcode = '42501';
  end if;

  insert into public.publisher_submissions (publisher_id, work_id, author_id, cover_letter)
  values (target_publisher, target_work, current_user_id, btrim(submission_cover_letter))
  returning id into new_submission_id;

  return new_submission_id;
end;
$$;
revoke all on function public.create_publisher_submission(uuid, uuid, text) from public, anon;
grant execute on function public.create_publisher_submission(uuid, uuid, text) to authenticated, service_role;

create or replace function public.withdraw_publisher_submission(target_submission uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.publisher_submissions
  set status = 'withdrawn', withdrawn_at = timezone('utc'::text, now())
  where id = target_submission
    and author_id = auth.uid()
    and status in ('pending', 'reviewing')
    and archived_at is null;

  if not found then
    raise exception 'Geri çekilebilecek başvuru bulunamadı.' using errcode = '42501';
  end if;
end;
$$;
revoke all on function public.withdraw_publisher_submission(uuid) from public, anon;
grant execute on function public.withdraw_publisher_submission(uuid) to authenticated, service_role;

create or replace function public.update_publisher_submission_status(
  target_submission uuid,
  next_status text,
  note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_status text;
begin
  if public.current_profile_role() <> 'publisher'::public.user_role then
    raise exception 'Bu işlem yalnızca yayınevleri tarafından yapılabilir.' using errcode = '42501';
  end if;

  select ps.status into current_status
  from public.publisher_submissions ps
  join public.publishers p on p.id = ps.publisher_id
  where ps.id = target_submission and p.profile_id = auth.uid() and ps.archived_at is null
  for update;

  if current_status is null then
    raise exception 'Başvuru bulunamadı.' using errcode = '42501';
  end if;

  if not (
    (current_status = 'pending' and next_status in ('reviewing', 'rejected'))
    or (current_status = 'reviewing' and next_status in ('accepted', 'rejected'))
  ) then
    raise exception 'Geçersiz başvuru durumu geçişi.' using errcode = '22023';
  end if;

  update public.publisher_submissions
  set status = next_status,
      publisher_note = nullif(btrim(note), ''),
      reviewed_at = case when next_status in ('accepted', 'rejected') then timezone('utc'::text, now()) else reviewed_at end
  where id = target_submission;
end;
$$;
revoke all on function public.update_publisher_submission_status(uuid, text, text) from public, anon;
grant execute on function public.update_publisher_submission_status(uuid, text, text) to authenticated, service_role;

alter table public.publishers enable row level security;
alter table public.publisher_submissions enable row level security;

drop policy if exists "Doğrulanmış yayınevleri keşfedilebilir" on public.publishers;
create policy "Doğrulanmış yayınevleri keşfedilebilir"
  on public.publishers for select to authenticated
  using (verified and active and archived_at is null);

drop policy if exists "Yayınevi kendi profilini okuyabilir" on public.publishers;
create policy "Yayınevi kendi profilini okuyabilir"
  on public.publishers for select to authenticated
  using (profile_id = (select auth.uid()));

drop policy if exists "Yazar kendi başvurularını okuyabilir" on public.publisher_submissions;
create policy "Yazar kendi başvurularını okuyabilir"
  on public.publisher_submissions for select to authenticated
  using (author_id = (select auth.uid()));

drop policy if exists "Yayınevi kendi başvurularını okuyabilir" on public.publisher_submissions;
create policy "Yayınevi kendi başvurularını okuyabilir"
  on public.publisher_submissions for select to authenticated
  using (exists (
    select 1 from public.publishers p
    where p.id = publisher_submissions.publisher_id
      and p.profile_id = (select auth.uid())
  ));

revoke all on table public.publishers, public.publisher_submissions from public, anon, authenticated;
grant select on table public.publishers, public.publisher_submissions to authenticated;
grant all on table public.publishers, public.publisher_submissions to service_role;

commit;
