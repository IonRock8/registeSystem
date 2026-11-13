import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { getMembership, getTeam, getTeamMembers } from "@/lib/team";
import { formatThaiDate } from "@/lib/date";
import type { Task, TaskStatus } from "@/lib/models";
import { TaskForm } from "./task-form";

const columns: { status: TaskStatus; label: string; color: string }[] = [
  { status: "todo", label: "ยังไม่เริ่ม", color: "border-slate-300 bg-slate-100" },
  { status: "doing", label: "กำลังทำ", color: "border-blue-300 bg-blue-50" },
  { status: "done", label: "เสร็จแล้ว", color: "border-emerald-300 bg-emerald-50" },
];

async function getTasks(teamId: string): Promise<Task[]> {
  const { supabase } = await getAuthContext();
  const { data, error } = await supabase
    .from("tasks")
    .select("id, title, detail, due_date, status, assignee_id, created_at, assignee:profiles!tasks_assignee_id_fkey(id, display_name)")
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
      {membership.role === "lead" ? <TaskForm members={members} currentUserId={membership.user_id} /> : <p className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">คุณเป็นสมาชิกทีม ดูงานทุกชิ้นของทีมได้ หัวหน้าทีมเป็นผู้สร้างและมอบหมายงาน</p>}
      {tasks.length === 0 ? <p role="status" className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">ยังไม่มีงานในทีม</p> : null}
      <div className="grid items-start gap-5 lg:grid-cols-3">
        {columns.map((column) => {
          const items = tasks.filter((task) => task.status === column.status);
          return (
            <section key={column.status} className={`min-w-0 rounded-2xl border p-4 ${column.color}`} aria-labelledby={`column-${column.status}`}>
              <h2 id={`column-${column.status}`} className="mb-4 flex items-center justify-between gap-3 text-lg font-bold text-slate-900">{column.label}<span className="rounded-full bg-white px-2.5 py-0.5 text-sm text-slate-600">{items.length}<span className="sr-only"> งาน</span></span></h2>
              <ul className="space-y-3">
                {items.map((task) => <li key={task.id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <article>
                    <h3 className="break-words text-base font-bold text-slate-900">{task.title}</h3>
                    {task.detail ? <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-600">{task.detail}</p> : null}
                    <dl className="mt-4 space-y-2 text-sm">
                      <div><dt className="text-slate-500">ผู้รับงาน</dt><dd className="break-words font-medium text-slate-800">{task.assignee?.display_name}</dd></div>
                      <div><dt className="text-slate-500">กำหนดส่ง</dt><dd className="text-slate-800">{task.due_date ? <time dateTime={task.due_date}>{formatThaiDate(task.due_date)}</time> : "ไม่มีกำหนดส่ง"}</dd></div>
                    </dl>
                  </article>
                </li>)}
              </ul>
              {items.length === 0 ? <p className="py-4 text-center text-sm text-slate-500">ไม่มีงานในสถานะนี้</p> : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}
