-- Only superadmins may manage other users' application roles.
create or replace function public.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = (select auth.uid())
      and role = 'superadmin'
  );
$$;

grant execute on function public.is_superadmin() to authenticated;

drop policy if exists "Admins manage moderator roles" on public.user_roles;

create policy "Superadmins manage roles"
on public.user_roles for all
to authenticated
using ((select public.is_superadmin()))
with check ((select public.is_superadmin()));