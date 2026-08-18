import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/auth/constants";
import { deleteSession, clearSessionCookie } from "@/lib/auth/session";
import { logActivity } from "@/lib/activity";

export const runtime = "nodejs";

export async function POST(req: Request) {
  await logActivity("logout").catch(() => {});   // อ่าน user จาก session ก่อนล้าง
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (token) await deleteSession(token).catch(() => {});
  await clearSessionCookie();
  return NextResponse.redirect(new URL("/login", req.url));
}
