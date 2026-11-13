"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { getAuthContext } from "@/lib/auth";
import { readText, textLength } from "@/lib/validation";
import type { FormState } from "@/lib/models";

function credentials(formData: FormData) {
  return {
    email: readText(formData, "email"),
    password: typeof formData.get("password") === "string" ? String(formData.get("password")) : "",
  };
}

function authError(code?: string): string {
  if (code === "email_not_confirmed") return "กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ สำหรับเวิร์กช็อปให้ปิด Confirm email ใน Supabase ก่อนสมัคร";
  if (code === "over_email_send_rate_limit" || code === "over_request_rate_limit") return "มีการใช้งานถี่เกินไป กรุณารอสักครู่แล้วลองใหม่";
  return "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
}

export async function signIn(_previous: FormState, formData: FormData): Promise<FormState> {
  if (!hasSupabaseEnv) return { error: "กรุณาตั้งค่า Supabase ใน .env.local ก่อน" };
  const { email, password } = credentials(formData);
  const values = { email };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password) {
    return { error: "กรุณากรอกอีเมลและรหัสผ่านให้ครบ", values };
  }
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: authError(error.code), values };
  } catch {
    return { error: "ติดต่อระบบเข้าสู่ระบบไม่ได้ กรุณาตรวจอินเทอร์เน็ตแล้วลองใหม่", values };
  }
  revalidatePath("/", "layout");
  redirect("/team");
}

export async function signUp(_previous: FormState, formData: FormData): Promise<FormState> {
  if (!hasSupabaseEnv) return { error: "กรุณาตั้งค่า Supabase ใน .env.local ก่อน" };
  const { email, password } = credentials(formData);
  const displayName = readText(formData, "display_name");
  const values = { email, display_name: displayName };
  const fieldErrors: Record<string, string> = {};
  if (!displayName) fieldErrors.display_name = "กรุณากรอกชื่อที่แสดง";
  else if (textLength(displayName) > 100) fieldErrors.display_name = "ชื่อต้องไม่เกิน 100 ตัวอักษร";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fieldErrors.email = "กรุณากรอกอีเมลให้ถูกต้อง";
  if (textLength(password) < 6) fieldErrors.password = "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร";
  if (Object.keys(fieldErrors).length) return { fieldErrors, values, error: "กรุณาตรวจข้อมูลที่กรอก" };
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
    if (error) {
      const message = error.code === "user_already_exists"
        ? "อีเมลนี้มีบัญชีแล้ว กรุณาเข้าสู่ระบบ"
        : error.code === "weak_password"
          ? "รหัสผ่านไม่ผ่านเงื่อนไขของโปรเจกต์ กรุณาใช้รหัสผ่านที่รัดกุมขึ้น"
          : error.code === "over_email_send_rate_limit" || error.code === "over_request_rate_limit"
            ? "สมัครถี่เกินไปหรือส่งอีเมลเกินกำหนด กรุณารอสักครู่ และตรวจการตั้งค่า Confirm email สำหรับเวิร์กช็อป"
            : "สมัครสมาชิกไม่สำเร็จ ตรวจว่าได้รันไฟล์ SQL ของ US-1 แล้ว หรือใช้อีเมลที่ยังไม่เคยสมัคร";
      return { error: message, values };
    }
    if (!data.session) {
      return { success: "กรุณาตรวจอีเมลเพื่อยืนยันบัญชีก่อนเข้าสู่ระบบ หากเคยสมัครแล้วให้ใช้เมนูเข้าสู่ระบบ", values };
    }
  } catch {
    return { error: "ติดต่อระบบสมัครสมาชิกไม่ได้ กรุณาตรวจอินเทอร์เน็ตแล้วลองใหม่", values };
  }
  revalidatePath("/", "layout");
  redirect("/team");
}

export async function signOut(): Promise<void> {
  const { supabase } = await getAuthContext();
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error("SIGN_OUT_FAILED");
  revalidatePath("/", "layout");
  redirect("/login");
}
