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
