import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

// ตรวจสถานะใหม่ทุกครั้งที่เปิดหน้า ไม่จำผลไว้ตอน build
export const dynamic = "force-dynamic";

type Status = { ok: boolean; title: string; detail: string };

// ตรวจว่าเชื่อม Supabase ได้หรือยัง เพื่อให้ผู้เรียนรู้ว่าตั้งค่าครบแล้ว
async function checkSupabase(): Promise<Status> {
  if (!hasSupabaseEnv) {
    return {
      ok: false,
      title: "ยังไม่ได้ตั้งค่าการเชื่อมต่อ Supabase ให้ครบ",
      detail:
        "คัดลอกไฟล์ .env.example เป็น .env.local แล้วใส่ Project URL และ Publishable key จาก Supabase จากนั้นหยุดแล้วรัน npm run dev ใหม่",
    };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("profiles")
      .select("id", { head: true });

    if (!error) {
      return {
        ok: true,
        title: "เชื่อม Supabase สำเร็จ และพบตาราง profiles แล้ว",
        detail: "พร้อมเข้าสู่ระบบเพื่อสร้างทีมและมอบหมายงาน",
      };
    }

    const missingTable =
      error.code === "PGRST205" ||
      error.code === "42P01" ||
      /could not find the table|does not exist/i.test(error.message);

    if (missingTable) {
      return {
        ok: true,
        title: "เชื่อม Supabase สำเร็จ",
        detail:
          "ติดต่อ Supabase ได้แล้ว แต่ยังไม่พบตาราง profiles กรุณารันไฟล์ SQL ของ US-1, US-2 และ US-3 ตามลำดับใน SQL Editor",
      };
    }

    return {
      ok: false,
      title: "เชื่อม Supabase ไม่สำเร็จ",
      detail: "ตรวจ Project URL และ Publishable key ใน .env.local ว่ามาจากโปรเจกต์เดียวกัน ตรวจว่าโปรเจกต์ Supabase พร้อมใช้งาน แล้วหยุดและรัน npm run dev ใหม่",
    };
  } catch {
    return {
      ok: false,
      title: "ติดต่อ Supabase ไม่ได้ในขณะนี้",
      detail: "ตรวจการเชื่อมต่ออินเทอร์เน็ตและ Project URL ใน .env.local รวมถึงตรวจว่าโปรเจกต์ Supabase ไม่ได้ถูกพักการใช้งาน แล้วลองโหลดหน้านี้ใหม่",
    };
  }
}

export default async function Home() {
  const status = await checkSupabase();

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-bold text-blue-900">ระบบติดตามงานทีม</h1>
      <p className="mt-2 text-slate-600">
        เว็บตั้งต้นสำหรับเวิร์กช็อปสร้างระบบด้วย Codex
      </p>

      <section
        aria-labelledby="connection-status"
        className={`mt-8 rounded-2xl border p-6 ${
          status.ok
            ? "border-emerald-300 bg-emerald-50"
            : "border-amber-300 bg-amber-50"
        }`}
      >
        <p className="text-sm font-semibold">
          {status.ok ? "สถานะ: พร้อม" : "สถานะ: ยังไม่พร้อม"}
        </p>
        <h2 id="connection-status" className="mt-1 text-xl font-bold">{status.title}</h2>
        <p className="mt-2 break-words text-slate-700">{status.detail}</p>
      </section>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-bold text-blue-900">เริ่มใช้งาน</h2>
        <p className="mt-2 text-slate-600">สมัครสมาชิกหรือเข้าสู่ระบบ แล้วสร้างทีมหรือเข้าร่วมทีมของเพื่อน</p>
        <Link href="/login" className="button-primary mt-4">เข้าสู่ระบบ / สมัครสมาชิก</Link>
      </section>
    </main>
  );
}
