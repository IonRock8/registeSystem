"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto w-full max-w-xl px-4 py-12">
      <section role="alert" className="rounded-2xl border border-amber-300 bg-amber-50 p-6">
        <h1 className="text-xl font-bold">ยังเปิดหน้านี้ไม่ได้</h1>
        <p className="mt-2">ตรวจการเชื่อมต่อและการตั้งค่า Supabase แล้วลองใหม่อีกครั้ง</p>
        <button type="button" className="button-primary mt-4" onClick={reset}>ลองใหม่</button>
      </section>
    </main>
  );
}
