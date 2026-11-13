import type { Membership, TaskStatus } from "@/lib/models";

export const TASK_STATUSES: { value: TaskStatus; label: string }[] = [
  { value: "todo", label: "ยังไม่เริ่ม" },
  { value: "doing", label: "กำลังทำ" },
  { value: "done", label: "เสร็จแล้ว" },
];

export function isTaskStatus(value: string): value is TaskStatus {
  return value === "todo" || value === "doing" || value === "done";
}

export function canUpdateTaskStatus(
  task: { team_id: string; assignee_id: string },
  membership: Membership,
  userId: string,
): boolean {
  return membership.user_id === userId && task.team_id === membership.team_id &&
    (membership.role === "lead" || task.assignee_id === userId);
}
