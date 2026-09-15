"use server";
import { q, tx } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { can, isAdmin } from "@/lib/auth/roles";
import { isWholesalePlatform, platformBase } from "@/lib/config";
import { revalidatePath, revalidateTag } from "next/cache";
import { logActivity } from "@/lib/activity";

// ค้าส่ง 2 จังหวะ (Eve/KingPower): ส่งออก → ปลายทางยืนยันรับ (รับบางส่วนได้)
// CTW ใช้ปุ่ม "ส่งไป CTW" (push) แทน — set shipped + received อัตโนมัติใน pushToCtw
// สิทธิ์: admin + คลัง (manageStock)

async function gate() {
  const user = await getCurrentUser();
  if (!user) return { error: "กรุณาเข้าสู่ระบบ" as const };
  if (!can.manageStock(user.role)) return { error: "เฉพาะแอดมิน/คลัง" as const };
  return { user };
}
const who = (u: { full_name?: string | null; username: string }) => (u.full_name || "").trim() || u.username;
function bump(platform?: string | null) {
  if (platform) revalidatePath(platformBase(platform));
  revalidatePath("/eveandboy"); revalidatePath("/kingpower"); revalidatePath("/ship"); revalidateTag("dashboard");
}

export type ReceiptLine = { line_no: number; product: string; size: string; qty: number; received_qty: number | null };

/** ดึงบรรทัดสินค้า + จำนวนที่รับแล้ว — ให้ modal ยืนยันรับกรอกจำนวนต่อบรรทัด */
export async function wholesaleReceiptLines(orderNo: string): Promise<{ ok: boolean; error?: string; items?: ReceiptLine[] }> {
  const g = await gate(); if ("error" in g) return { ok: false, error: g.error };
  const on = (orderNo || "").trim();
  const items = await q<ReceiptLine>(
    `select line_no, product, size, qty::float8 as qty, received_qty::float8 as received_qty
       from order_items where order_no = $1 and coalesce(product,'') <> '' order by line_no`, [on]);
  return { ok: true, items };
}

/** ส่งออก (Eve/KingPower) — ปัก shipped_at */
export async function markWholesaleShipped(orderNo: string): Promise<{ ok: boolean; error?: string }> {
  const g = await gate(); if ("error" in g) return { ok: false, error: g.error };
  const on = (orderNo || "").trim();
  const [o] = await q<{ platform: string | null; stock_issued_at: string | null; shipped_at: string | null; deleted_at: string | null }>(
    `select platform, stock_issued_at, shipped_at, deleted_at from orders where order_no = $1`, [on]);
  if (!o || o.deleted_at) return { ok: false, error: "ไม่พบใบเบิก" };
  if (!isWholesalePlatform(o.platform)) return { ok: false, error: "ใช้ได้เฉพาะใบเบิกค้าส่ง" };
  if (!o.stock_issued_at) return { ok: false, error: "ต้องตัดสต๊อกก่อนส่งออก" };
  if (o.shipped_at) return { ok: false, error: "ใบนี้ส่งออกไปแล้ว" };
  // atomic claim กันกดซ้ำ
  const r = await q<{ order_no: string }>(
    `update orders set shipped_at = now(), shipped_by = $2, updated_at = now()
       where order_no = $1 and shipped_at is null returning order_no`, [on, g.user.id]);
  if (r.length === 0) return { ok: false, error: "ใบนี้ส่งออกไปแล้ว" };
  await logActivity("wholesale.ship", `${on} ส่งออก (${o.platform})`);
  bump(o.platform);
  return { ok: true };
}

/** ยืนยันปลายทางรับ — รับบางส่วนได้ (ระบุจำนวนต่อบรรทัด) · ครบทุกบรรทัด → ปัก received_at */
export async function confirmWholesaleReceipt(
  orderNo: string,
  lines: { line_no: number; received_qty: number }[],
): Promise<{ ok: boolean; error?: string; full?: boolean }> {
  const g = await gate(); if ("error" in g) return { ok: false, error: g.error };
  const on = (orderNo || "").trim();
  try {
    const out = await tx<{ full: boolean; platform: string | null }>(async (run) => {
      const [o] = await run<{ platform: string | null; shipped_at: string | null; deleted_at: string | null }>(
        `select platform, shipped_at, deleted_at from orders where order_no = $1 for update`, [on]);
      if (!o || o.deleted_at) throw new Error("ไม่พบใบเบิก");
      if (!isWholesalePlatform(o.platform)) throw new Error("ใช้ได้เฉพาะใบเบิกค้าส่ง");
      if (!o.shipped_at) throw new Error("ต้องส่งออกก่อนยืนยันรับ");
      const cur = await run<{ line_no: number; qty: number; received_qty: number | null }>(
        `select line_no, qty::float8 as qty, received_qty::float8 as received_qty
           from order_items where order_no = $1 and coalesce(product,'') <> ''`, [on]);
      if (cur.length === 0) throw new Error("ใบเบิกไม่มีรายการ");
      const merged = new Map<number, { qty: number; r: number }>();
      for (const it of cur) merged.set(it.line_no, { qty: Number(it.qty), r: it.received_qty == null ? 0 : Number(it.received_qty) });
      // อัปเดตเฉพาะบรรทัดที่ส่งมา (clamp 0..qty) — บรรทัดที่ไม่ส่งคงค่าเดิม
      for (const l of lines) {
        const m = merged.get(l.line_no); if (!m) continue;
        m.r = Math.max(0, Math.min(m.qty, Number(l.received_qty) || 0));
      }
      for (const [ln, m] of merged) await run(`update order_items set received_qty = $2 where order_no = $1 and line_no = $3`, [on, m.r, ln]);
      const full = merged.size > 0 && [...merged.values()].every((m) => m.r >= m.qty);
      await run(`update orders set received_at = $2, received_by = $3, updated_at = now() where order_no = $1`,
        [on, full ? new Date().toISOString() : null, who(g.user)]);
      return { full, platform: o.platform };
    });
    await logActivity("wholesale.receive", `${on} ${out.full ? "รับครบ" : "รับบางส่วน"}`);
    bump(out.platform);
    return { ok: true, full: out.full };
  } catch (e: any) { return { ok: false, error: e?.message || "ยืนยันรับไม่สำเร็จ" }; }
}

/** ยกเลิกส่งออก (admin) — เคลียร์ shipped_at (ได้เฉพาะยังไม่ยืนยันรับ) */
export async function undoWholesaleShipped(orderNo: string): Promise<{ ok: boolean; error?: string }> {
  const g = await gate(); if ("error" in g) return { ok: false, error: g.error };
  if (!isAdmin(g.user.role)) return { ok: false, error: "เฉพาะแอดมิน" };
  const on = (orderNo || "").trim();
  const [o] = await q<{ platform: string | null; received_at: string | null }>(`select platform, received_at from orders where order_no = $1`, [on]);
  if (!o) return { ok: false, error: "ไม่พบใบเบิก" };
  if (o.received_at) return { ok: false, error: "ยืนยันรับแล้ว — ยกเลิกการรับก่อน" };
  await q(`update orders set shipped_at = null, shipped_by = null, updated_at = now() where order_no = $1`, [on]);
  await logActivity("wholesale.ship", `${on} ยกเลิกส่งออก`);
  bump(o.platform);
  return { ok: true };
}

/** ยกเลิกการยืนยันรับ (admin) — เคลียร์ received_at + received_qty ทุกบรรทัด */
export async function undoWholesaleReceipt(orderNo: string): Promise<{ ok: boolean; error?: string }> {
  const g = await gate(); if ("error" in g) return { ok: false, error: g.error };
  if (!isAdmin(g.user.role)) return { ok: false, error: "เฉพาะแอดมิน" };
  const on = (orderNo || "").trim();
  const [o] = await q<{ platform: string | null }>(`select platform from orders where order_no = $1`, [on]);
  if (!o) return { ok: false, error: "ไม่พบใบเบิก" };
  await tx(async (run) => {
    await run(`update order_items set received_qty = null where order_no = $1`, [on]);
    await run(`update orders set received_at = null, received_by = null, updated_at = now() where order_no = $1`, [on]);
  });
  await logActivity("wholesale.receive", `${on} ยกเลิกการรับ`);
  bump(o.platform);
  return { ok: true };
}
