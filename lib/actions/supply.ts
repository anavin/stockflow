"use server";
import { revalidatePath } from "next/cache";
import { q, tx } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/roles";
import { logActivity } from "@/lib/activity";

// รายละเอียดรายการ (ใช้สร้าง material_item ถ้ายังไม่มี — bulk/label สร้าง lazy)
export type ItemDesc = {
  category: "bulk" | "label" | "packaging";
  refKey: string;
  scent?: string | null; comp_key?: string | null; brand?: string | null; grade?: string | null;
  label: string; category2?: string | null; unit?: string; sort?: number;
};
type Reason = "receive" | "issue" | "adjust";

async function gate() {
  const u = await getCurrentUser();
  if (!u) return { error: "กรุณาเข้าสู่ระบบ" as const };
  if (!can.manageStock(u.role)) return { error: "เฉพาะผู้ดูแล / ฝ่ายคลัง" as const };
  return { user: u };
}

type Run = <T = any>(sql: string, params?: any[]) => Promise<T[]>;

/** upsert รายการ (กัน race ตอนสร้างครั้งแรก) → คืน id + qty ปัจจุบัน */
async function ensureItem(run: Run, desc: ItemDesc): Promise<{ id: number; qty: number }> {
  const [it] = await run<{ id: number; qty: number }>(
    `insert into material_item (category, ref_key, scent, comp_key, brand, grade, label, category2, unit, sort)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     on conflict (category, ref_key) do update set updated_at = now()
     returning id, qty::float8 as qty`,
    [desc.category, desc.refKey, desc.scent ?? null, desc.comp_key ?? null, desc.brand ?? null, desc.grade ?? null, desc.label, desc.category2 ?? null, desc.unit ?? "ชิ้น", desc.sort ?? 0]);
  return { id: it.id, qty: Number(it.qty) };
}

// core (ทำใน tx ที่ส่งเข้ามา) — receive/issue ใช้ update atomic (qty=qty±change) กัน lost-update · adjust = ตั้งยอดเป้าหมาย
// receive/issue: amount = จำนวนที่บวก/ลบ · adjust: amount = ยอดเป้าหมาย (นับได้จริง)
async function applyIn(run: Run, desc: ItemDesc, amount: number, reason: Reason, note: string | null, userId: number): Promise<number> {
  const it = await ensureItem(run, desc);
  let newQty: number, change: number;
  if (reason === "adjust") {
    const [r] = await run<{ qty: number }>(`update material_item set qty=$2, updated_at=now() where id=$1 returning qty::float8 as qty`, [it.id, amount]);
    newQty = Number(r.qty); change = newQty - it.qty;
  } else {
    const [r] = await run<{ qty: number }>(`update material_item set qty = qty + $2, updated_at=now() where id=$1 returning qty::float8 as qty`, [it.id, amount]);
    newQty = Number(r.qty); change = amount;
  }
  await run(`insert into material_move (item_id, qty_change, balance, reason, note, created_by) values ($1,$2,$3,$4,$5,$6)`,
    [it.id, change, newQty, reason, note, userId]);
  return newQty;
}

async function apply(desc: ItemDesc, amount: number, reason: Reason, note: string | null, userId: number): Promise<number> {
  return tx((run) => applyIn(run as Run, desc, amount, reason, note, userId));
}

function revalidate(cat: string) {
  revalidatePath(cat === "bulk" ? "/stock/bulk" : cat === "label" ? "/stock/labels" : "/stock/packaging");
  revalidatePath("/stock/materials/moves");
}

export async function receiveMaterial(desc: ItemDesc, amount: number, note?: string): Promise<{ ok: boolean; error?: string; balance?: number }> {
  const g = await gate(); if ("error" in g) return { ok: false, error: g.error };
  const n = Math.abs(Number(amount) || 0); if (!n) return { ok: false, error: "ใส่จำนวนที่รับเข้า" };
  try { const bal = await apply(desc, n, "receive", note?.trim() || null, g.user.id); await logActivity("material.receive", `${desc.label} +${n} ${desc.unit || "ชิ้น"}`); revalidate(desc.category); return { ok: true, balance: bal }; }
  catch (e: any) { return { ok: false, error: e?.message || "รับเข้าไม่สำเร็จ (รัน SQL 0029 บน prod?)" }; }
}

export async function issueMaterial(desc: ItemDesc, amount: number, note?: string): Promise<{ ok: boolean; error?: string; balance?: number }> {
  const g = await gate(); if ("error" in g) return { ok: false, error: g.error };
  const n = Math.abs(Number(amount) || 0); if (!n) return { ok: false, error: "ใส่จำนวนที่เบิก" };
  try { const bal = await apply(desc, -n, "issue", note?.trim() || null, g.user.id); await logActivity("material.issue", `${desc.label} −${n} ${desc.unit || "ชิ้น"}${note?.trim() ? " · " + note.trim() : ""}`); revalidate(desc.category); return { ok: true, balance: bal }; }
  catch (e: any) { return { ok: false, error: e?.message || "เบิกไม่สำเร็จ (รัน SQL 0029 บน prod?)" }; }
}

/** เบิก/รับเข้า หลายรายการทีเดียว (ใบเบิก/รับเข้าวัตถุดิบ) — บันทึกทุกบรรทัดด้วยหมายเหตุเดียวกัน */
export async function batchMaterial(mode: "receive" | "issue", lines: { desc: ItemDesc; amount: number }[], note?: string): Promise<{ ok: boolean; error?: string; done?: number }> {
  const g = await gate(); if ("error" in g) return { ok: false, error: g.error };
  const valid = (lines || []).filter((l) => Math.abs(Number(l.amount) || 0) > 0);
  if (!valid.length) return { ok: false, error: mode === "receive" ? "ยังไม่ได้เลือกรายการรับเข้า" : "ยังไม่ได้เลือกรายการเบิก" };
  const n = note?.trim() || null;
  const sign = mode === "receive" ? 1 : -1;
  try {
    // tx เดียวทั้งใบ — ถ้าบรรทัดใดพัง roll back ทั้งหมด (ไม่ทำครึ่งๆ)
    await tx(async (run) => {
      for (const l of valid) await applyIn(run as Run, l.desc, sign * Math.abs(Number(l.amount)), mode, n, g.user.id);
    });
  } catch (e: any) { return { ok: false, error: e?.message || (mode === "receive" ? "รับเข้าไม่สำเร็จ" : "เบิกไม่สำเร็จ") }; }
  await logActivity(mode === "receive" ? "material.receive" : "material.issue", `รวม ${valid.length} รายการ${n ? " · " + n : ""}`);
  revalidatePath("/stock/bulk"); revalidatePath("/stock/labels"); revalidatePath("/stock/packaging"); revalidatePath("/stock/materials/moves");
  return { ok: true, done: valid.length };
}
/** ตั้งจุดสั่งซื้อ (แจ้งเตือน "ใกล้หมด" เมื่อคงเหลือ ≤ จุดนี้) — ต้องมี material_item ก่อน (สร้าง lazy) */
export async function setReorderPoint(desc: ItemDesc, point: number | null): Promise<{ ok: boolean; error?: string }> {
  const g = await gate(); if ("error" in g) return { ok: false, error: g.error };
  const p = point == null || Number.isNaN(Number(point)) || Number(point) < 0 ? null : Math.round(Number(point));
  try {
    await tx(async (run) => {
      const it = await ensureItem(run as Run, desc);
      await run(`update material_item set reorder_point=$2, updated_at=now() where id=$1`, [it.id, p]);
    });
  } catch (e: any) { return { ok: false, error: e?.message || "ตั้งจุดสั่งซื้อไม่สำเร็จ (รัน SQL 0030 บน prod?)" }; }
  revalidate(desc.category);
  return { ok: true };
}

/** ตั้งหมายเหตุต่อรายการ — ต้องมี material_item ก่อน (สร้าง lazy) */
export async function setMaterialNote(desc: ItemDesc, note: string): Promise<{ ok: boolean; error?: string }> {
  const g = await gate(); if ("error" in g) return { ok: false, error: g.error };
  const n = (note || "").trim() || null;
  try {
    await tx(async (run) => {
      const it = await ensureItem(run as Run, desc);
      await run(`update material_item set note=$2, updated_at=now() where id=$1`, [it.id, n]);
    });
  } catch (e: any) { return { ok: false, error: e?.message || "บันทึกหมายเหตุไม่สำเร็จ (รัน SQL 0032 บน prod?)" }; }
  revalidate(desc.category);
  return { ok: true };
}

/** เพิ่มกลิ่น OEM เข้าลิสต์ปริมาตร (PUNN / Atepole ฯลฯ) */
export async function addBulkScent(scent: string, brand: string, grade: string | null): Promise<{ ok: boolean; error?: string }> {
  const g = await gate(); if ("error" in g) return { ok: false, error: g.error };
  const sc = (scent || "").trim(), br = (brand || "OEM").trim();
  if (!sc) return { ok: false, error: "กรอกชื่อกลิ่น" };
  const norm = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9ก-๙]/g, "");
  try {
    await q(`insert into material_item (category, ref_key, scent, brand, grade, label, unit) values ('bulk',$1,$2,$3,$4,$2,'ml') on conflict (category, ref_key) do nothing`,
      [`${norm(sc)}|${norm(br)}`, sc, br, grade]);
  } catch (e: any) { return { ok: false, error: e?.message || "เพิ่มไม่สำเร็จ" }; }
  revalidatePath("/stock/bulk");
  return { ok: true };
}
