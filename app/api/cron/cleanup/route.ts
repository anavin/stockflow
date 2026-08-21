import { NextResponse } from "next/server";
import { q } from "@/lib/db";

export const runtime = "nodejs";

/**
 * ล้างข้อมูล log เก่าที่โตไม่จำกัด (กันเปลือง 500MB free tier)
 * — เรียกจาก external cron วันละครั้ง: GET /api/cron/cleanup  (Header: Authorization: Bearer <CRON_SECRET>)
 * ตั้ง CRON_SECRET ใน env ก่อน ไม่งั้น route จะปฏิเสธ (กันคนสุ่มยิง)
 * ตัวเลขวันปรับได้ผ่าน query ?activityDays=90&loginDays=7
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ ok: false, error: "ยังไม่ได้ตั้ง CRON_SECRET" }, { status: 503 });
  const auth = req.headers.get("authorization") || "";
  const url = new URL(req.url);
  const key = auth.replace(/^Bearer\s+/i, "") || url.searchParams.get("key") || "";
  if (key !== secret) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const activityDays = Math.max(7, Math.min(3650, Number(url.searchParams.get("activityDays")) || 90));
  const loginDays = Math.max(1, Math.min(365, Number(url.searchParams.get("loginDays")) || 7));

  const out: Record<string, number | string> = {};
  const del = async (label: string, sql: string) => {
    try { const r = await q<{ n: number }>(sql); out[label] = r.length; }
    catch (e: any) { out[label] = `skip: ${e?.message || "error"}`; }
  };
  // activity_log: เก็บ audit 90 วัน · login_attempts: เก็บแค่ช่วง lockout (7 วันพอ)
  await del("activity_log", `delete from activity_log where created_at < now() - interval '${activityDays} days' returning 1 as n`);
  await del("login_attempts", `delete from login_attempts where created_at < now() - interval '${loginDays} days' returning 1 as n`);
  // user_sessions ที่หมดอายุ (ถ้ามีคอลัมน์ expires_at)
  await del("user_sessions", `delete from user_sessions where expires_at < now() returning 1 as n`);

  return NextResponse.json({ ok: true, deleted: out, kept: { activityDays, loginDays } });
}
