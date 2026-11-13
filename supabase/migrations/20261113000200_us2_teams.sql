-- US-2 / AC-2.1–AC-2.6: ทีมและสิทธิ์การเป็นสมาชิก
-- รันหลัง 20261113000100_us1_profiles.sql
begin;

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null constraint teams_name_valid check (char_length(btrim(name)) between 1 and 100 and name ~ '[^[:space:]]'),
  join_code text not null unique check (join_code ~ '^[A-Z0-9]{6}$'),
  created_by uuid not null unique references public.profiles(id),
  created_at timestamptz not null default now()
);
create table public.team_members (
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  role text not null check (role in ('lead', 'member')),
  joined_at timestamptz not null default now(),
  primary key (team_id, user_id)
);
create unique index team_members_one_lead on public.team_members(team_id) where role = 'lead';

alter table public.teams enable row level security;
alter table public.team_members enable row level security;
revoke all on public.teams, public.team_members from public, anon, authenticated;
grant select on public.teams, public.team_members to authenticated;

create function private.current_team_id()
returns uuid language sql stable security definer set search_path = ''
as $$
  select m.team_id from public.team_members m where m.user_id = (select auth.uid());
$$;
create function private.is_team_lead(p_team_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.team_members m
    where m.user_id = (select auth.uid()) and m.team_id = p_team_id and m.role = 'lead'
  );
$$;
revoke all on function private.current_team_id() from public, anon, authenticated;
revoke all on function private.is_team_lead(uuid) from public, anon, authenticated;
grant execute on function private.current_team_id() to authenticated;
grant execute on function private.is_team_lead(uuid) to authenticated;

create policy teams_read_own on public.teams for select
to authenticated using (id = (select private.current_team_id()));
create policy team_members_read_teammates on public.team_members for select
to authenticated using (team_id = (select private.current_team_id()));
create policy profiles_read_teammates on public.profiles for select
to authenticated using (
  exists (
    select 1 from public.team_members m
    where m.user_id = profiles.id and m.team_id = (select private.current_team_id())
  )
);

create function public.create_team(p_name text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_team_id uuid;
  v_attempt integer;
begin
  if v_uid is null then raise exception 'NOT_LOGGED_IN'; end if;
  if coalesce(p_name, '') !~ '[^[:space:]]' then raise exception 'TEAM_NAME_REQUIRED'; end if;
  if char_length(btrim(p_name)) > 100 then raise exception 'TEAM_NAME_TOO_LONG'; end if;

  -- ล็อกผู้ใช้คนเดียวกัน ป้องกันคำขอสร้าง/เข้าร่วมทีมพร้อมกัน
  perform 1 from public.profiles where id = v_uid for update;
  if not found then raise exception 'PROFILE_REQUIRED'; end if;
  if exists (select 1 from public.team_members where user_id = v_uid) then
    raise exception 'ALREADY_IN_TEAM';
  end if;

  for v_attempt in 1..5 loop
    begin
      insert into public.teams(name, join_code, created_by)
      values (btrim(p_name), upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)), v_uid)
      returning id into v_team_id;
      exit;
    exception when unique_violation then
      if v_attempt = 5 then raise exception 'JOIN_CODE_RETRY'; end if;
    end;
  end loop;

  insert into public.team_members(team_id, user_id, role) values (v_team_id, v_uid, 'lead');
  return v_team_id;
end;
$$;

create function public.join_team(p_code text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_team_id uuid;
begin
  if v_uid is null then raise exception 'NOT_LOGGED_IN'; end if;
  perform 1 from public.profiles where id = v_uid for update;
  if not found then raise exception 'PROFILE_REQUIRED'; end if;
  if exists (select 1 from public.team_members where user_id = v_uid) then
    raise exception 'ALREADY_IN_TEAM';
  end if;
  select id into v_team_id from public.teams where join_code = upper(btrim(p_code));
  if v_team_id is null then raise exception 'TEAM_NOT_FOUND'; end if;
  insert into public.team_members(team_id, user_id, role) values (v_team_id, v_uid, 'member');
  return v_team_id;
end;
$$;
revoke all on function public.create_team(text) from public, anon, authenticated;
revoke all on function public.join_team(text) from public, anon, authenticated;
grant execute on function public.create_team(text) to authenticated;
grant execute on function public.join_team(text) to authenticated;

commit;
