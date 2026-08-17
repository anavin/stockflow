"use server";
import { revalidatePath } from "next/cache";
import { q } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/roles";

// จัดการรายชื่อกลิ่น (master products) — admin + ฝ่ายสร้างใบเบิก (creator)
async function gate() {
  const user = await getCurrentUser();
  if (!user) return { error: "กรุณาเข้าสู่ระบบ" as const };
  if (!can.createOrders(user.role)) return { error: "ไม่มีสิทธิ์จัดการกลิ่น" as const };
  return { user };
}

export async function createProduct(name: string, code?: string, ptype?: string, barcode?: string): Promise<{ ok: boolean; error?: string }> {
  const g = await gate(); if ("error" in g) return { ok: false, error: g.error };
  const n = (name || "").trim();
  if (!n) return { ok: false, error: "กรอกชื่อกลิ่น" };
  const [dup] = await q(`select 1 from products where lower(name) = lower($1)`, [n]);
  if (dup) return { ok: false, error: "มีกลิ่นนี้อยู่แล้ว" };
  await q(`insert into products (name, code, ptype, barcode, active, sort) values ($1, $2, $3, $4, true, coalesce((select max(sort) from products),0)+1)`,
    [n, (code || "").trim() || null, (ptype || "").trim() || null, (barcode || "").trim() || null]);
  revalidatePath("/products");
  return { ok: true };
}

/** ตั้งประเภทน้ำหอมหลายกลิ่นพร้อมกัน (หน้า mapping) — ptype ว่าง = ล้างเป็น null */
export async function bulkSetProductTypes(
  updates: { id: number; ptype: string }[],
): Promise<{ ok: boolean; error?: string; count?: number }> {
  const g = await gate(); if ("error" in g) return { ok: false, error: g.error };
  const rows = (updates || []).filter((u) => Number.isFinite(u.id));
  if (rows.length === 0) return { ok: true, count: 0 };
  const ids = rows.map((u) => u.id);
  const types = rows.map((u) => (u.ptype || "").trim() || null);
  await q(
    `update products p set ptype = v.ptype
       from (select unnest($1::int[]) as id, unnest($2::text[]) as ptype) v
      where p.id = v.id`,
    [ids, types],
  );
  revalidatePath("/products");
  revalidatePath("/products/mapping");
  return { ok: true, count: rows.length };
}

/** เพิ่มบาร์โค้ด (ขนาด+Barcode) ให้กลิ่นเอง — เก็บใน product_barcodes เดียวกับข้อมูล CTW
 *  reassign=true → ถ้าบาร์โค้ดซ้ำ ให้ "ย้าย" แถวเดิมมาที่กลิ่น/ขนาดนี้ (แทนที่จะเพิ่มซ้ำ) */
export async function addScentBarcode(scent: string, size: string, barcode: string, sku?: string, reassign?: boolean): Promise<{ ok: boolean; error?: string; conflict?: { scent: string; size: string } }> {
  const g = await gate(); if ("error" in g) return { ok: false, error: g.error };
  const sc = (scent || "").trim(), sz = (size || "").trim(), bc = (barcode || "").trim();
  if (!sc) return { ok: false, error: "ไม่พบชื่อกลิ่น" };
  if (!sz || !bc) return { ok: false, error: "กรอกขนาดและบาร์โค้ด" };
  const [dup] = await q<{ id: number; scent: string; size: string }>(`select id, scent, size from product_barcodes where barcode = $1`, [bc]);
  if (dup) {
    if (!reassign) return { ok: false, error: `บาร์โค้ดนี้ถูกใช้กับ "${dup.scent}" ${dup.size.replace(/\.$/, "")} อยู่แล้ว`, conflict: { scent: dup.scent, size: dup.size } };
    await q(`update product_barcodes set scent = $1, size = $2, sku = coalesce($4, sku) where id = $3`,
      [sc, sz, dup.id, (sku || "").trim() || null]);   // ย้ายบาร์โค้ดมาที่กลิ่น/ขนาดใหม่
    revalidatePath("/products");
    return { ok: true };
  }
  await q(`insert into product_barcodes (scent, size, barcode, sku) values ($1, $2, $3, $4)`,
    [sc, sz, bc, (sku || "").trim() || null]);
  revalidatePath("/products");
  return { ok: true };
}

/** เปิด/ปิด "เลิกผลิต" ต่อ (กลิ่น+ขนาด) — เก็บ 1 แถวต่อคู่ (normalize กันซ้ำ/ชื่อสะกดต่าง) */
export async function setDiscontinued(scent: string, size: string, disc: boolean): Promise<{ ok: boolean; error?: string }> {
  const g = await gate(); if ("error" in g) return { ok: false, error: g.error };
  const sc = (scent || "").trim(), sz = (size || "").trim();
  if (!sc || !sz) return { ok: false, error: "ระบุกลิ่นและขนาด" };
  const NZ = `regexp_replace(lower(btrim($1)),'[^a-z0-9ก-๙]','','g')`;
  const SZ = `regexp_replace(lower($2),'[^a-z0-9ก-๙]','','g')`;
  try {
    await q(`delete from discontinued_sku
             where regexp_replace(lower(btrim(scent)),'[^a-z0-9ก-๙]','','g') = ${NZ}
               and regexp_replace(lower(size),'[^a-z0-9ก-๙]','','g') = ${SZ}`, [sc, sz]);
    if (disc) await q(`insert into discontinued_sku (scent, size) values ($1, $2) on conflict (scent, size) do nothing`, [sc, sz]);
  } catch { return { ok: false, error: "ยังไม่มีตาราง discontinued_sku (รัน SQL 0021 บน prod ก่อน)" }; }
  revalidatePath("/products");
  revalidatePath("/shopee/new");
  return { ok: true };
}

export async function deleteScentBarcode(id: number): Promise<{ ok: boolean; error?: string }> {
  const g = await gate(); if ("error" in g) return { ok: false, error: g.error };
  await q(`delete from product_barcodes where id = $1`, [id]);
  revalidatePath("/products");
  return { ok: true };
}

export async function setProductBarcode(id: number, barcode: string): Promise<{ ok: boolean; error?: string }> {
  const g = await gate(); if ("error" in g) return { ok: false, error: g.error };
  await q(`update products set barcode = $2 where id = $1`, [id, (barcode || "").trim() || null]);
  revalidatePath("/products");
  return { ok: true };
}

export async function setProductType(id: number, ptype: string): Promise<{ ok: boolean; error?: string }> {
  const g = await gate(); if ("error" in g) return { ok: false, error: g.error };
  await q(`update products set ptype = $2 where id = $1`, [id, (ptype || "").trim() || null]);
  revalidatePath("/products");
  return { ok: true };
}

export async function setProductCode(id: number, code: string): Promise<{ ok: boolean; error?: string }> {
  const g = await gate(); if ("error" in g) return { ok: false, error: g.error };
  await q(`update products set code = $2 where id = $1`, [id, (code || "").trim() || null]);
  revalidatePath("/products");
  return { ok: true };
}

export async function renameProduct(id: number, name: string): Promise<{ ok: boolean; error?: string }> {
  const g = await gate(); if ("error" in g) return { ok: false, error: g.error };
  const n = (name || "").trim();
  if (!n) return { ok: false, error: "กรอกชื่อกลิ่น" };
  const [dup] = await q(`select 1 from products where lower(name) = lower($1) and id <> $2`, [n, id]);
  if (dup) return { ok: false, error: "มีกลิ่นนี้อยู่แล้ว" };
  await q(`update products set name = $2 where id = $1`, [id, n]);
  revalidatePath("/products");
  return { ok: true };
}

export async function setProductActive(id: number, active: boolean): Promise<{ ok: boolean; error?: string }> {
  const g = await gate(); if ("error" in g) return { ok: false, error: g.error };
  await q(`update products set active = $2 where id = $1`, [id, active]);
  revalidatePath("/products");
  return { ok: true };
}

/** ปิด/เปิดการขายราย กลิ่น+ขนาด — ปิดแล้วขนาดนั้นจะถูกซ่อนในสต๊อก + เลือกในใบเบิกไม่ได้ (ยอดสต๊อกยังอยู่) */
export async function setSkuSold(scent: string, size: string, sold: boolean): Promise<{ ok: boolean; error?: string }> {
  const g = await gate(); if ("error" in g) return { ok: false, error: g.error };
  const sc = (scent || "").trim(), sz = (size || "").trim();
  if (!sc || !sz) return { ok: false, error: "ระบุกลิ่นและขนาด" };
  const NZ = `regexp_replace(lower(btrim($1)),'[^a-z0-9ก-๙]','','g')`;
  const SZ = `regexp_replace(lower($2),'[^a-z0-9ก-๙]','','g')`;
  try {
    await q(`delete from closed_sku
             where regexp_replace(lower(btrim(scent)),'[^a-z0-9ก-๙]','','g') = ${NZ}
               and regexp_replace(lower(size),'[^a-z0-9ก-๙]','','g') = ${SZ}`, [sc, sz]);
    if (!sold) await q(`insert into closed_sku (scent, size) values ($1, $2) on conflict (scent, size) do nothing`, [sc, sz]);
  } catch { return { ok: false, error: "ยังไม่มีตาราง closed_sku (รัน SQL 0026 บน prod ก่อน)" }; }
  revalidatePath("/stock");
  revalidatePath("/shopee/new");
  return { ok: true };
}
