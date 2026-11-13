"use client";

import { useActionState } from "react";
import { createTask } from "./actions";
import { FieldError, FormFeedback } from "@/components/form-feedback";
import type { FormState, TeamMember } from "@/lib/models";

const initial: FormState = {};

export function TaskForm({ members, currentUserId }: { members: TeamMember[]; currentUserId: string }) {
  const [state, action, pending] = useActionState(createTask, initial);
  return (
    <section className="panel" aria-labelledby="create-task-title">
      <h2 id="create-task-title" className="text-xl font-bold text-blue-950">สร้างงาน</h2>
      <p className="mt-1 text-sm text-slate-600">มอบหมายให้สมาชิกในทีม รวมถึงตัวคุณเอง</p>
      <form action={action} noValidate className="mt-5 space-y-4" aria-busy={pending}>
        <FormFeedback state={state} />
        <fieldset disabled={pending} className="min-w-0 space-y-4">
          <legend className="sr-only">รายละเอียดงานใหม่</legend>
          <div>
            <label className="field-label" htmlFor="task-title">ชื่องาน <span className="text-red-700">(จำเป็น)</span></label>
            <input className="field-input" id="task-title" name="title" required maxLength={200} defaultValue={state.values?.title ?? ""} aria-invalid={!!state.fieldErrors?.title} aria-describedby="task-title-help task-title-error" />
            <p id="task-title-help" className="mt-1 text-sm text-slate-500">ไม่เกิน 200 ตัวอักษร</p>
            <FieldError id="task-title-error" message={state.fieldErrors?.title} />
          </div>
          <div>
            <label className="field-label" htmlFor="task-detail">รายละเอียด <span className="font-normal text-slate-500">(ไม่บังคับ)</span></label>
            <textarea className="field-input min-h-28 resize-y" id="task-detail" name="detail" rows={3} maxLength={5000} defaultValue={state.values?.detail ?? ""} aria-invalid={!!state.fieldErrors?.detail} aria-describedby="task-detail-help task-detail-error" />
            <p id="task-detail-help" className="mt-1 text-sm text-slate-500">ไม่เกิน 5,000 ตัวอักษร</p>
            <FieldError id="task-detail-error" message={state.fieldErrors?.detail} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="field-label" htmlFor="task-assignee">ผู้รับงาน <span className="text-red-700">(จำเป็น)</span></label>
              <select className="field-input" id="task-assignee" name="assignee_id" required defaultValue={state.values?.assignee_id ?? ""} aria-invalid={!!state.fieldErrors?.assignee_id} aria-describedby={state.fieldErrors?.assignee_id ? "task-assignee-error" : undefined}>
                <option value="" disabled>เลือกสมาชิกในทีม</option>
                {members.map((member) => <option key={member.user_id} value={member.user_id}>{member.profile?.display_name}{member.user_id === currentUserId ? " (คุณ)" : ""}</option>)}
              </select>
              <FieldError id="task-assignee-error" message={state.fieldErrors?.assignee_id} />
            </div>
            <div>
              <label className="field-label" htmlFor="task-due">วันกำหนดส่ง <span className="font-normal text-slate-500">(ไม่บังคับ)</span></label>
              <input className="field-input" id="task-due" name="due_date" type="date" min="0001-01-01" max="9999-12-31" defaultValue={state.values?.due_date ?? ""} aria-invalid={!!state.fieldErrors?.due_date} aria-describedby={state.fieldErrors?.due_date ? "task-due-error" : undefined} />
              <FieldError id="task-due-error" message={state.fieldErrors?.due_date} />
            </div>
          </div>
          <button className="button-primary" type="submit" disabled={pending || members.length === 0}>{pending ? "กำลังสร้างงาน…" : "สร้างงาน"}</button>
        </fieldset>
      </form>
    </section>
  );
}
