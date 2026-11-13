export function formatThaiDate(value: string | null): string {
  if (!value) return "ไม่มีกำหนดส่ง";
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Bangkok",
  }).format(new Date(`${value}T00:00:00+07:00`));
}

export function getBangkokDate(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function isTaskOverdue(dueDate: string | null, status: string, todayBangkok: string): boolean {
  // due_date เป็น YYYY-MM-DD จากฐานข้อมูล วันครบกำหนดยังไม่ถือว่าเลยกำหนด
  return dueDate !== null && status !== "done" && dueDate < todayBangkok;
}
