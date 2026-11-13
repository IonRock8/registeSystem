"use client";

import { useActionState } from "react";
import { createTeam, joinTeam } from "./actions";
import { FieldError, FormFeedback } from "@/components/form-feedback";
import type { FormState } from "@/lib/models";

const initial: FormState = {};

export function TeamForms() {
  const [createState, createAction, creating] = useActionState(createTeam, initial);
  const [joinState, joinAction, joining] = useActionState(joinTeam, initial);
  return (
    <div className="mt-6 grid gap-5 md:grid-cols-2">
      <section className="panel">
        <h2 className="text-xl font-bold text-blue-950">สร้างทีม</h2>
        <p className="mt-1 text-sm text-slate-600">คุณจะเป็นหัวหน้าทีมและสร้างงานให้สมาชิกได้</p>
        <form action={createAction} noValidate className="mt-5 space-y-4" aria-busy={creating}>
          <FormFeedback state={createState} />
          <div><label className="field-label" htmlFor="team-name">ชื่อทีม</label>
            <input className="field-input" id="team-name" name="name" required maxLength={100} defaultValue={createState.values?.name} aria-invalid={!!createState.fieldErrors?.name} aria-describedby={createState.fieldErrors?.name ? "team-name-error" : undefined} />
            <FieldError id="team-name-error" message={createState.fieldErrors?.name} />
          </div>
          <button type="submit" className="button-primary" disabled={creating || joining}>{creating ? "กำลังสร้างทีม…" : "สร้างทีม"}</button>
        </form>
      </section>
      <section className="panel">
        <h2 className="text-xl font-bold text-blue-950">เข้าร่วมทีม</h2>
        <p className="mt-1 text-sm text-slate-600">ขอรหัสเชิญจากเพื่อนในทีมของคุณ</p>
        <form action={joinAction} noValidate className="mt-5 space-y-4" aria-busy={joining}>
          <FormFeedback state={joinState} />
          <div><label className="field-label" htmlFor="team-code">รหัสเชิญ 6 ตัวอักษร</label>
            <input className="field-input uppercase tracking-widest" id="team-code" name="code" required minLength={6} maxLength={6} autoCapitalize="characters" autoComplete="off" spellCheck={false} defaultValue={joinState.values?.code} aria-invalid={!!joinState.fieldErrors?.code} aria-describedby={joinState.fieldErrors?.code ? "team-code-error" : undefined} />
            <FieldError id="team-code-error" message={joinState.fieldErrors?.code} />
          </div>
          <button type="submit" className="button-primary" disabled={creating || joining}>{joining ? "กำลังเข้าร่วมทีม…" : "เข้าร่วมทีม"}</button>
        </form>
      </section>
    </div>
  );
}
