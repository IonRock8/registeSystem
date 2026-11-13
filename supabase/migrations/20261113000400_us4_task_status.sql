-- US-4 / AC-4.1–AC-4.4: เปลี่ยนสถานะได้โดยหัวหน้าหรือผู้รับงานเท่านั้น
-- รันไฟล์นี้ครั้งเดียว หลัง migration US-1, US-2 และ US-3 สำเร็จแล้ว
begin;

-- RLS ตรวจแถวที่แก้ได้ทั้งก่อนและหลังแก้ ส่วน trigger ตรวจคอลัมน์
grant update on public.tasks to authenticated;

create policy tasks_lead_or_assignee_update on public.tasks for update
to authenticated
using (
  team_id = (select private.current_team_id())
  and (
    private.is_team_lead(team_id)
    or assignee_id = (select auth.uid())
  )
)
with check (
  team_id = (select private.current_team_id())
  and (
    private.is_team_lead(team_id)
    or assignee_id = (select auth.uid())
  )
  and exists (
    select 1 from public.team_members m
    where m.team_id = tasks.team_id and m.user_id = tasks.assignee_id
  )
);

create function private.tasks_guard_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  -- แม้เป็นหัวหน้าก็เปลี่ยนรหัสงาน ทีม ผู้สร้าง หรือเวลาสร้างไม่ได้
  if new.id is distinct from old.id
    or new.team_id is distinct from old.team_id
    or new.created_by is distinct from old.created_by
    or new.created_at is distinct from old.created_at then
    raise exception 'CANNOT_CHANGE_TASK_OWNER' using errcode = '42501';
  end if;

  -- เทียบทุกคอลัมน์ยกเว้น status ก่อนที่ระบบจะตั้ง updated_at
  -- ทำให้คอลัมน์ที่เพิ่มในอนาคตถูกป้องกันด้วย ไม่ใช่เฉพาะช่องที่มีบนฟอร์ม
  if not private.is_team_lead(old.team_id)
    and (to_jsonb(new) - 'status') is distinct from (to_jsonb(old) - 'status') then
    raise exception 'ONLY_STATUS_ALLOWED' using errcode = '42501';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

revoke all on function private.tasks_guard_update() from public, anon, authenticated;

create trigger tasks_guard_update
before update on public.tasks
for each row execute function private.tasks_guard_update();

-- CHECK เดิมจำกัดสถานะ todo/doing/done และ FK เดิมจำกัดผู้รับให้อยู่ทีมเดียวกัน
-- SELECT, INSERT และสิทธิ์ DELETE ของ US-3 ใช้กฎเดิม
commit;
