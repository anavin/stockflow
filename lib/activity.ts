import "server-only";
import { headers } from "next/headers";
import { q } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";

export type ActUser = { id?: number | null; username?: string | null; role?: string | null };

/** บันทึก activity log — ต้องไม่ทำให้ action หลักพัง (ห่อ try/catch เสมอ)
 *  who ระบุเองได้ (เช่น ตอน login ที่ session ยังไม่ถูกตั้ง) ไม่งั้นอ่านจาก session */
export async function logActivity(action: string, detail?: string | null, who?: ActUser) {
  try {
    let u = who;
    if (!u) {
      const cur = await getCurrentUser();
      u = cur ? { id: cur.id, username: cur.username, role: cur.role } : {};
    }
    let ip: string | null = null;
    try {
      const h = await headers();
      ip = (h.get("x-forwarded-for") || "").split(",")[0].trim() || h.get("x-real-ip") || null;
    } catch { /* ไม่มี header ก็ได้ */ }
    await q(
      `insert into activity_log (user_id, username, role, action, detail, ip) values ($1,$2,$3,$4,$5,$6)`,
      [u?.id ?? null, u?.username ?? null, u?.role ?? null, action, detail ?? null, ip],
    );
  } catch { /* เงียบ — audit ห้ามล้มงานหลัก */ }
}
