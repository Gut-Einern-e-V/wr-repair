# Initial Superadmin

Supabase Auth has no application role by default. The first account must be promoted once in the Supabase SQL Editor before it can open `/moderator` and manage other users.

Replace the placeholder email with the email address of the user already created in Supabase Authentication, then run this SQL in **Supabase Dashboard > SQL Editor**:

```sql
insert into public.profiles (id, display_name)
select id, 'Initial Superadmin'
from auth.users
where email = 'admin@example.org'
on conflict (id) do update
set display_name = excluded.display_name;

insert into public.user_roles (user_id, role)
select id, 'superadmin'::public.app_role
from auth.users
where email = 'admin@example.org'
on conflict (user_id, role) do nothing;
```

After signing in at `/login`, the account can create additional email/password accounts and assign the roles **Moderation**, **Admin**, or **Superadmin** at `/moderator`.

Do not create the first role from a public API route. Requiring this one-time SQL bootstrap prevents an unauthenticated first caller from claiming Superadmin access.