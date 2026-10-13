-- Lock the site bucket again after deploying (public read stays; uploads need the dashboard or a deploy policy).
drop policy if exists "site deploy insert" on storage.objects;
drop policy if exists "site deploy update" on storage.objects;
