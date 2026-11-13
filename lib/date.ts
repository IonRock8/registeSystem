export function formatThaiDate(value: string | null): string {
  if (!value) return "ไม่มีกำหนดส่ง";
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Bangkok",
  }).format(new Date(`${value}T00:00:00+07:00`));
}
