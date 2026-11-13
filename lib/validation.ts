// ใช้ทั้งฝั่งเซิร์ฟเวอร์และแบบทดสอบ ไม่ใช้ข้อมูลผู้ใช้เป็นสิทธิ์
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function readText(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

// นับแบบ Unicode code point ให้ตรง char_length ใน PostgreSQL
export function textLength(value: string): number {
  return Array.from(value).length;
}

export function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (year < 1 || year > 9999 || month < 1 || month > 12 || day < 1) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= days[month - 1];
}

export function validateTask(formData: FormData) {
  const values = {
    title: readText(formData, "title"),
    detail: readText(formData, "detail"),
    due_date: readText(formData, "due_date"),
    assignee_id: readText(formData, "assignee_id"),
  };
  const fieldErrors: Record<string, string> = {};
  if (!values.title) fieldErrors.title = "กรุณากรอกชื่องาน";
  else if (textLength(values.title) > 200) fieldErrors.title = "ชื่องานต้องไม่เกิน 200 ตัวอักษร";
  if (textLength(values.detail) > 5000) fieldErrors.detail = "รายละเอียดต้องไม่เกิน 5,000 ตัวอักษร";
  if (values.due_date && !isValidDate(values.due_date)) fieldErrors.due_date = "กรุณาเลือกวันที่ที่ถูกต้อง";
  if (!UUID_PATTERN.test(values.assignee_id)) fieldErrors.assignee_id = "กรุณาเลือกผู้รับงานในทีม";
  return { values, fieldErrors, valid: Object.keys(fieldErrors).length === 0 };
}
