// เจ้าของโปรเจกต์รันเอง: node --env-file=.env.local scripts/check-us4.mjs
// ทดสอบด้วย Data API และ session ผู้ใช้จริง ไม่รัน SQL และไม่ใช้ secret key
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { randomUUID } from "node:crypto";

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
const columns = "id,team_id,title,detail,due_date,status,assignee_id,created_by,created_at,updated_at";

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
  if (!result.ok || !result.data?.access_token) throw new Error(`ล็อกอินบัญชี ${label} ไม่สำเร็จ กรุณาตรวจบัญชีและรหัสผ่าน`);
  const session = { token: result.data.access_token, userId: result.data.user.id };
  sessions.push(session);
  const membership = await request(`/rest/v1/team_members?select=team_id,user_id,role&user_id=eq.${session.userId}`, { session });
  if (!membership.ok || membership.data?.length !== 1) throw new Error(`บัญชี ${label} ต้องมีทีมก่อนทดสอบ`);
  return { ...session, membership: membership.data[0] };
}

async function createFixture(session, assigneeId, title, dueDate = null) {
  const result = await request("/rest/v1/tasks", {
    session,
    method: "POST",
    body: { title, team_id: session.membership.team_id, assignee_id: assigneeId, created_by: session.userId, due_date: dueDate },
  });
  if (!result.ok || result.data?.length !== 1) throw new Error("สร้างงานทดสอบไม่สำเร็จ กรุณาตรวจ migration US-1 ถึง US-4 และบทบาทบัญชี");
  return result.data[0];
}

function patchTask(session, id, body) {
  return request(`/rest/v1/tasks?id=eq.${id}&select=${columns}`, { session, method: "PATCH", body });
}

async function readTask(session, id) {
  const result = await request(`/rest/v1/tasks?id=eq.${id}&select=${columns}`, { session });
  if (!result.ok || result.data?.length !== 1) throw new Error("อ่านงานเพื่อตรวจผลไม่สำเร็จ กรุณาตรวจสิทธิ์และการเชื่อมต่อ");
  return result.data[0];
}

function yesterdayBangkok() {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const part = (type) => parts.find((item) => item.type === type).value;
  const today = `${part("year")}-${part("month")}-${part("day")}`;
  return new Date(Date.parse(`${today}T00:00:00Z`) - 86400000).toISOString().slice(0, 10);
}

try {
  console.log("ทดสอบ US-4: A หัวหน้าทีม 1, B สมาชิกทีม 1, C หัวหน้าทีม 2");
  console.log("จะสร้างงานทดสอบใหม่ 3 งาน และเปลี่ยนเฉพาะงานที่โปรแกรมสร้าง ไม่ลบข้อมูลเดิม");
  if ((await rl.question("พิมพ์ TEST เพื่อเริ่ม: ")).trim() !== "TEST") throw new Error("ยกเลิกการทดสอบ ยังไม่ได้สร้างงาน");
  const a = await login("A (หัวหน้าทีม 1)");
  const b = await login("B (สมาชิกทีม 1)");
  const c = await login("C (หัวหน้าทีม 2)");
  check(a.membership.role === "lead" && b.membership.role === "member" && c.membership.role === "lead", "บทบาทถูกต้อง");
  check(a.membership.team_id === b.membership.team_id && a.membership.team_id !== c.membership.team_id, "ทีมของบัญชีทดสอบถูกต้อง");

  const marker = `US-4 ${new Date().toISOString()}`;
  const forB = await createFixture(a, b.userId, `${marker} งานของ B`, yesterdayBangkok());
  const forA = await createFixture(a, a.userId, `${marker} งานของ A`);
  const forC = await createFixture(c, c.userId, `${marker} งานของ C`);

  for (const status of ["doing", "done", "todo"]) {
    const result = await patchTask(b, forB.id, { status });
    check(result.ok && result.data?.length === 1 && result.data[0].status === status, `AC-4.1 B เปลี่ยนงานตัวเองเป็น ${status} ได้`);
  }
  const afterMemberUpdate = await readTask(a, forB.id);
  check(Date.parse(afterMemberUpdate.updated_at) > Date.parse(forB.updated_at), "updated_at เปลี่ยนโดยฐานข้อมูลเมื่อบันทึก");

  for (const [task, status] of [[forB, "doing"], [forA, "done"]]) {
    const result = await patchTask(a, task.id, { status });
    check(result.ok && result.data?.length === 1 && result.data[0].status === status, "AC-4.2 หัวหน้าเปลี่ยนสถานะงานในทีมได้");
  }

  const beforeA = await readTask(a, forA.id);
  const otherMember = await patchTask(b, forA.id, { status: "doing" });
  check(otherMember.ok && Array.isArray(otherMember.data) && otherMember.data.length === 0, "AC-4.3 คำขอ B ไม่แก้งานที่มอบหมายให้ A");
  check(JSON.stringify(await readTask(a, forA.id)) === JSON.stringify(beforeA), "AC-4.3 ตรวจข้อมูลจริง: งานของ A ไม่เปลี่ยน");

  const beforeB = await readTask(a, forB.id);
  const forbiddenChanges = [
    [{ title: "ไม่ควรถูกบันทึก" }, "ชื่องาน"],
    [{ detail: "ไม่ควรถูกบันทึก" }, "รายละเอียด"],
    [{ due_date: "2099-01-01" }, "กำหนดส่ง"],
    [{ assignee_id: a.userId }, "ผู้รับงานเป็นสมาชิกอื่นในทีม"],
    [{ team_id: c.membership.team_id }, "ทีม"],
    [{ id: randomUUID() }, "รหัสงาน"],
    [{ created_by: b.userId }, "ผู้สร้างงาน"],
    [{ created_at: "2000-01-01T00:00:00Z" }, "เวลาสร้าง"],
    [{ updated_at: "2099-01-01T00:00:00Z" }, "เวลาแก้ไขที่ผู้ใช้กำหนดเอง"],
    [{ status: "done", title: "แอบเปลี่ยนพร้อมสถานะ" }, "สถานะพร้อมชื่องาน"],
  ];
  for (const [body, label] of forbiddenChanges) {
    const result = await patchTask(b, forB.id, body);
    check(!result.ok && result.data?.code === "42501", `AC-4.4 ฐานข้อมูลปฏิเสธการแก้ ${label}`);
    check(JSON.stringify(await readTask(a, forB.id)) === JSON.stringify(beforeB), `AC-4.4 ข้อมูลไม่เปลี่ยนหลังพยายามแก้ ${label}`);
  }

  const invalidStatus = await patchTask(b, forB.id, { status: "archived" });
  check(!invalidStatus.ok && invalidStatus.data?.code === "23514", "สถานะนอก todo/doing/done ถูกปฏิเสธ");
  check(JSON.stringify(await readTask(a, forB.id)) === JSON.stringify(beforeB), "สถานะผิดไม่เปลี่ยนข้อมูลหรือ updated_at");

  const crossTeam = await patchTask(c, forB.id, { status: "done" });
  check(crossTeam.ok && Array.isArray(crossTeam.data) && crossTeam.data.length === 0, "คนนอกทีมแก้งานทีม 1 ไม่ได้");
  check(JSON.stringify(await readTask(a, forB.id)) === JSON.stringify(beforeB), "ตรวจข้อมูลจริง: คนนอกทีมไม่ทำให้งานเปลี่ยน");
  const reverse = await patchTask(a, forC.id, { status: "doing" });
  check(reverse.ok && Array.isArray(reverse.data) && reverse.data.length === 0, "หัวหน้าทีม 1 แก้งานทีม 2 ไม่ได้");

  const immutableTeam = await patchTask(a, forA.id, { team_id: c.membership.team_id });
  check(!immutableTeam.ok && immutableTeam.data?.code === "42501", "หัวหน้าก็ย้ายงานข้ามทีมไม่ได้");
  const outsiderAssignee = await patchTask(a, forA.id, { assignee_id: c.userId });
  check(!outsiderAssignee.ok && ["42501", "23503"].includes(outsiderAssignee.data?.code), "หัวหน้ามอบงานใหม่ให้คนนอกทีมไม่ได้");

  console.log(`\nผ่าน ${passCount} รายการ`);
  console.log("ตรวจหน้า /tasks ต่อ: งานทดสอบของ B อยู่กำลังทำและเลยกำหนด; งานของ A อยู่เสร็จแล้ว; งานของ C อยู่ยังไม่เริ่มในทีม 2");
  console.log("AC-4.5: ให้ B เปลี่ยนงานตัวเองเป็นเสร็จแล้ว ป้ายเลยกำหนดต้องหาย และเปิดกลับเป็นกำลังทำแล้วป้ายต้องกลับมา");
} catch (error) {
  console.error(error instanceof Error && /^(ไม่ผ่าน:|ยกเลิก|ล็อกอิน|บัญชี|สร้างงาน|อ่านงาน)/.test(error.message) ? error.message : "ติดต่อระบบไม่ได้ กรุณาตรวจอินเทอร์เน็ต การตั้งค่า Supabase และ migration US-4");
  process.exitCode = 1;
} finally {
  muted = false;
  rl.close();
  await Promise.allSettled(sessions.map((session) => request("/auth/v1/logout?scope=local", { session, method: "POST" })));
}
