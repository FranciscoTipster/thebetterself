create or replace function public.is_admin_email(e text) returns boolean
language sql immutable as $$
  select lower(e) in ('tiagosampaiocontact@gmail.com', 'juangomezb16@gmail.com');
$$;
update public.profiles set role = 'admin', approved = true where lower(email) in ('tiagosampaiocontact@gmail.com', 'juangomezb16@gmail.com');
