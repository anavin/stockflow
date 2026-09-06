import { NextResponse } from "next/server";
import { loginWithPassword } from "@/lib/auth/login";
import { checkPackingKey } from "@/lib/packing-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** ตรวจชื่อผู้ใช้/รหัสผ่านให้ Packing Cam — ใช้บัญชีชุดเดียวกับระบบเบิกจ่าย
 *  ได้ระบบล็อกบัญชี (ผิด 5 ครั้ง/15 นาที) และ login_attempts มาด้วยฟรี ๆ
 *  คืนเฉพาะข้อมูลที่จำเป็น ไม่ส่ง password_hash ออกไปเด็ดขาด */
export async function POST(req: Request) {
  if (!checkPackingKey(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { username?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const result = await loginWithPassword(body.username ?? "", body.password ?? "");
  if (!result.ok || !result.user) {
    return NextResponse.json(
      { ok: false, error: result.error ?? "เข้าสู่ระบบไม่สำเร็จ", attemptsRemaining: result.attemptsRemaining },
      { status: 401 },
    );
  }

  return NextResponse.json({
    ok: true,
    user: {
      id: result.user.id,
      username: result.user.username,
      fullName: result.user.full_name,
      role: result.user.role,
    },
  });
}
