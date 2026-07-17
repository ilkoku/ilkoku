begin;

do $$
begin
  create type public.user_role as enum ('reader', 'writer', 'editor', 'publisher');
exception
  when duplicate_object then null;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role public.user_role not null default 'reader',
  requested_role public.user_role,
  avatar_url text,
  role_approved_at timestamptz,
  role_approved_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint profiles_requested_role_check
    check (requested_role is null or requested_role in ('editor', 'publisher')),
  constraint profiles_role_approval_check
    check (
      (role in ('reader', 'writer') and role_approved_at is null and role_approved_by is null)
      or (role in ('editor', 'publisher') and role_approved_at is not null)
    )
);

alter table public.profiles enable row level security;

drop policy if exists "Kullanıcı kendi profilini okuyabilir" on public.profiles;
create policy "Kullanıcı kendi profilini okuyabilir"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

drop policy if exists "Kullanıcı kendi profilini oluşturabilir" on public.profiles;
drop policy if exists "Kullanıcı kendi profilini güncelleyebilir" on public.profiles;
create policy "Kullanıcı profil bilgilerini güncelleyebilir"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create or replace function public.set_profile_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

revoke all on function public.set_profile_updated_at() from public, anon, authenticated;

drop trigger if exists set_profile_updated_at on public.profiles;
create trigger set_profile_updated_at
  before update of full_name, avatar_url on public.profiles
  for each row execute function public.set_profile_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, role, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    'reader'::public.user_role,
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.set_standard_role(selected_role public.user_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Oturum gerekli.' using errcode = '42501';
  end if;

  if selected_role is null
    or selected_role not in ('reader'::public.user_role, 'writer'::public.user_role) then
    raise exception 'Bu rol doğrudan seçilemez.' using errcode = '22023';
  end if;

  update public.profiles
  set role = selected_role,
      requested_role = null,
      role_approved_at = null,
      role_approved_by = null,
      updated_at = timezone('utc'::text, now())
  where id = (select auth.uid());

  if not found then
    raise exception 'Profil bulunamadı.' using errcode = 'P0002';
  end if;
end;
$$;

create or replace function public.request_privileged_role(requested public.user_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Oturum gerekli.' using errcode = '42501';
  end if;

  if requested is null
    or requested not in ('editor'::public.user_role, 'publisher'::public.user_role) then
    raise exception 'Yalnızca editör veya yayınevi rolü talep edilebilir.' using errcode = '22023';
  end if;

  update public.profiles
  set requested_role = requested,
      updated_at = timezone('utc'::text, now())
  where id = (select auth.uid());

  if not found then
    raise exception 'Profil bulunamadı.' using errcode = 'P0002';
  end if;
end;
$$;

create or replace function public.approve_profile_role(target_user uuid, approved_role public.user_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Oturum gerekli.' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from auth.users
    where id = (select auth.uid())
      and raw_app_meta_data @> '{"is_admin": true}'::jsonb
  ) then
    raise exception 'Bu işlem için yönetici yetkisi gerekli.' using errcode = '42501';
  end if;

  if target_user = (select auth.uid()) then
    raise exception 'Yönetici kendi ayrıcalıklı rolünü onaylayamaz.' using errcode = '42501';
  end if;

  if approved_role is null
    or approved_role not in ('editor'::public.user_role, 'publisher'::public.user_role) then
    raise exception 'Yalnızca editör veya yayınevi rolü onaylanabilir.' using errcode = '22023';
  end if;

  update public.profiles
  set role = approved_role,
      requested_role = null,
      role_approved_at = timezone('utc'::text, now()),
      role_approved_by = (select auth.uid()),
      updated_at = timezone('utc'::text, now())
  where id = target_user
    and requested_role = approved_role;

  if not found then
    raise exception 'Onaylanmayı bekleyen eşleşen bir rol talebi bulunamadı.' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.set_standard_role(public.user_role) from public, anon, authenticated;
revoke all on function public.request_privileged_role(public.user_role) from public, anon, authenticated;
revoke all on function public.approve_profile_role(uuid, public.user_role) from public, anon, authenticated;
grant execute on function public.set_standard_role(public.user_role) to authenticated, service_role;
grant execute on function public.request_privileged_role(public.user_role) to authenticated, service_role;
grant execute on function public.approve_profile_role(uuid, public.user_role) to authenticated, service_role;

grant usage on schema public to authenticated;
grant usage on type public.user_role to authenticated, service_role;

revoke all on table public.profiles from public, anon, authenticated;
revoke select (id, full_name, role, requested_role, avatar_url, role_approved_at, role_approved_by, updated_at)
  on public.profiles from anon, authenticated;
revoke insert (id, full_name, role, requested_role, avatar_url, role_approved_at, role_approved_by, updated_at)
  on public.profiles from anon, authenticated;
revoke update (id, full_name, role, requested_role, avatar_url, role_approved_at, role_approved_by, updated_at)
  on public.profiles from anon, authenticated;
revoke references (id, full_name, role, requested_role, avatar_url, role_approved_at, role_approved_by, updated_at)
  on public.profiles from anon, authenticated;

grant select on table public.profiles to authenticated;
grant update (full_name, avatar_url) on public.profiles to authenticated;
grant all on table public.profiles to service_role;

commit;
