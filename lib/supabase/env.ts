// อ่านค่าที่ใส่ไว้ใน .env.local (บนเครื่อง) หรือ Environment Variables (บน Vercel)
// ทั้งสองค่านี้เปิดเผยได้ เพราะข้อมูลถูกป้องกันด้วย RLS ในฐานข้อมูล
export const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
export const supabasePublishableKey =
  (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "").trim();

function hasValidUrl() {
  try {
    const url = new URL(supabaseUrl);
    return (
      ["https:", "http:"].includes(url.protocol) &&
      !url.username &&
      !url.password &&
      !url.hostname.includes("your-project-ref")
    );
  } catch {
    return false;
  }
}

// ค่าที่ยังไม่ครบหรือยังเป็นตัวอย่าง จะแสดงวิธีตั้งค่าที่หน้าแรก
export const hasSupabaseEnv =
  hasValidUrl() &&
  supabasePublishableKey.startsWith("sb_publishable_") &&
  supabasePublishableKey !== "sb_publishable_your_key_here";
