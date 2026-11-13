"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { getMembership } from "@/lib/team";
import { validateTask } from "@/lib/validation";
import type { FormState } from "@/lib/models";

export async function createTask(_previous: FormState, formData: FormData): Promise<FormState> {
  // ตรวจผู้เรียกที่ server ทุกครั้ง ไม่เชื่อ user_id, team_id หรือ role ในฟอร์ม
  const { supabase, user } = await getAuthContext();
  const membership = await getMembership();
  if (!membership) redirect("/team");
  if (membership.role !== "lead") return { error: "เฉพาะหัวหน้าทีมเท่านั้นที่สร้างงานได้" };

  const { values, fieldErrors, valid } = validateTask(formData);
  if (!valid) return { error: "กรุณาตรวจข้อมูลที่กรอก", values, fieldErrors };

  try {
    // รายชื่อที่เคยแสดงในฟอร์มอาจเก่า จึงตรวจสมาชิกอีกครั้งก่อนเขียน
    const { data: assignee, error: assigneeError } = await supabase
      .from("team_members")
      .select("user_id")
      .eq("team_id", membership.team_id)
      .eq("user_id", values.assignee_id)
      .maybeSingle();
    if (assigneeError) return { error: "ตรวจรายชื่อสมาชิกไม่สำเร็จ กรุณาลองใหม่", values };
    if (!assignee) return { error: "เลือกผู้รับงานได้เฉพาะสมาชิกในทีม", fieldErrors: { assignee_id: "ผู้รับงานต้องเป็นสมาชิกในทีมนี้" }, values };

    const { error } = await supabase.from("tasks").insert({
      title: values.title,
      detail: values.detail || null,
      due_date: values.due_date || null,
      assignee_id: values.assignee_id,
      team_id: membership.team_id,
      created_by: user.id,
      status: "todo",
    });
    if (error) {
      if (error.code === "23503") return { error: "ผู้รับงานต้องเป็นสมาชิกในทีมนี้ กรุณาโหลดหน้าใหม่", values };
      if (error.code === "42501") return { error: "คุณไม่มีสิทธิ์สร้างงานนี้ กรุณาตรวจบทบาทและสมาชิกทีม", values };
      return { error: "สร้างงานไม่สำเร็จ ตรวจว่าได้รันไฟล์ SQL ของ US-3 แล้ว และลองใหม่", values };
    }
  } catch {
    return { error: "ติดต่อระบบไม่ได้ กรุณาตรวจอินเทอร์เน็ตและรายการงานก่อนลองบันทึกอีกครั้ง", values };
  }

  revalidatePath("/tasks");
  return { success: "สร้างงานสำเร็จ งานอยู่ในคอลัมน์ยังไม่เริ่ม", values: { title: "", detail: "", due_date: "", assignee_id: "" } };
}
