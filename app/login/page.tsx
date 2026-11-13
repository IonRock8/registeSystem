import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "./auth-form";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (hasSupabaseEnv) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (data.user) redirect("/team");
  }
  return (
    <main className="mx-auto w-full max-w-md px-4 py-10 sm:py-16">
      <Link href="/" className="text-sm font-medium text-blue-800 hover:underline">กลับหน้าแรก</Link>
      <h1 className="mt-5 text-3xl font-bold text-blue-950">ระบบติดตามงานทีม</h1>
      <p className="mt-2 text-slate-600">ร่วมทีม มอบหมายงาน และเห็นความคืบหน้าในที่เดียว</p>
      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
        {hasSupabaseEnv ? <AuthForm /> : <p role="alert" className="text-amber-900">ยังไม่ได้ตั้งค่า Supabase กรุณาใส่ Project URL และ Publishable key ใน .env.local แล้วหยุดและรันเว็บใหม่</p>}
      </section>
    </main>
  );
}
