import type { FormState } from "@/lib/models";

export function FormFeedback({ state }: { state: FormState }) {
  if (state.error) {
    return <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{state.error}</p>;
  }
  if (state.success) {
    return <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{state.success}</p>;
  }
  return null;
}

export function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? <p id={id} className="mt-1 text-sm text-red-700">{message}</p> : null;
}
