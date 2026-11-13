import Link from "next/link";
import { getMembership, getTeam, getTeamMembers } from "@/lib/team";
import { TeamForms } from "./team-forms";

export default async function TeamPage() {
  const membership = await getMembership();
  if (!membership) {
    return <><h1 className="page-title">เริ่มทำงานกับทีมของคุณ</h1><p className="mt-2 text-slate-600">สร้างทีมใหม่ หรือเข้าร่วมทีมที่มีอยู่ คุณอยู่ได้ครั้งละหนึ่งทีม</p><TeamForms /></>;
  }
  const [team, members] = await Promise.all([getTeam(membership.team_id), getTeamMembers(membership.team_id)]);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1"><p className="text-sm font-medium text-blue-800">ทีมของฉัน</p><h1 className="page-title mt-1 break-words">{team.name}</h1></div>
        <Link href="/tasks" className="button-primary">ดูงานในทีม</Link>
      </div>
      <section className="panel">
        <h2 className="text-lg font-bold text-blue-950">รหัสเชิญเข้าทีม</h2>
        <p className="mt-3 inline-block rounded-xl bg-blue-50 px-5 py-3 font-mono text-2xl font-bold tracking-[0.25em] text-blue-950">{team.join_code}</p>
        <p className="mt-3 text-sm text-slate-600">ส่งรหัสนี้ให้คนที่ต้องการชวนเข้าทีม</p>
      </section>
      <section className="panel">
        <h2 className="text-lg font-bold text-blue-950">สมาชิกทีม <span className="text-slate-500">({members.length} คน)</span></h2>
        <ul className="mt-4 divide-y divide-slate-100">
          {members.map((member) => <li key={member.user_id} className="flex items-center justify-between gap-3 py-3">
            <span className="min-w-0 break-words">{member.profile?.display_name}{member.user_id === membership.user_id ? " (คุณ)" : ""}</span>
            <span className={`shrink-0 rounded-full px-3 py-1 text-sm ${member.role === "lead" ? "bg-blue-100 text-blue-900" : "bg-slate-100 text-slate-700"}`}>{member.role === "lead" ? "หัวหน้า" : "สมาชิก"}</span>
          </li>)}
        </ul>
      </section>
    </div>
  );
}
