"use server";
import { revalidatePath } from "next/cache";
import { q } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/roles";

// จัดการรายการสเป็ก (spec_options) — ฝ่ายจัดของ/แอดมิน
async function gate() {
  const user = await getCurrentUser();
  if (!user) return { error: "กรุณาเข้าสู่ระบบ" as const };
  if (!can.issueStock(user.role) && !can.createOrders(user.role)) return { error: "ไม่มีสิทธิ์จัดการสเป็ก" as const };
  return { user };
}
function done() {
  revalidatePath("/stock/specs");
  revalidatePath("/stock/issue");
}

export async function addSpecOption(label: string): Promise<{ ok: boolean; error?: string }> {
  const g = await gate(); if ("error" in g) return { ok: false, error: g.error };
  const l = (label || "").trim();
  if (!l) return { ok: false, error: "กรอกชื่อสเป็ก" };
  const [dup] = await q(`select 1 from spec_options where lower(label) = lower($1)`, [l]);
  if (dup) return { ok: false, error: "มีสเป็กนี้อยู่แล้ว" };
  await q(`insert into spec_options (label, sort) values ($1, coalesce((select max(sort) from spec_options),0)+1)`, [l]);
  done(); return { ok: true };
}

export async function renameSpecOption(id: number, label: string): Promise<{ ok: boolean; error?: string }> {
  const g = await gate(); if ("error" in g) return { ok: false, error: g.error };
  const l = (label || "").trim();
  if (!l) return { ok: false, error: "กรอกชื่อสเป็ก" };
  const [dup] = await q(`select 1 from spec_options where lower(label) = lower($1) and id <> $2`, [l, id]);
  if (dup) return { ok: false, error: "มีสเป็กนี้อยู่แล้ว" };
  await q(`update spec_options set label = $2 where id = $1`, [id, l]);
  done(); return { ok: true };
}

export async function setSpecOptionActive(id: number, active: boolean): Promise<{ ok: boolean; error?: string }> {
  const g = await gate(); if ("error" in g) return { ok: false, error: g.error };
  await q(`update spec_options set active = $2 where id = $1`, [id, active]);
  done(); return { ok: true };
}

export async function deleteSpecOption(id: number): Promise<{ ok: boolean; error?: string }> {
  const g = await gate(); if ("error" in g) return { ok: false, error: g.error };
  await q(`delete from spec_options where id = $1`, [id]);
  done(); return { ok: true };
}

/** ตั้งว่าเป็นสเป็กเฉพาะถุงกระดาษไหม (for_bag) — ถ้าใช่จะซ่อนจาก dropdown ของสินค้าปกติ */
export async function setSpecOptionBag(id: number, forBag: boolean): Promise<{ ok: boolean; error?: string }> {
  const g = await gate(); if ("error" in g) return { ok: false, error: g.error };
  await q(`update spec_options set for_bag = $2 where id = $1`, [id, forBag]);
  done(); return { ok: true };
}

// ---- กฎเลือกสเป็กอัตโนมัติ (spec_rules) --------------------------------------
export async function addSpecRule(sizes: string, grades: string, spec: string): Promise<{ ok: boolean; error?: string }> {
  const g = await gate(); if ("error" in g) return { ok: false, error: g.error };
  const sz = (sizes || "").trim(), gr = (grades || "").trim(), sp = (spec || "").trim();
  if (!sz || !gr || !sp) return { ok: false, error: "กรอกขนาด / Grade / สเป็ก ให้ครบ" };
  await q(`insert into spec_rules (sizes, grades, spec, sort) values ($1,$2,$3, coalesce((select max(sort) from spec_rules),0)+1)`, [sz, gr, sp]);
  done(); return { ok: true };
}

export async function updateSpecRule(id: number, sizes: string, grades: string, spec: string): Promise<{ ok: boolean; error?: string }> {
  const g = await gate(); if ("error" in g) return { ok: false, error: g.error };
  const sz = (sizes || "").trim(), gr = (grades || "").trim(), sp = (spec || "").trim();
  if (!sz || !gr || !sp) return { ok: false, error: "กรอกขนาด / Grade / สเป็ก ให้ครบ" };
  await q(`update spec_rules set sizes = $2, grades = $3, spec = $4 where id = $1`, [id, sz, gr, sp]);
  done(); return { ok: true };
}

export async function setSpecRuleActive(id: number, active: boolean): Promise<{ ok: boolean; error?: string }> {
  const g = await gate(); if ("error" in g) return { ok: false, error: g.error };
  await q(`update spec_rules set active = $2 where id = $1`, [id, active]);
  done(); return { ok: true };
}

export async function deleteSpecRule(id: number): Promise<{ ok: boolean; error?: string }> {
  const g = await gate(); if ("error" in g) return { ok: false, error: g.error };
  await q(`delete from spec_rules where id = $1`, [id]);
  done(); return { ok: true };
}
