"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/auth";
import { getMembership } from "@/lib/team";
import { readText, textLength } from "@/lib/validation";
import type { FormState } from "@/lib/models";

function teamError(message: string): string {
  if (message.includes("ALREADY_IN_TEAM")) return "คุณมีทีมอยู่แล้ว";
  if (message.includes("TEAM_NOT_FOUND")) return "ไม่พบทีมจากรหัสนี้";
  if (message.includes("TEAM_NAME_REQUIRED")) return "กรุณากรอกชื่อทีม";
  if (message.includes("TEAM_NAME_TOO_LONG")) return "ชื่อทีมต้องไม่เกิน 100 ตัวอักษร";
  if (message.includes("JOIN_CODE_RETRY")) return "สร้างรหัสเชิญไม่สำเร็จ กรุณาลองอีกครั้ง";
  return "บันทึกทีมไม่สำเร็จ กรุณาตรวจว่าได้รันไฟล์ SQL ของ US-1 และ US-2 แล้ว และลองใหม่";
}

export async function createTeam(_previous: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await getAuthContext();
  const name = readText(formData, "name");
  const values = { name };
  try {
    if (await getMembership()) return { error: "คุณมีทีมอยู่แล้ว", values };
    if (!name) return { error: "กรุณากรอกชื่อทีม", fieldErrors: { name: "กรุณากรอกชื่อทีม" }, values };
    if (textLength(name) > 100) return { error: "ชื่อทีมต้องไม่เกิน 100 ตัวอักษร", values };
    const { error } = await supabase.rpc("create_team", { p_name: name });
    if (error) return { error: teamError(error.message), values };
  } catch {
    return { error: "ติดต่อระบบทีมไม่ได้ กรุณาตรวจอินเทอร์เน็ตแล้วลองใหม่", values };
  }
  revalidatePath("/team");
  redirect("/team");
}

export async function joinTeam(_previous: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await getAuthContext();
  const code = readText(formData, "code").toUpperCase();
  const values = { code };
  try {
    if (await getMembership()) return { error: "คุณมีทีมอยู่แล้ว", values };
    if (!/^[A-Z0-9]{6}$/.test(code)) return { error: "ไม่พบทีมจากรหัสนี้", fieldErrors: { code: "กรุณากรอกรหัสเชิญ 6 ตัวอักษร" }, values };
    const { error } = await supabase.rpc("join_team", { p_code: code });
    if (error) return { error: teamError(error.message), values };
  } catch {
    return { error: "ติดต่อระบบทีมไม่ได้ กรุณาตรวจอินเทอร์เน็ตแล้วลองใหม่", values };
  }
  revalidatePath("/team");
  redirect("/team");
}
