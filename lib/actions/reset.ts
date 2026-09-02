"use server";
import { q } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/roles";
import { logActivity } from "@/lib/activity";
import { reverseReturn } from "./returns";
import { unshipOrder } from "./orders";
import { reverseIssue } from "./stock";

/**
 * รีเซ็ตใบเบิกกลับสู่ "รอตัดสต๊อก" ในคลิกเดียว (แอดมินเท่านั้น) — สำหรับกรณีตัน:
 * ตัดแล้ว + ส่งแล้ว + มีการคืน → ทำ 3 ขั้นตามลำดับ (ทุกขั้นคืนสต๊อก/serial/ถุงให้ถูกต้องเอง)
 *   1) ยกเลิกการคืนทุกรายการที่ยังไม่ยกเลิก
 *   2) ยกเลิกการส่ง (ถ้าส่งแล้ว)
 *   3) ยกเลิกการตัดสต๊อก (คืนสต๊อก + เคลียร์ flag)
 */
export async function resetOrderIssue(orderNo: string): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "กรุณาเข้าสู่ระบบ" };
  if (!isAdmin(user.role)) return { ok: false, error: "รีเซ็ตใบเบิกได้เฉพาะแอดมิน" };

  const scanned = (orderNo || "").trim();
  if (!scanned) return { ok: false, error: "ไม่พบ Order No." };
  // resolve ทั้ง order_no (PK) และ doc_no
  const [o] = await q<{ order_no: string; shipped_at: string | null; stock_issued_at: string | null }>(
    `select order_no, shipped_at, stock_issued_at from orders where order_no = $1 or doc_no = $1 order by (order_no = $1) desc limit 1`,
    [scanned],
  );
  if (!o) return { ok: false, error: `ไม่พบใบเบิก ${scanned}` };
  if (!o.stock_issued_at) return { ok: false, error: "ใบเบิกนี้ยังไม่ได้ตัดสต๊อก (ไม่ต้องรีเซ็ต)" };
  const on = o.order_no;

  // 1) ยกเลิกการคืนทุกรายการที่ยังไม่ยกเลิก (คืนสต๊อก/serial กลับสู่สถานะ "ตัดแล้ว")
  const rets = await q<{ id: number }>(
    `select id from order_returns where order_no = $1 and voided_at is null order by id`, [on],
  ).catch(() => []);   // ตาราง order_returns อาจยังไม่มีบน prod → ข้าม
  // แต่ละขั้นเป็น tx แยก + idempotent (retry-safe) — ถ้าล้มกลางทาง กดรีเซ็ตซ้ำจะทำต่อจากจุดที่ค้าง
  const retry = "— กดรีเซ็ตอีกครั้งเพื่อทำต่อ";
  for (const r of rets) {
    const res = await reverseReturn(r.id);
    if (!res.ok) return { ok: false, error: `ยกเลิกการคืนไม่สำเร็จ (#${r.id}): ${res.error} ${retry}` };
  }

  // 2) ยกเลิกการส่ง (ถ้าส่งแล้ว) — ต้องทำหลังยกเลิกการคืน (unship บล็อกถ้ายังมีการคืน)
  if (o.shipped_at) {
    const res = await unshipOrder(on);
    if (!res.ok) return { ok: false, error: `ยกเลิกการส่งไม่สำเร็จ: ${res.error} ${retry}` };
  }

  // 3) ยกเลิกการตัดสต๊อก → คืนสต๊อก+serial+ถุง เคลียร์ stock_issued_at (กลับเป็น "รอตัด")
  const res = await reverseIssue(on);
  if (!res.ok) return { ok: false, error: `ยกเลิกการตัดสต๊อกไม่สำเร็จ: ${res.error} ${retry}` };

  await logActivity("order.reset", on);
  return { ok: true };
}
