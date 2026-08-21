"use server";
import { revalidatePath } from "next/cache";
import { q, tx } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/roles";
import { logActivity } from "@/lib/activity";
import { enabledPlatforms, platformBase } from "@/lib/config";

/** revalidate ฟอร์มสร้างใบเบิกทุกแพลตฟอร์ม (dropdown กลิ่นเปลี่ยน → ต้องรีเฟรชทุก /[platform]/new) */
const revalidateNewForms = () => { for (const p of enabledPlatforms()) revalidatePath(`${platformBase(p.code)}/new`); };

// จัดการรายชื่อกลิ่น (master products) — admin + ฝ่ายคลัง (stock)
async function gate() {
  const user = await getCurrentUser();
  if (!user) return { error: "กรุณาเข้าสู่ระบบ" as const };
  if (!can.manageScents(user.role)) return { error: "ไม่มีสิทธิ์จัดการกลิ่น" as const };
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
  await logActivity("scent.manage", `เพิ่มกลิ่น "${n}"`);
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
  await logActivity("scent.manage", `ตั้งเกรด ${rows.length} กลิ่น`);
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
    await logActivity("scent.manage", `ย้ายบาร์โค้ด → ${sc} ${sz}`);
    revalidatePath("/products");
    return { ok: true };
  }
  await q(`insert into product_barcodes (scent, size, barcode, sku) values ($1, $2, $3, $4)`,
    [sc, sz, bc, (sku || "").trim() || null]);
  await logActivity("scent.manage", `เพิ่มบาร์โค้ด ${sc} ${sz}`);
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
  await logActivity("scent.manage", `${disc ? "ตั้งเลิกผลิต" : "ยกเลิกเลิกผลิต"} ${sc} ${sz}`);
  revalidatePath("/products");
  revalidateNewForms();
  return { ok: true };
}

export async function deleteScentBarcode(id: number): Promise<{ ok: boolean; error?: string }> {
  const g = await gate(); if ("error" in g) return { ok: false, error: g.error };
  await q(`delete from product_barcodes where id = $1`, [id]);
  await logActivity("scent.manage", `ลบบาร์โค้ด (id ${id})`);
  revalidatePath("/products");
  return { ok: true };
}

export async function setProductBarcode(id: number, barcode: string): Promise<{ ok: boolean; error?: string }> {
  const g = await gate(); if ("error" in g) return { ok: false, error: g.error };
  await q(`update products set barcode = $2 where id = $1`, [id, (barcode || "").trim() || null]);
  await logActivity("scent.manage", `ตั้งบาร์โค้ดกลิ่น (id ${id})`);
  revalidatePath("/products");
  return { ok: true };
}

export async function setProductType(id: number, ptype: string): Promise<{ ok: boolean; error?: string }> {
  const g = await gate(); if ("error" in g) return { ok: false, error: g.error };
  await q(`update products set ptype = $2 where id = $1`, [id, (ptype || "").trim() || null]);
  await logActivity("scent.manage", `ตั้งเกรดกลิ่น (id ${id}) → ${(ptype || "").trim() || "—"}`);
  revalidatePath("/products");
  return { ok: true };
}

export async function setProductCode(id: number, code: string): Promise<{ ok: boolean; error?: string }> {
  const g = await gate(); if ("error" in g) return { ok: false, error: g.error };
  await q(`update products set code = $2 where id = $1`, [id, (code || "").trim() || null]);
  await logActivity("scent.manage", `ตั้งรหัสกลิ่น (id ${id})`);
  revalidatePath("/products");
  return { ok: true };
}

export async function renameProduct(id: number, name: string): Promise<{ ok: boolean; error?: string }> {
  const g = await gate(); if ("error" in g) return { ok: false, error: g.error };
  const n = (name || "").trim();
  if (!n) return { ok: false, error: "กรอกชื่อกลิ่น" };
  const [dup] = await q(`select 1 from products where lower(btrim(name)) = lower(btrim($1)) and id <> $2`, [n, id]);
  if (dup) return { ok: false, error: "มีกลิ่นนี้อยู่แล้ว" };
  const [cur] = await q<{ name: string }>(`select name from products where id = $1`, [id]);
  if (!cur) return { ok: false, error: "ไม่พบกลิ่น" };
  const oldName = cur.name;
  // เปลี่ยนชื่อ + sync ทุกตารางที่อ้างชื่อกลิ่น (จับด้วยชื่อเก่าแบบ normalize → กวาดสะกดผิดเก่าไปด้วย)
  // $1 = ชื่อเก่า (ใช้หา), $2 = ชื่อใหม่
  const NK = `regexp_replace(lower(btrim($1)),'[^a-z0-9ก-๙]','','g')`;
  const COL = (c: string) => `regexp_replace(lower(btrim(${c})),'[^a-z0-9ก-๙]','','g')`;
  try {
    await tx(async (run) => {
      await run(`update products set name = $2 where id = $1`, [id, n]);
      await run(`update order_items set product = $2 where ${COL("product")} = ${NK}`, [oldName, n]);
      await run(`update stock_moves  set product = $2 where ${COL("product")} = ${NK}`, [oldName, n]);
      await run(`update stock_unit   set product = $2 where ${COL("product")} = ${NK}`, [oldName, n]);
      // stock: PK (product,size) → รวม qty เข้าชื่อใหม่ แล้วลบชื่อเก่าทิ้ง (กันชนคีย์ซ้ำ)
      await run(`insert into stock (product, size, qty)
                 select $2, size, sum(qty) from stock where ${COL("product")} = ${NK} and product <> $2
                 group by size
                 on conflict (product, size) do update set qty = stock.qty + excluded.qty, updated_at = now()`, [oldName, n]);
      await run(`delete from stock where ${COL("product")} = ${NK} and product <> $2`, [oldName, n]);
    });
  } catch (e: any) {
    return { ok: false, error: e?.message || "เปลี่ยนชื่อไม่สำเร็จ" };
  }
  // ตารางเสริม (อาจยังไม่มีบน prod) — best effort แยกจาก transaction หลัก
  for (const [tbl, col] of [["product_barcodes", "scent"], ["discontinued_sku", "scent"], ["closed_sku", "scent"]] as const) {
    try { await q(`update ${tbl} set ${col} = $2 where ${COL(col)} = ${NK}`, [oldName, n]); } catch { /* ไม่มีตาราง = ข้าม */ }
  }
  // material_item (คลังวัตถุดิบ bulk+label) — เปลี่ยน scent + ref_key ให้ตรง (กันสต๊อกกลายเป็นการ์ดซ้ำหลัง rename)
  try {
    await q(
      `update material_item mi set scent = $2,
              ref_key = regexp_replace(lower(btrim($2)),'[^a-z0-9ก-๙]','','g') || '|' || split_part(mi.ref_key,'|',2),
              updated_at = now()
       where mi.category in ('bulk','label') and ${COL("mi.scent")} = ${NK}
         and not exists (select 1 from material_item x where x.category = mi.category
           and x.ref_key = regexp_replace(lower(btrim($2)),'[^a-z0-9ก-๙]','','g') || '|' || split_part(mi.ref_key,'|',2))`,
      [oldName, n]);
  } catch { /* ไม่มีตาราง = ข้าม */ }
  await logActivity("scent.manage", `เปลี่ยนชื่อกลิ่น "${oldName}" → "${n}"`);
  revalidatePath("/products");
  revalidatePath("/stock");
  revalidateNewForms();
  return { ok: true };
}

export async function setProductActive(id: number, active: boolean): Promise<{ ok: boolean; error?: string }> {
  const g = await gate(); if ("error" in g) return { ok: false, error: g.error };
  await q(`update products set active = $2 where id = $1`, [id, active]);
  await logActivity("scent.manage", `${active ? "เปิด" : "ปิด"}กลิ่น id ${id}`);
  revalidatePath("/products");
  return { ok: true };
}

/** ลบกลิ่นถาวร — เฉพาะแอดมิน · กันลบกลิ่นที่มีในใบเบิก (ให้ปิดแทน กันประวัติเสีย)
 *  ลบพร้อมข้อมูลผูก: บาร์โค้ด + สต๊อกสำเร็จรูป + วัตถุดิบ + flag เลิกผลิต/ปิดขาย (ประวัติใบเบิกไม่กระทบ) */
export async function deleteProduct(id: number): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "กรุณาเข้าสู่ระบบ" };
  if (!can.manageUsers(user.role)) return { ok: false, error: "เฉพาะแอดมินลบได้" };   // manageUsers = admin
  const [p] = await q<{ name: string }>(`select name from products where id = $1`, [id]);
  if (!p) return { ok: false, error: "ไม่พบกลิ่น" };
  const NK = `regexp_replace(lower(btrim($1)),'[^a-z0-9ก-๙]','','g')`;
  const COL = (c: string) => `regexp_replace(lower(btrim(${c})),'[^a-z0-9ก-๙]','','g')`;
  // กันลบกลิ่นที่มีในใบเบิก (ประวัติ)
  const [u] = await q<{ n: number }>(`select count(*)::int n from order_items where ${COL("product")} = ${NK}`, [p.name]);
  if ((u?.n ?? 0) > 0) return { ok: false, error: `กลิ่นนี้มีในใบเบิก ${u.n} รายการ — ปิดการใช้งานแทน (ลบไม่ได้ กันประวัติเสีย)` };
  try {
    await q(`delete from products where id = $1`, [id]);
    for (const stmt of [
      `delete from product_barcodes where ${COL("scent")} = ${NK}`,
      `delete from material_item where category in ('bulk','label') and ${COL("scent")} = ${NK}`,
      `delete from stock where ${COL("product")} = ${NK}`,
      `delete from discontinued_sku where ${COL("scent")} = ${NK}`,
      `delete from closed_sku where ${COL("scent")} = ${NK}`,
    ]) { try { await q(stmt, [p.name]); } catch { /* ตารางอาจไม่มีบน prod */ } }
  } catch (e: any) { return { ok: false, error: e?.message || "ลบไม่สำเร็จ" }; }
  await logActivity("scent.manage", `ลบกลิ่น "${p.name}"`);
  revalidatePath("/products"); revalidatePath("/stock"); revalidateNewForms();
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
  await logActivity("scent.manage", `${sold ? "เปิดขาย" : "ปิดขาย"} ${sc} ${sz}`);
  revalidatePath("/stock");
  revalidateNewForms();
  return { ok: true };
}

// ── ชื่อพ้องกลิ่น (alias) — ผู้นำเข้า (creator) หรือฝ่ายคลัง (manageScents) จัดการได้ ──
const normAlias = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9ก-๙]/g, "");
async function aliasGate() {
  const user = await getCurrentUser();
  if (!user) return { error: "กรุณาเข้าสู่ระบบ" as const };
  if (!(can.createOrders(user.role) || can.manageScents(user.role))) return { error: "ไม่มีสิทธิ์จัดการชื่อพ้อง" as const };
  return { user };
}

export async function addScentAlias(aliasText: string, product: string): Promise<{ ok: boolean; error?: string }> {
  const g = await aliasGate(); if ("error" in g) return { ok: false, error: g.error };
  const text = (aliasText || "").trim();
  const prod = (product || "").trim();
  const key = normAlias(text);
  if (!key) return { ok: false, error: "กรอกชื่อที่ต้องการจับคู่" };
  if (!prod) return { ok: false, error: "เลือกกลิ่นปลายทาง" };
  try {
    await q(
      `insert into scent_aliases (alias_key, alias_text, product, created_by) values ($1,$2,$3,$4)
       on conflict (alias_key) do update set product = excluded.product, alias_text = excluded.alias_text`,
      [key, text, prod, g.user.id],
    );
  } catch { return { ok: false, error: "ยังไม่มีตาราง scent_aliases (รัน migration 0034 บน prod ก่อน)" }; }
  await logActivity("scent.alias", `${text} → ${prod}`);
  revalidatePath("/products/aliases");
  return { ok: true };
}

export async function deleteScentAlias(id: number): Promise<{ ok: boolean; error?: string }> {
  const g = await aliasGate(); if ("error" in g) return { ok: false, error: g.error };
  try { await q(`delete from scent_aliases where id = $1`, [id]); }
  catch { return { ok: false, error: "ลบไม่สำเร็จ" }; }
  revalidatePath("/products/aliases");
  return { ok: true };
}
