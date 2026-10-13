-- Approval gate: members can only use the app after the coach approves them.
alter table public.profiles add column if not exists approved boolean not null default false;
update public.profiles set approved = true where role = 'admin';

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role, approved)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
          case when public.is_admin_email(new.email) then 'admin' else 'member' end,
          public.is_admin_email(new.email))
  on conflict (id) do nothing;
  return new;
end $$;

-- members may not change their own role or approval
drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update" on public.profiles for update using (id = auth.uid() or public.is_admin())
  with check (public.is_admin() or (id = auth.uid()
    and role = (select role from public.profiles p where p.id = auth.uid())
    and approved = (select approved from public.profiles p where p.id = auth.uid())));
