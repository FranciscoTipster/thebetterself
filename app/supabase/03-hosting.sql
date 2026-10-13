-- Public bucket that serves the website files (static hosting on Supabase Storage).
insert into storage.buckets (id, name, public, file_size_limit)
values ('site', 'site', true, 52428800)
on conflict (id) do update set public = true;

-- TEMPORARY: let the publishable key upload/replace files while deploying. Removed by 04-hosting-lock.sql.
drop policy if exists "site deploy insert" on storage.objects;
create policy "site deploy insert" on storage.objects for insert to anon, authenticated with check (bucket_id = 'site');
drop policy if exists "site deploy update" on storage.objects;
create policy "site deploy update" on storage.objects for update to anon, authenticated using (bucket_id = 'site') with check (bucket_id = 'site');
drop policy if exists "site bucket read" on storage.buckets;
create policy "site bucket read" on storage.buckets for select to anon, authenticated using (id = 'site');
drop policy if exists "site public read" on storage.objects;
create policy "site public read" on storage.objects for select to anon, authenticated using (bucket_id = 'site');
