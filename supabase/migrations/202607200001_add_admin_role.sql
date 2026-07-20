begin;

alter type public.user_role add value if not exists 'admin';

commit;

begin;

alter table public.profiles drop constraint if exists profiles_requested_role_check;
alter table public.profiles
  add constraint profiles_requested_role_check
  check (requested_role is null or requested_role in ('editor', 'publisher'));

alter table public.profiles drop constraint if exists profiles_role_approval_check;
alter table public.profiles
  add constraint profiles_role_approval_check
  check (
    (role in ('reader', 'writer') and role_approved_at is null and role_approved_by is null)
    or (role in ('editor', 'publisher', 'admin') and role_approved_at is not null)
  );

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'::public.user_role
  );
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;

drop policy if exists "Yönetici tüm profilleri okuyabilir" on public.profiles;
create policy "Yönetici tüm profilleri okuyabilir"
  on public.profiles for select to authenticated
  using ((select public.is_admin()));

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

  if not (select public.is_admin()) then
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

create or replace function public.admin_set_profile_role(target_user uuid, next_role public.user_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Oturum gerekli.' using errcode = '42501';
  end if;

  if not (select public.is_admin()) then
    raise exception 'Bu işlem için yönetici yetkisi gerekli.' using errcode = '42501';
  end if;

  if target_user = (select auth.uid()) then
    raise exception 'Yönetici kendi rolünü bu işlemle değiştiremez.' using errcode = '42501';
  end if;

  if next_role is null then
    raise exception 'Geçerli bir rol seçilmelidir.' using errcode = '22023';
  end if;

  update public.profiles
  set role = next_role,
      requested_role = null,
      role_approved_at = case
        when next_role in ('editor'::public.user_role, 'publisher'::public.user_role, 'admin'::public.user_role)
          then timezone('utc'::text, now())
        else null
      end,
      role_approved_by = case
        when next_role in ('editor'::public.user_role, 'publisher'::public.user_role, 'admin'::public.user_role)
          then (select auth.uid())
        else null
      end,
      updated_at = timezone('utc'::text, now())
  where id = target_user;

  if not found then
    raise exception 'Profil bulunamadı.' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.approve_profile_role(uuid, public.user_role) from public, anon, authenticated;
revoke all on function public.admin_set_profile_role(uuid, public.user_role) from public, anon, authenticated;
grant execute on function public.approve_profile_role(uuid, public.user_role) to authenticated, service_role;
grant execute on function public.admin_set_profile_role(uuid, public.user_role) to authenticated, service_role;

notify pgrst, 'reload schema';

commit;
