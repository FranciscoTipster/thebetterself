-- ============================================================================
-- THEBETTERSELF members app — Supabase schema
-- Run this once in the Supabase SQL editor (Database → SQL → New query).
-- ============================================================================

-- Admin emails: add more addresses to this list if needed.
create or replace function public.is_admin_email(e text) returns boolean
language sql immutable as $$
  select lower(e) in ('tiagosampaiocontact@gmail.com');
$$;

-- ---------------------------------------------------------------- profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  program text default 'NOT SURE',
  role text not null default 'member' check (role in ('member','admin')),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
          case when public.is_admin_email(new.email) then 'admin' else 'member' end)
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- ---------------------------------------------------------------- logins
create table if not exists public.logins (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  at timestamptz not null default now(),
  user_agent text
);

-- ---------------------------------------------------------------- workouts (templates assigned to a member)
create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  day_label text,
  coach_notes text,
  sort int not null default 0,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts(id) on delete cascade,
  name text not null,
  target_sets int not null default 3,
  target_reps text not null default '8-12',
  sort int not null default 0
);

-- ---------------------------------------------------------------- sessions (a logged workout)
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  workout_id uuid references public.workouts(id) on delete set null,
  workout_title text,
  date date not null default current_date,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.session_sets (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  exercise_id uuid references public.workout_exercises(id) on delete set null,
  exercise_name text not null,
  set_no int not null,
  weight_kg numeric(6,2),
  reps int
);

-- ---------------------------------------------------------------- notes
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,   -- the member the note belongs to
  author_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null default 'member' check (kind in ('member','coach')),
  body text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- row level security
alter table public.profiles enable row level security;
alter table public.logins enable row level security;
alter table public.workouts enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.sessions enable row level security;
alter table public.session_sets enable row level security;
alter table public.notes enable row level security;

-- profiles: members see/edit their own (not the role); admins see/edit all
drop policy if exists "profiles self read" on public.profiles;
create policy "profiles self read" on public.profiles for select using (id = auth.uid() or public.is_admin());
drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update" on public.profiles for update using (id = auth.uid() or public.is_admin())
  with check ((id = auth.uid() and role = (select role from public.profiles where id = auth.uid())) or public.is_admin());

-- logins: insert own, read own or admin
drop policy if exists "logins insert own" on public.logins;
create policy "logins insert own" on public.logins for insert with check (user_id = auth.uid());
drop policy if exists "logins read" on public.logins;
create policy "logins read" on public.logins for select using (user_id = auth.uid() or public.is_admin());

-- workouts + exercises: members read their own; admins manage all
drop policy if exists "workouts read" on public.workouts;
create policy "workouts read" on public.workouts for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "workouts admin write" on public.workouts;
create policy "workouts admin write" on public.workouts for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "exercises read" on public.workout_exercises;
create policy "exercises read" on public.workout_exercises for select
  using (exists (select 1 from public.workouts w where w.id = workout_id and (w.user_id = auth.uid() or public.is_admin())));
drop policy if exists "exercises admin write" on public.workout_exercises;
create policy "exercises admin write" on public.workout_exercises for all using (public.is_admin()) with check (public.is_admin());

-- sessions + sets: members manage their own; admins read all
drop policy if exists "sessions own" on public.sessions;
create policy "sessions own" on public.sessions for all using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());
drop policy if exists "sets own" on public.session_sets;
create policy "sets own" on public.session_sets for all
  using (exists (select 1 from public.sessions s where s.id = session_id and (s.user_id = auth.uid() or public.is_admin())))
  with check (exists (select 1 from public.sessions s where s.id = session_id and (s.user_id = auth.uid() or public.is_admin())));

-- notes: members read notes about them and write their own 'member' notes; admins everything
drop policy if exists "notes read" on public.notes;
create policy "notes read" on public.notes for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "notes member insert" on public.notes;
create policy "notes member insert" on public.notes for insert
  with check ((user_id = auth.uid() and author_id = auth.uid() and kind = 'member') or public.is_admin());
drop policy if exists "notes delete own" on public.notes;
create policy "notes delete own" on public.notes for delete using (author_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------- helpful indexes
create index if not exists logins_user_at on public.logins (user_id, at desc);
create index if not exists sessions_user_date on public.sessions (user_id, date desc);
create index if not exists notes_user_created on public.notes (user_id, created_at desc);
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
