"use server";
import { revalidatePath } from "next/cache";
import { q } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/roles";

// จัดการรายชื่อกลิ่น (master products) — เฉพาะแอดมิน
async function gate() {
  const user = await getCurrentUser();
  if (!user) return { error: "กรุณาเข้าสู่ระบบ" as const };
  if (!can.manageUsers(user.role)) return { error: "เฉพาะผู้ดูแลระบบ" as const };
  return { user };
}

export async function createProduct(name: string): Promise<{ ok: boolean; error?: string }> {
  const g = await gate(); if ("error" in g) return { ok: false, error: g.error };
  const n = (name || "").trim();
  if (!n) return { ok: false, error: "กรอกชื่อกลิ่น" };
  const [dup] = await q(`select 1 from products where lower(name) = lower($1)`, [n]);
  if (dup) return { ok: false, error: "มีกลิ่นนี้อยู่แล้ว" };
  await q(`insert into products (name, active, sort) values ($1, true, coalesce((select max(sort) from products),0)+1)`, [n]);
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
