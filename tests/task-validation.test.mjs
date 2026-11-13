import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

// แปลง helper ที่ไม่มี import เป็น JavaScript ด้วย TypeScript ที่โปรเจกต์ติดตั้งอยู่แล้ว
async function loadHelper(relativePath) {
  const source = await readFile(new URL(relativePath, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);
}
const { validateTask, isValidDate } = await loadHelper("../lib/validation.ts");
const { formatThaiDate } = await loadHelper("../lib/date.ts");
const assignee = "00000000-0000-0000-0000-000000000001";

function taskForm(values = {}) {
  const form = new FormData();
  for (const [name, value] of Object.entries({ title: "งานทดลอง", assignee_id: assignee, ...values })) {
    form.set(name, value);
  }
  return form;
}

test("AC-3.1: allows optional detail/date and trims title", () => {
  const result = validateTask(taskForm({ title: "  ตรวจรายงาน  " }));
  assert.equal(result.valid, true);
  assert.equal(result.values.title, "ตรวจรายงาน");
  assert.equal(result.values.detail, "");
  assert.equal(result.values.due_date, "");
});

test("AC-3.5: empty and whitespace-only titles receive the required Thai message", () => {
  for (const title of ["", "   ", "\n\t"]) {
    const result = validateTask(taskForm({ title }));
    assert.equal(result.valid, false);
    assert.equal(result.fieldErrors.title, "กรุณากรอกชื่องาน");
  }
});

test("rejects forged file values, malformed assignee and overlong input", () => {
  const form = taskForm({ assignee_id: "not-a-uuid", detail: "ก".repeat(5001) });
  form.set("title", new Blob(["fake-title"]), "fake.txt");
  const result = validateTask(form);
  assert.ok(result.fieldErrors.title);
  assert.ok(result.fieldErrors.assignee_id);
  assert.ok(result.fieldErrors.detail);
});

test("uses Unicode length consistent with database text constraints", () => {
  assert.equal(validateTask(taskForm({ title: "😀".repeat(200) })).valid, true);
  assert.equal(validateTask(taskForm({ title: "😀".repeat(201) })).valid, false);
});

test("rejects non-existent dates instead of letting JavaScript normalize them", () => {
  for (const invalid of ["2026-02-29", "2026-04-31", "0000-01-01", "2026-13-01", "2026-1-1", "not-a-date"]) {
    assert.equal(isValidDate(invalid), false, invalid);
    assert.ok(validateTask(taskForm({ due_date: invalid })).fieldErrors.due_date);
  }
  assert.equal(isValidDate("2028-02-29"), true);
  assert.equal(isValidDate("2000-02-29"), true);
  assert.equal(isValidDate("1900-02-29"), false);
});

test("does not pass user-supplied ownership, team or status to creation payload", () => {
  const result = validateTask(taskForm({ team_id: "forged", created_by: "forged", role: "lead", status: "done" }));
  assert.deepEqual(Object.keys(result.values).sort(), ["assignee_id", "detail", "due_date", "title"]);
});

test("AC-3.2: date stays the same Thai calendar day across process timezones", () => {
  const previousTimezone = process.env.TZ;
  try {
    for (const timezone of ["UTC", "America/Los_Angeles", "Asia/Bangkok"]) {
      process.env.TZ = timezone;
      const result = formatThaiDate("2026-11-13");
      assert.match(result, /13/);
      assert.match(result, /2569/);
    }
    assert.equal(formatThaiDate(null), "ไม่มีกำหนดส่ง");
  } finally {
    if (previousTimezone === undefined) delete process.env.TZ;
    else process.env.TZ = previousTimezone;
  }
});
