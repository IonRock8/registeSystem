// ผู้ใช้รันเองเท่านั้น: node --env-file=.env.local scripts/check-us3.mjs
// ใช้ Data API ตามสิทธิ์จริง ไม่มี SQL, secret key หรือการข้าม RLS
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";

const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!projectUrl || !publishableKey?.startsWith("sb_publishable_")) {
  console.error("กรุณาตั้งค่า Project URL และ Publishable key ใน .env.local ก่อน");
  process.exit(1);
}

let muted = false;
const terminalOutput = new Writable({
  write(chunk, encoding, callback) {
    if (!muted) process.stdout.write(chunk, encoding);
    callback();
  },
});
const rl = createInterface({ input: process.stdin, output: terminalOutput, terminal: !!process.stdin.isTTY });
const sessions = [];
let passCount = 0;

async function request(path, { session, method = "GET", body } = {}) {
  const response = await fetch(new URL(path, projectUrl), {
    method,
    headers: {
      apikey: publishableKey,
      ...(session ? { Authorization: `Bearer ${session.token}` } : {}),
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  const text = await response.text();
  return { ok: response.ok, status: response.status, data: text ? JSON.parse(text) : null };
}

function check(condition, label) {
  if (!condition) throw new Error(`ไม่ผ่าน: ${label}`);
  passCount++;
  console.log(`ผ่าน: ${label}`);
}

async function login(label) {
  console.log(`\nบัญชี ${label}`);
  const email = (await rl.question("อีเมล: ")).trim();
  process.stdout.write("รหัสผ่าน (ไม่แสดงขณะพิมพ์): ");
  muted = true;
  let password;
  try { password = await rl.question(""); } finally { muted = false; process.stdout.write("\n"); }
  const result = await request("/auth/v1/token?grant_type=password", { method: "POST", body: { email, password } });
  password = undefined;
  if (!result.ok || !result.data?.access_token) throw new Error(`ล็อกอินบัญชี ${label} ไม่สำเร็จ ตรวจอีเมล รหัสผ่าน และ Confirm email`);
  const session = { token: result.data.access_token, userId: result.data.user.id };
  sessions.push(session);
  const membership = await request(`/rest/v1/team_members?select=team_id,user_id,role&user_id=eq.${session.userId}`, { session });
  if (!membership.ok || membership.data?.length !== 1) throw new Error(`บัญชี ${label} ต้องมีทีมก่อนทดสอบ`);
  return { ...session, membership: membership.data[0] };
}

try {
  console.log("ทดสอบ AC-3 ผ่าน Data API: ต้องมี A หัวหน้าทีม 1, B สมาชิกทีม 1 และ C หัวหน้าทีม 2");
  console.log("โปรแกรมจะสร้างงานทดสอบ 2 งานในทีม 1 และเก็บไว้ให้ตรวจบนกระดาน ไม่ลบข้อมูลเดิม");
  const confirmation = await rl.question("พิมพ์ TEST เพื่อเริ่ม: ");
  if (confirmation.trim() !== "TEST") throw new Error("ยกเลิกการทดสอบ ยังไม่ได้สร้างงาน");
  const a = await login("A (หัวหน้าทีม 1)");
  const b = await login("B (สมาชิกทีม 1)");
  const c = await login("C (หัวหน้าทีม 2)");
  check(a.membership.role === "lead" && b.membership.role === "member" && c.membership.role === "lead", "บทบาทบัญชีทดสอบถูกต้อง");
  check(a.membership.team_id === b.membership.team_id && a.membership.team_id !== c.membership.team_id, "ทีมของบัญชีทดสอบถูกต้อง");

  const repeatCreate = await request("/rest/v1/rpc/create_team", { session: a, method: "POST", body: { p_name: "ไม่ควรถูกสร้าง" } });
  check(!repeatCreate.ok && repeatCreate.data?.message?.includes("ALREADY_IN_TEAM"), "AC-2.4 สร้างทีมที่สองโดยข้ามหน้าจอไม่ได้");
  const repeatJoin = await request("/rest/v1/rpc/join_team", { session: b, method: "POST", body: { p_code: "000000" } });
  check(!repeatJoin.ok && repeatJoin.data?.message?.includes("ALREADY_IN_TEAM"), "AC-2.4 มีทีมแล้วส่งคำขอเข้าร่วมทีมซ้ำไม่ได้");
  for (const [table, filter] of [
    ["teams", `id=eq.${a.membership.team_id}`],
    ["team_members", `team_id=eq.${a.membership.team_id}`],
    ["profiles", `id=in.(${a.userId},${b.userId})`],
  ]) {
    const result = await request(`/rest/v1/${table}?select=*&${filter}`, { session: c });
    check(result.ok && result.data?.length === 0, `AC-2.6 คนนอกทีมอ่าน ${table} ของทีม 1 ไม่ได้`);
  }

  const marker = `AC-3 ${new Date().toISOString()}`;
  const base = { team_id: a.membership.team_id, title: marker, assignee_id: b.userId, created_by: a.userId };
  const created = await request("/rest/v1/tasks", { session: a, method: "POST", body: base });
  check(created.ok && created.data?.[0]?.status === "todo", "AC-3.1 หัวหน้าสร้างงานให้สมาชิกได้และเริ่ม todo");
  const createdId = created.data[0].id;
  const self = await request("/rest/v1/tasks", { session: a, method: "POST", body: { ...base, title: `${marker} self`, assignee_id: a.userId } });
  check(self.ok && self.data?.[0]?.status === "todo", "AC-3.1 หัวหน้ามอบงานให้ตัวเองได้");

  const forbiddenCases = [
    [b, { ...base, created_by: b.userId, title: `${marker} forbidden-member` }, "AC-3.3 สมาชิกสร้างงานโดยข้ามหน้าจอไม่ได้"],
    [a, { ...base, assignee_id: c.userId, title: `${marker} forbidden-outsider` }, "AC-3.4 มอบงานให้คนนอกทีมไม่ได้"],
    [a, { ...base, title: "   " }, "AC-3.5 ชื่องานว่างถูกฐานข้อมูลปฏิเสธ"],
    [a, { ...base, created_by: b.userId, title: `${marker} forged-author` }, "ปลอมผู้สร้างงานไม่ได้"],
    [a, { ...base, status: "done", title: `${marker} forged-status` }, "งานใหม่เริ่มสถานะอื่นไม่ได้"],
    [a, { ...base, team_id: c.membership.team_id, assignee_id: c.userId, title: `${marker} forged-team` }, "สร้างงานในทีมอื่นไม่ได้"],
  ];
  for (const [session, body, label] of forbiddenCases) {
    const result = await request("/rest/v1/tasks", { session, method: "POST", body });
    check(!result.ok && ["42501", "23503", "23514"].includes(result.data?.code), label);
  }

  const memberRead = await request(`/rest/v1/tasks?select=id,team_id&id=eq.${createdId}`, { session: b });
  check(memberRead.ok && memberRead.data?.length === 1, "AC-3.2 สมาชิกเห็นงานที่หัวหน้าสร้าง");

  const teamBRows = await request(`/rest/v1/tasks?select=id,team_id&team_id=eq.${c.membership.team_id}`, { session: c });
  check(teamBRows.ok && teamBRows.data?.length > 0, "AC-3.7 ทีม 2 มีงานจริงสำหรับใช้เป็นหลักฐาน");
  const hidden = await request(`/rest/v1/tasks?select=id,team_id&team_id=eq.${c.membership.team_id}`, { session: a });
  check(hidden.ok && hidden.data?.length === 0, "AC-3.7 บัญชี A อ่านงานทีม 2 ไม่ได้");
  const reverse = await request(`/rest/v1/tasks?select=id&id=eq.${createdId}`, { session: c });
  check(reverse.ok && reverse.data?.length === 0, "AC-3.7 บัญชี C อ่านงานทีม 1 ไม่ได้");

  const allA = await request("/rest/v1/tasks?select=id,team_id", { session: a });
  check(allA.ok && allA.data?.length > 0 && allA.data.every((row) => row.team_id === a.membership.team_id), "AC-3.7 ไม่ส่งตัวกรองทีมก็เห็นเฉพาะทีมตัวเอง");
  const anonymous = await request("/rest/v1/tasks?select=id");
  check(!anonymous.ok || Array.isArray(anonymous.data) && anonymous.data.length === 0, "ยังไม่ล็อกอินอ่านงานไม่ได้");
  console.log(`\nผ่าน ${passCount} รายการ ตรวจหน้าจอและวันที่ตามคู่มือเพิ่มเติม`);
} catch (error) {
  console.error(error instanceof Error && !error.message.includes("fetch") ? error.message : "ติดต่อระบบไม่ได้ กรุณาตรวจอินเทอร์เน็ตและการตั้งค่า Supabase");
  process.exitCode = 1;
} finally {
  muted = false;
  rl.close();
  // ออกจากระบบเฉพาะ session ที่โปรแกรมนี้สร้าง ไม่กระทบ session บนหน้าเว็บ
  await Promise.allSettled(sessions.map((session) => request("/auth/v1/logout?scope=local", { session, method: "POST" })));
}
