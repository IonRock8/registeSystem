"use client";

import { useActionState, useState } from "react";
import { signIn, signUp } from "./actions";
import { FieldError, FormFeedback } from "@/components/form-feedback";
import type { FormState } from "@/lib/models";

const initialState: FormState = {};

function SignInForm() {
  const [state, action, pending] = useActionState(signIn, initialState);
  return (
    <form action={action} noValidate className="space-y-5" aria-label="เข้าสู่ระบบ" aria-busy={pending}>
      <FormFeedback state={state} />
      <div><label htmlFor="login-email" className="field-label">อีเมล</label>
        <input id="login-email" name="email" type="email" autoComplete="email" required className="field-input" defaultValue={state.values?.email} />
      </div>
      <div><label htmlFor="login-password" className="field-label">รหัสผ่าน</label>
        <input id="login-password" name="password" type="password" autoComplete="current-password" required className="field-input" />
      </div>
      <button className="button-primary w-full" type="submit" disabled={pending}>{pending ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}</button>
    </form>
  );
}

function SignUpForm() {
  const [state, action, pending] = useActionState(signUp, initialState);
  return (
    <form action={action} noValidate className="space-y-5" aria-label="สมัครสมาชิก" aria-busy={pending}>
      <FormFeedback state={state} />
      <div><label htmlFor="signup-name" className="field-label">ชื่อที่แสดง</label>
        <input id="signup-name" name="display_name" autoComplete="nickname" required maxLength={100} className="field-input" defaultValue={state.values?.display_name} aria-invalid={!!state.fieldErrors?.display_name} aria-describedby={state.fieldErrors?.display_name ? "signup-name-error" : undefined} />
        <FieldError id="signup-name-error" message={state.fieldErrors?.display_name} />
      </div>
      <div><label htmlFor="signup-email" className="field-label">อีเมล</label>
        <input id="signup-email" name="email" type="email" autoComplete="email" required className="field-input" defaultValue={state.values?.email} aria-invalid={!!state.fieldErrors?.email} aria-describedby={state.fieldErrors?.email ? "signup-email-error" : undefined} />
        <FieldError id="signup-email-error" message={state.fieldErrors?.email} />
      </div>
      <div><label htmlFor="signup-password" className="field-label">รหัสผ่าน</label>
        <input id="signup-password" name="password" type="password" autoComplete="new-password" required minLength={6} className="field-input" aria-invalid={!!state.fieldErrors?.password} aria-describedby="password-help signup-password-error" />
        <p id="password-help" className="mt-1 text-sm text-slate-500">อย่างน้อย 6 ตัวอักษร</p>
        <FieldError id="signup-password-error" message={state.fieldErrors?.password} />
      </div>
      <button className="button-primary w-full" type="submit" disabled={pending}>{pending ? "กำลังสมัครสมาชิก…" : "สมัครสมาชิก"}</button>
    </form>
  );
}

export function AuthForm() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1" role="group" aria-label="เลือกเข้าสู่ระบบหรือสมัครสมาชิก">
        <button type="button" className={mode === "login" ? "button-primary" : "button-secondary"} aria-pressed={mode === "login"} onClick={() => setMode("login")}>เข้าสู่ระบบ</button>
        <button type="button" className={mode === "signup" ? "button-primary" : "button-secondary"} aria-pressed={mode === "signup"} onClick={() => setMode("signup")}>สมัครสมาชิก</button>
      </div>
      {mode === "login" ? <SignInForm /> : <SignUpForm />}
    </>
  );
}
