import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  hasSupabaseEnv,
  supabasePublishableKey,
  supabaseUrl,
} from "@/lib/supabase/env";

// ทำงานก่อนทุกหน้า: รีเฟรช session การล็อกอินของ Supabase ให้ไม่หลุด
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const protectedRoute = ["/team", "/tasks", "/my"].some(
    (path) => request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(`${path}/`),
  );

  function requireLogin() {
    const target = request.nextUrl.clone();
    target.pathname = "/login";
    target.search = "";
    const redirected = NextResponse.redirect(target, request.method === "GET" || request.method === "HEAD" ? 307 : 303);
    response.cookies.getAll().forEach((cookie) => redirected.cookies.set(cookie));
    redirected.headers.set("Cache-Control", "private, no-store");
    return redirected;
  }

  if (!hasSupabaseEnv) return protectedRoute ? requireLogin() : response;

  const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // ตรวจและรีเฟรช token ของผู้ใช้ที่ล็อกอินอยู่
  const { data, error } = await supabase.auth.getClaims();
  if (protectedRoute && (error || !data?.claims)) return requireLogin();

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
