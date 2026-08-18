"use server";
import { revalidatePath } from "next/cache";
import { q, tx } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/roles";

async function gate() {
  const user = await getCurrentUser();
  if (!user) return { error: "กรุณาเข้าสู่ระบบ" as const };
  if (!isAdmin(user.role)) return { error: "เฉพาะผู้ดูแลระบบเท่านั้นที่แก้ไขได้" as const };
  return { user };
}

export type FdaPatch = {
  product?: string; grade?: string; reg_no?: string; issue_date?: string | null; expiry_date?: string | null;
  fda_status?: string; prod_status?: string; name_th?: string; name_en?: string;
};
const s = (v?: string | null) => (v || "").trim() || null;
const d = (v?: string | null) => { const t = (v || "").trim(); return /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : null; };

/** แก้ไขรายการ อย. */
export async function updateFda(id: number, p: FdaPatch): Promise<{ ok: boolean; error?: string }> {
  const g = await gate(); if ("error" in g) return { ok: false, error: g.error };
  if (p.product != null && !p.product.trim()) return { ok: false, error: "กรอกชื่อกลิ่น" };
  try {
    await q(
      `update fda_registrations set
         product = coalesce($2, product), grade = $3, reg_no = $4, issue_date = $5, expiry_date = $6,
         fda_status = $7, prod_status = $8, name_th = $9, name_en = $10, updated_at = now()
       where id = $1`,
      [id, s(p.product), s(p.grade), s(p.reg_no), d(p.issue_date), d(p.expiry_date), s(p.fda_status), s(p.prod_status), s(p.name_th), s(p.name_en)]);
    revalidatePath("/fda");
    return { ok: true };
  } catch (e: any) {
    if (String(e?.message).includes("uq_fda_product")) return { ok: false, error: "มีกลิ่นชื่อนี้ในข้อมูล อย. อยู่แล้ว" };
    return { ok: false, error: e?.message || "บันทึกไม่สำเร็จ" };
  }
}

/** เพิ่มรายการ อย. ใหม่ (upsert ด้วยชื่อกลิ่น) */
export async function addFda(p: FdaPatch): Promise<{ ok: boolean; error?: string }> {
  const g = await gate(); if ("error" in g) return { ok: false, error: g.error };
  if (!p.product?.trim()) return { ok: false, error: "กรอกชื่อกลิ่น" };
  try {
    await q(
      `insert into fda_registrations (product, grade, reg_no, issue_date, expiry_date, fda_status, prod_status, name_th, name_en)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       on conflict (regexp_replace(lower(btrim(product)),'[^a-z0-9ก-๙]','','g'))
       do update set grade=excluded.grade, reg_no=excluded.reg_no, issue_date=excluded.issue_date,
         expiry_date=excluded.expiry_date, fda_status=excluded.fda_status, prod_status=excluded.prod_status,
         name_th=excluded.name_th, name_en=excluded.name_en, updated_at=now()`,
      [p.product.trim(), s(p.grade), s(p.reg_no), d(p.issue_date), d(p.expiry_date), s(p.fda_status), s(p.prod_status), s(p.name_th), s(p.name_en)]);
    revalidatePath("/fda");
    return { ok: true };
  } catch (e: any) { return { ok: false, error: e?.message || "เพิ่มไม่สำเร็จ" }; }
}

/** ต่ออายุ อย. — เลื่อนวันสิ้นสุด +N ปี (จากวันสิ้นสุดเดิม) + บันทึกประวัติ */
export async function renewFda(id: number, years = 3): Promise<{ ok: boolean; error?: string; new_expiry?: string }> {
  const g = await gate(); if ("error" in g) return { ok: false, error: g.error };
  const y = Math.max(1, Math.min(10, Math.round(years)));
  try {
    let newExpiry = "";
    await tx(async (run) => {
      const [f] = await run<{ reg_no: string | null; old_expiry: string | null; new_expiry: string }>(
        `with cur as (
           select id, reg_no, expiry_date as old_expiry, coalesce(expiry_date, current_date) as base
           from fda_registrations where id = $1)
         update fda_registrations f
            set issue_date = cur.base,
                expiry_date = (cur.base + ($2 || ' years')::interval)::date,
                fda_status = 'คงอยู่', updated_at = now()
           from cur where f.id = cur.id
         returning cur.reg_no, cur.old_expiry, f.expiry_date as new_expiry`, [id, String(y)]);
      if (!f) throw new Error("ไม่พบรายการ");
      newExpiry = String(f.new_expiry).slice(0, 10);
      await run(`insert into fda_renewals (fda_id, reg_no, old_expiry, new_expiry, renewed_by) values ($1,$2,$3,$4,$5)`,
        [id, f.reg_no, f.old_expiry, f.new_expiry, g.user.id]);
    });
    revalidatePath("/fda");
    return { ok: true, new_expiry: newExpiry };
  } catch (e: any) { return { ok: false, error: e?.message || "ต่ออายุไม่สำเร็จ" }; }
}

export async function deleteFda(id: number): Promise<{ ok: boolean; error?: string }> {
  const g = await gate(); if ("error" in g) return { ok: false, error: g.error };
  try {
    await q(`delete from fda_registrations where id = $1`, [id]);
    revalidatePath("/fda");
    return { ok: true };
  } catch (e: any) { return { ok: false, error: e?.message || "ลบไม่สำเร็จ" }; }
}
