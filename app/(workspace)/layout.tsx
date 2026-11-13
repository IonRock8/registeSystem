import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth";
import { signOut } from "@/app/login/actions";

export const dynamic = "force-dynamic";

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  return (
    <>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:block focus:bg-white focus:p-4">ข้ามไปเนื้อหา</a>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <Link href="/tasks" className="text-xl font-bold text-blue-950">ระบบติดตามงานทีม</Link>
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <p className="max-w-48 truncate text-sm text-slate-600" title={profile.display_name}>{profile.display_name}</p>
            <form action={signOut}><button className="button-secondary" type="submit">ออกจากระบบ</button></form>
          </div>
        </div>
        <nav aria-label="เมนูหลัก" className="mx-auto flex max-w-6xl gap-2 px-4 pb-3">
          <Link href="/team" className="nav-link">ทีมของฉัน</Link>
          <Link href="/tasks" className="nav-link">งานในทีม</Link>
        </nav>
      </header>
      <main id="main-content" className="mx-auto w-full max-w-6xl px-4 py-8">{children}</main>
    </>
  );
}
