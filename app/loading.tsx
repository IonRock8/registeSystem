export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-bold text-blue-900">ระบบติดตามงานทีม</h1>
      <p role="status" className="mt-8 text-slate-600">
        กำลังตรวจการเชื่อมต่อ Supabase…
      </p>
    </main>
  );
}
