"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { FormFeedback } from "@/components/form-feedback";
import { formatThaiDate, isTaskOverdue } from "@/lib/date";
import { canUpdateTaskStatus, TASK_STATUSES } from "@/lib/task-status";
import type { FormState, Membership, Task, TaskStatus } from "@/lib/models";
import { updateTaskStatus } from "./actions";

const initial: FormState = {};
const columnColors: Record<TaskStatus, string> = {
  todo: "border-slate-300 bg-slate-100",
  doing: "border-blue-300 bg-blue-50",
  done: "border-emerald-300 bg-emerald-50",
};

function SaveStatusButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return <button type="submit" className="button-primary shrink-0" disabled={disabled}>{pending ? "กำลังบันทึก…" : "บันทึกสถานะ"}</button>;
}

export function TaskBoard({ tasks, membership, todayBangkok }: {
  tasks: Task[];
  membership: Membership;
  todayBangkok: string;
}) {
  const [state, action, pending] = useActionState(updateTaskStatus, initial);
  const feedback = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (state.success || state.error) feedback.current?.focus({ preventScroll: true });
  }, [state]);

  return (
    <div className="space-y-4" aria-busy={pending}>
      <div ref={feedback} tabIndex={-1} className="rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"><FormFeedback state={state} /></div>
      <div className="grid items-start gap-5 lg:grid-cols-3">
        {TASK_STATUSES.map((column) => {
          const items = tasks.filter((task) => task.status === column.value);
          return (
            <section key={column.value} className={`min-w-0 rounded-2xl border p-4 ${columnColors[column.value]}`} aria-labelledby={`column-${column.value}`}>
              <h2 id={`column-${column.value}`} className="mb-4 flex items-center justify-between gap-3 text-lg font-bold text-slate-900">{column.label}<span className="rounded-full bg-white px-2.5 py-0.5 text-sm text-slate-600">{items.length}<span className="sr-only"> งาน</span></span></h2>
              <ul className="space-y-3">
                {items.map((task) => <li key={task.id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <article>
                    <h3 className="break-words text-base font-bold text-slate-900">{task.title}</h3>
                    {isTaskOverdue(task.due_date, task.status, todayBangkok) ? <p className="mt-2 inline-flex rounded-full border border-red-300 bg-red-50 px-3 py-1 text-xs font-semibold text-red-800">เลยกำหนด</p> : null}
                    {task.detail ? <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-600">{task.detail}</p> : null}
                    <dl className="mt-4 space-y-2 text-sm">
                      <div><dt className="text-slate-500">ผู้รับงาน</dt><dd className="break-words font-medium text-slate-800">{task.assignee?.display_name}</dd></div>
                      <div><dt className="text-slate-500">กำหนดส่ง</dt><dd className="text-slate-800">{task.due_date ? <time dateTime={task.due_date}>{formatThaiDate(task.due_date)}</time> : "ไม่มีกำหนดส่ง"}</dd></div>
                    </dl>
                    {canUpdateTaskStatus(task, membership, membership.user_id) ? (
                      <form action={action} aria-label={`เปลี่ยนสถานะงาน ${task.title}`} className="mt-4 border-t border-slate-100 pt-4">
                        <input type="hidden" name="task_id" value={task.id} />
                        <input type="hidden" name="expected_status" value={task.status} />
                        <label htmlFor={`status-${task.id}`} className="field-label">เปลี่ยนสถานะ</label>
                        <select key={`${task.id}:${task.status}`} id={`status-${task.id}`} name="status" defaultValue={task.status} className="field-input" disabled={pending}>
                          {TASK_STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
                        </select>
                        <div className="mt-3"><SaveStatusButton disabled={pending} /></div>
                      </form>
                    ) : null}
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
