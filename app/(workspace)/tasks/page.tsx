import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { getMembership, getTeam, getTeamMembers } from "@/lib/team";
import { getBangkokDate } from "@/lib/date";
import type { Task } from "@/lib/models";
import { TaskForm } from "./task-form";
import { TaskBoard } from "./task-board";

async function getTasks(teamId: string): Promise<Task[]> {
  const { supabase } = await getAuthContext();
  const { data, error } = await supabase
    .from("tasks")
    .select("id, team_id, title, detail, due_date, status, assignee_id, created_at, assignee:profiles!tasks_assignee_id_fkey(id, display_name)")
    .eq("team_id", teamId)
    .order("created_at", { ascending: false })
    .returns<Task[]>();
  if (error || !data) throw new Error("TASKS_UNAVAILABLE");
  if (data.some((task) => !task.assignee)) throw new Error("TASK_ASSIGNEE_UNAVAILABLE");
  return data;
}

export default async function TasksPage() {
  const membership = await getMembership();
  if (!membership) redirect("/team");
  const [team, members, tasks] = await Promise.all([
    getTeam(membership.team_id),
    membership.role === "lead" ? getTeamMembers(membership.team_id) : Promise.resolve([]),
    getTasks(membership.team_id),
  ]);

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1"><h1 className="page-title">งานในทีม</h1><p className="mt-1 break-words text-slate-600">{team.name} · {tasks.length} งาน</p></div>
        <Link href="/team" className="button-secondary">ดูสมาชิกทีม</Link>
      </div>
      {membership.role === "lead" ? <TaskForm members={members} currentUserId={membership.user_id} /> : <p className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">คุณดูงานทุกชิ้นในทีมได้ และเปลี่ยนสถานะได้เฉพาะงานที่มอบหมายให้คุณ</p>}
      {tasks.length === 0 ? <p role="status" className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">ยังไม่มีงานในทีม</p> : null}
      <TaskBoard tasks={tasks} membership={membership} todayBangkok={getBangkokDate()} />
    </div>
  );
}
