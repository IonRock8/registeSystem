-- US-3 / AC-3.1–AC-3.7: หัวหน้าสร้างงานและมอบหมายภายในทีม
-- รันหลัง migration US-1 และ US-2
begin;

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  title text not null constraint tasks_title_valid check (char_length(btrim(title)) between 1 and 200 and title ~ '[^[:space:]]'),
  detail text constraint tasks_detail_valid check (detail is null or char_length(detail) <= 5000),
  due_date date,
  status text not null default 'todo' check (status in ('todo', 'doing', 'done')),
  assignee_id uuid not null references public.profiles(id),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tasks_assignee_team_fkey foreign key (team_id, assignee_id)
    references public.team_members(team_id, user_id)
);
create index tasks_team_id_idx on public.tasks(team_id);
create index tasks_assignee_id_idx on public.tasks(assignee_id);
create index tasks_created_by_idx on public.tasks(created_by);
alter table public.tasks enable row level security;

-- กำหนดสิทธิ์เอง ไม่ขึ้นกับ Automatically expose new tables
revoke all on public.tasks from public, anon, authenticated;
grant select, insert on public.tasks to authenticated;

create policy tasks_read_team on public.tasks for select
to authenticated using (team_id = (select private.current_team_id()));

create policy tasks_lead_insert on public.tasks for insert
to authenticated with check (
  private.is_team_lead(team_id)
  and created_by = (select auth.uid())
  and status = 'todo'
  and exists (
    select 1 from public.team_members m
    where m.team_id = tasks.team_id and m.user_id = tasks.assignee_id
  )
);

-- US-3 ยังไม่ให้แก้/ลบงาน เมื่อทำ US-4 ต้องเพิ่ม policy และ trigger จำกัดคอลัมน์
commit;
