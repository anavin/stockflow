import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/constants";

// /api/cron/* กันด้วย CRON_SECRET เอง, /api/health ไม่คืนข้อมูล — ต้องผ่าน middleware
// ไม่งั้น external cron/uptime (ส่ง Bearer ไม่มี cookie) จะโดน redirect ไป /login แล้ว handler ไม่รัน
const PUBLIC = new Set(["/login", "/api/login", "/api/ping", "/api/cron/cleanup", "/api/health"]);

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // /api/ctw/* = API เชื่อมระบบ CTW (กันด้วย CTW_API_KEY เอง, external ไม่มี cookie)
  if (PUBLIC.has(pathname) || pathname.startsWith("/api/ctw/") || pathname.startsWith("/_next/") || pathname === "/favicon.ico") {
    return NextResponse.next();
  }
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    const url = new URL("/login", req.url);
    if (pathname !== "/") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  const headers = new Headers(req.headers);
  headers.set("x-pathname", pathname);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico|ttf)).*)"],
};
