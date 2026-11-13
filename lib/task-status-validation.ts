import { isTaskStatus } from "@/lib/task-status";
import { readText, UUID_PATTERN } from "@/lib/validation";

export function validateStatusUpdate(formData: FormData) {
  // รับเฉพาะรหัสงานและสถานะ ไม่ส่งข้อมูลทีม/เจ้าของ/คอลัมน์อื่นไปแก้
  const values = {
    task_id: readText(formData, "task_id"),
    status: readText(formData, "status"),
    expected_status: readText(formData, "expected_status"),
  };
  if (!UUID_PATTERN.test(values.task_id)) return { values, error: "รหัสงานไม่ถูกต้อง กรุณาโหลดหน้าใหม่" };
  if (!isTaskStatus(values.status) || !isTaskStatus(values.expected_status)) {
    return { values, error: "กรุณาเลือกสถานะที่ถูกต้อง" };
  }
  return { values, error: null };
}
