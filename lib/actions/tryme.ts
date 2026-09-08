"use server";
import { revalidatePath } from "next/cache";
import { q } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/roles";
import { logActivity } from "@/lib/activity";
import { isWholesalePlatform, platformName } from "@/lib/config";

export type TryMeLine = { scent: string; size: string; qty: number };

const mlTok = (s: string) => (s || "").match(/[0-9]+(\.[0-9]+)?/)?.[0] ?? "";
const isTryMeSize = (s: string) => ["30", "50"].includes(mlTok(s));   // Try Me = เฉพาะ 30/50 ml

/** บันทึกการเบิก Try Me (ฟรี) — เฉพาะ CTW/Eveandboy/KingPower · 1 แถว/กลิ่น-ขนาด */
export async function createTryMe(platform: string, lines: TryMeLine[], note?: string): Promise<{ ok: boolean; error?: string; count?: number; qty?: number }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "กรุณาเข้าสู่ระบบ" };
  if (!can.createOrders(user.role)) return { ok: false, error: "ไม่มีสิทธิ์เบิก Try Me" };
  if (!isWholesalePlatform(platform)) return { ok: false, error: "Try Me เบิกได้เฉพาะ CTW / Eveandboy / King Power" };

  const picked = (lines || [])
    .map((l) => ({ scent: (l.scent || "").trim(), size: (l.size || "").trim(), qty: Math.max(1, Math.floor(Number(l.qty) || 0)) }))
    .filter((l) => l.scent && l.qty > 0);
  if (!picked.length) return { ok: false, error: "ยังไม่ได้เลือกกลิ่น/จำนวน" };
  for (const l of picked) if (!isTryMeSize(l.size)) return { ok: false, error: `ขนาด Try Me ต้องเป็น 30 หรือ 50 ml (${l.scent})` };

  const n = (note || "").trim() || null;
  try {
    for (const l of picked) {
      await q(`insert into tryme_issue (platform, scent, size, qty, note, created_by) values ($1,$2,$3,$4,$5,$6)`,
        [platform, l.scent, l.size, l.qty, n, user.id]);
    }
    const totalQty = picked.reduce((a, l) => a + l.qty, 0);
    await logActivity("tryme", `${platformName(platform)} · เทสเตอร์ ${totalQty} ชิ้น (${picked.length} กลิ่น)`);
    revalidatePath("/tryme");
    return { ok: true, count: picked.length, qty: totalQty };
  } catch (e: any) { return { ok: false, error: e?.message || "บันทึกไม่สำเร็จ" }; }
}

/** ลบรายการ Try Me (แก้ที่คีย์ผิด) — เฉพาะผู้ดูแล/คลัง */
export async function deleteTryMe(id: number): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "กรุณาเข้าสู่ระบบ" };
  if (!can.manageStock(user.role)) return { ok: false, error: "เฉพาะผู้ดูแล / ฝ่ายคลัง" };
  try {
    await q(`delete from tryme_issue where id = $1`, [id]);
    await logActivity("tryme.delete", `#${id}`);
    revalidatePath("/tryme");
    return { ok: true };
  } catch (e: any) { return { ok: false, error: e?.message || "ลบไม่สำเร็จ" }; }
}
