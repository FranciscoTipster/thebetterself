-- 06: clients can be created by the coach BEFORE they sign up (matched by email),
--     weekday per workout, media + cues per exercise.

-- profiles no longer require an auth user (pre-created clients have a random id until they sign up)
alter table public.profiles drop constraint if exists profiles_id_fkey;
alter table public.profiles add column if not exists claimed_at timestamptz;
update public.profiles set claimed_at = coalesce(claimed_at, created_at);

-- child tables must follow when a pre-created profile id is swapped for the real auth id
alter table public.workouts drop constraint if exists workouts_user_id_fkey;
alter table public.workouts add constraint workouts_user_id_fkey foreign key (user_id) references public.profiles(id) on delete cascade on update cascade;
alter table public.workouts drop constraint if exists workouts_created_by_fkey;
alter table public.workouts add constraint workouts_created_by_fkey foreign key (created_by) references public.profiles(id) on delete set null on update cascade;
alter table public.sessions drop constraint if exists sessions_user_id_fkey;
alter table public.sessions add constraint sessions_user_id_fkey foreign key (user_id) references public.profiles(id) on delete cascade on update cascade;
alter table public.notes drop constraint if exists notes_user_id_fkey;
alter table public.notes add constraint notes_user_id_fkey foreign key (user_id) references public.profiles(id) on delete cascade on update cascade;
alter table public.notes drop constraint if exists notes_author_id_fkey;
alter table public.notes add constraint notes_author_id_fkey foreign key (author_id) references public.profiles(id) on delete cascade on update cascade;
alter table public.logins drop constraint if exists logins_user_id_fkey;
alter table public.logins add constraint logins_user_id_fkey foreign key (user_id) references public.profiles(id) on delete cascade on update cascade;

-- plan structure
alter table public.workouts add column if not exists weekday smallint check (weekday between 1 and 7);
alter table public.workout_exercises add column if not exists media_id text;
alter table public.workout_exercises add column if not exists media_url text;
alter table public.workout_exercises add column if not exists cues text;
alter table public.workout_exercises add column if not exists rest_sec int;

-- when someone signs up, claim the pre-created profile with the same email (plan, program, approval included)
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare existing uuid;
begin
  select id into existing from public.profiles where lower(email) = lower(new.email) and claimed_at is null limit 1;
  if existing is not null then
    update public.profiles
       set id = new.id,
           email = new.email,
           claimed_at = now(),
           full_name = coalesce(nullif(full_name, ''), new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
           role = case when public.is_admin_email(new.email) then 'admin' else role end,
           approved = approved or public.is_admin_email(new.email)
     where id = existing;
  else
    insert into public.profiles (id, email, full_name, role, approved, claimed_at)
    values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
            case when public.is_admin_email(new.email) then 'admin' else 'member' end,
            public.is_admin_email(new.email), now())
    on conflict (id) do nothing;
  end if;
  return new;
end $$;

-- keep profiles in sync when an auth user is deleted from the dashboard
create or replace function public.handle_deleted_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from public.profiles where id = old.id;
  return old;
end $$;
drop trigger if exists on_auth_user_deleted on auth.users;
create trigger on_auth_user_deleted after delete on auth.users
  for each row execute procedure public.handle_deleted_user();

-- coach can create and remove client profiles
drop policy if exists "profiles admin insert" on public.profiles;
create policy "profiles admin insert" on public.profiles for insert with check (public.is_admin());
drop policy if exists "profiles admin delete" on public.profiles;
create policy "profiles admin delete" on public.profiles for delete using (public.is_admin());
