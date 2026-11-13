import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

async function moduleUrl(path, dependencies = {}) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  let { outputText } = ts.transpileModule(source, {
    fileName: path,
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  });
  const modules = {
    react: import.meta.resolve("react"),
    "react-dom": import.meta.resolve("react-dom"),
    "react/jsx-runtime": import.meta.resolve("react/jsx-runtime"),
    ...dependencies,
  };
  for (const [name, url] of Object.entries(modules)) {
    outputText = outputText.replaceAll(JSON.stringify(name), JSON.stringify(url));
  }
  return `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`;
}

const statusUrl = await moduleUrl("../lib/task-status.ts");
const validationUrl = await moduleUrl("../lib/validation.ts");
const { canUpdateTaskStatus } = await import(statusUrl);
const { validateStatusUpdate } = await import(await moduleUrl("../lib/task-status-validation.ts", {
  "@/lib/task-status": statusUrl,
  "@/lib/validation": validationUrl,
}));
const { getBangkokDate, isTaskOverdue } = await import(await moduleUrl("../lib/date.ts"));

const member = { team_id: "team-a", user_id: "member-b", role: "member" };
const lead = { team_id: "team-a", user_id: "lead-a", role: "lead" };
const task = { team_id: "team-a", assignee_id: "member-b" };

test("AC-4.1 / AC-4.3: member can update own assigned task but not another member's task", () => {
  assert.equal(canUpdateTaskStatus(task, member, "member-b"), true);
  assert.equal(canUpdateTaskStatus({ ...task, assignee_id: "lead-a" }, member, "member-b"), false);
});

test("AC-4.2: lead can update any assignee within own team", () => {
  assert.equal(canUpdateTaskStatus(task, lead, "lead-a"), true);
  assert.equal(canUpdateTaskStatus({ ...task, assignee_id: "lead-a" }, lead, "lead-a"), true);
});

test("AC-4.3: cross-team task and mismatched authenticated user are denied", () => {
  assert.equal(canUpdateTaskStatus({ ...task, team_id: "team-c" }, lead, "lead-a"), false);
  assert.equal(canUpdateTaskStatus({ ...task, team_id: "team-c" }, member, "member-b"), false);
  assert.equal(canUpdateTaskStatus(task, lead, "member-b"), false);
});

function statusForm(values = {}) {
  const form = new FormData();
  for (const [name, value] of Object.entries({
    task_id: "00000000-0000-0000-0000-000000000001", status: "doing", expected_status: "todo", ...values,
  })) form.set(name, value);
  return form;
}

test("AC-4.1: accepts all supported destinations including moving back to todo", () => {
  for (const expected_status of ["todo", "doing", "done"]) {
    for (const status of ["todo", "doing", "done"]) {
      assert.equal(validateStatusUpdate(statusForm({ status, expected_status })).error, null);
    }
  }
});

test("rejects missing/forged task IDs, unknown statuses and file-valued statuses", () => {
  for (const values of [{ task_id: "" }, { task_id: "forged" }, { status: "archived" }, { expected_status: "" }]) {
    assert.ok(validateStatusUpdate(statusForm(values)).error);
  }
  const form = statusForm();
  form.set("status", new Blob(["done"]), "forged.txt");
  assert.ok(validateStatusUpdate(form).error);
});

test("AC-4.4: status form only extracts status, task ID and concurrency check", () => {
  const { values, error } = validateStatusUpdate(statusForm({ title: "forged", detail: "forged", team_id: "forged", assignee_id: "forged", created_by: "forged", updated_at: "forged" }));
  assert.equal(error, null);
  assert.deepEqual(Object.keys(values).sort(), ["expected_status", "status", "task_id"]);
});

test("AC-4.5: overdue only when due day is before today and the task is unfinished", () => {
  assert.equal(isTaskOverdue("2026-11-12", "todo", "2026-11-13"), true);
  assert.equal(isTaskOverdue("2026-11-12", "doing", "2026-11-13"), true);
  assert.equal(isTaskOverdue("2026-11-12", "done", "2026-11-13"), false);
  assert.equal(isTaskOverdue("2026-11-13", "todo", "2026-11-13"), false);
  assert.equal(isTaskOverdue("2026-11-14", "doing", "2026-11-13"), false);
  assert.equal(isTaskOverdue(null, "todo", "2026-11-13"), false);
});

test("AC-4.5: Bangkok midnight changes overdue status even when UTC is the previous day", () => {
  const beforeMidnight = getBangkokDate(new Date("2026-11-12T16:59:59.999Z"));
  const atMidnight = getBangkokDate(new Date("2026-11-12T17:00:00.000Z"));
  assert.equal(beforeMidnight, "2026-11-12");
  assert.equal(atMidnight, "2026-11-13");
  assert.equal(isTaskOverdue("2026-11-12", "doing", beforeMidnight), false);
  assert.equal(isTaskOverdue("2026-11-12", "doing", atMidnight), true);
});

test("AC-4.5: Bangkok calendar is independent of server/browser timezone and handles year rollover", () => {
  const previousTimezone = process.env.TZ;
  try {
    for (const timezone of ["UTC", "America/Los_Angeles", "Asia/Tokyo"]) {
      process.env.TZ = timezone;
      assert.equal(getBangkokDate(new Date("2026-12-31T17:00:00Z")), "2027-01-01");
    }
  } finally {
    if (previousTimezone === undefined) delete process.env.TZ;
    else process.env.TZ = previousTimezone;
  }
});

const { TaskBoard } = await import(await moduleUrl("../app/(workspace)/tasks/task-board.tsx", {
  "@/components/form-feedback": await moduleUrl("../components/form-feedback.tsx"),
  "@/lib/date": await moduleUrl("../lib/date.ts"),
  "@/lib/task-status": statusUrl,
  "./actions": "data:text/javascript,export async function updateTaskStatus(){return {}}",
}));
const boardTasks = [
  { id: "task-b", team_id: "team-a", title: "งานของ B", detail: null, due_date: "2026-11-12", status: "doing", assignee_id: "member-b", assignee: { id: "member-b", display_name: "B" } },
  { id: "task-a", team_id: "team-a", title: "งานของ A", detail: null, due_date: "2026-11-12", status: "done", assignee_id: "lead-a", assignee: { id: "lead-a", display_name: "A" } },
];

test("AC-4.1–AC-4.3: rendered board exposes only allowed task status controls", () => {
  const memberHtml = renderToStaticMarkup(createElement(TaskBoard, { tasks: boardTasks, membership: member, todayBangkok: "2026-11-13" }));
  assert.match(memberHtml, /id="status-task-b"/);
  assert.doesNotMatch(memberHtml, /id="status-task-a"/);
  const leadHtml = renderToStaticMarkup(createElement(TaskBoard, { tasks: boardTasks, membership: lead, todayBangkok: "2026-11-13" }));
  assert.match(leadHtml, /id="status-task-b"/);
  assert.match(leadHtml, /id="status-task-a"/);
});

test("AC-4.5: rendered board labels unfinished overdue work and removes badge after completion", () => {
  const html = renderToStaticMarkup(createElement(TaskBoard, { tasks: boardTasks, membership: member, todayBangkok: "2026-11-13" }));
  assert.equal((html.match(/>เลยกำหนด</g) ?? []).length, 1);
  const finished = boardTasks.map((item) => ({ ...item, status: "done" }));
  const finishedHtml = renderToStaticMarkup(createElement(TaskBoard, { tasks: finished, membership: member, todayBangkok: "2026-11-13" }));
  assert.doesNotMatch(finishedHtml, />เลยกำหนด</);
});
