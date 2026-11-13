-- US-1 / AC-1.1: สร้างโปรไฟล์หลังสมัครและให้อ่านเฉพาะของตัวเอง
-- รันเองใน Supabase SQL Editor เป็นไฟล์แรก
begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;
grant usage on schema public to authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null constraint profiles_name_valid
    check (char_length(btrim(display_name)) between 1 and 100 and display_name ~ '[^[:space:]]'),
  email text not null,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
revoke all on public.profiles from public, anon, authenticated;
grant select on public.profiles to authenticated;

create policy profiles_read_own on public.profiles for select
to authenticated using (id = (select auth.uid()));

create function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles(id, display_name, email)
  values (
    new.id,
    left(coalesce(nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''), 'สมาชิก'), 100),
    coalesce(new.email, '')
  );
  return new;
end;
$$;
revoke all on function private.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

-- รองรับบัญชีที่เจ้าของโปรเจกต์สร้างไว้ก่อนรันไฟล์นี้
insert into public.profiles(id, display_name, email)
select id,
  left(coalesce(nullif(btrim(raw_user_meta_data ->> 'display_name'), ''), 'สมาชิก'), 100),
  coalesce(email, '')
from auth.users
on conflict (id) do nothing;

commit;
