"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section role="alert" className="mx-auto my-8 max-w-xl rounded-2xl border border-amber-300 bg-amber-50 p-6">
      <h1 className="text-xl font-bold">ยังโหลดข้อมูลไม่ได้</h1>
      <p className="mt-2 text-slate-700">ตรวจอินเทอร์เน็ตและตรวจว่าได้รันไฟล์ SQL ของ US-1, US-2 และ US-3 ใน Supabase แล้ว จากนั้นลองอีกครั้ง</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" onClick={reset} className="button-primary">ลองใหม่</button>
        <Link className="button-secondary" href="/login">กลับไปหน้าเข้าสู่ระบบ</Link>
      </div>
    </section>
  );
}
