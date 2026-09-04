"use server";
import { revalidatePath, revalidateTag } from "next/cache";
import { q } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/roles";
import { logActivity } from "@/lib/activity";
import { enabledPlatforms, platformBase } from "@/lib/config";

const ntrim = (s?: string | null) => ((s || "").trim() || null);
async function gate() {
  const user = await getCurrentUser();
  if (!user) return { error: "กรุณาเข้าสู่ระบบ" as const };
  if (!can.manageScents(user.role)) return { error: "ไม่มีสิทธิ์จัดการค้าส่ง (admin/คลัง)" as const };
  return { user };
}
// รีเฟรชหน้าจัดการ + ฟอร์มสร้างใบเบิก (dropdown กลิ่น/สาขาเปลี่ยน)
function bump() { revalidatePath("/wholesale"); revalidateTag("reference"); for (const p of enabledPlatforms()) revalidatePath(`${platformBase(p.code)}/new`); }

// ── catalog สินค้าค้าส่ง ──────────────────────────────────────────────
export type CatalogInput = { id?: number; platform: string; product: string; size: string; barcode?: string; code?: string; item_name?: string; grade?: string; active?: boolean };
export async function saveCatalogItem(inp: CatalogInput): Promise<{ ok: boolean; error?: string }> {
  const g = await gate(); if ("error" in g) return { ok: false, error: g.error };
  const product = (inp.product || "").trim(), size = (inp.size || "").trim();
  if (!product || !size) return { ok: false, error: "กรอกกลิ่นและขนาด" };
  const item_name = (inp.item_name || "").trim() || product;
  try {
    if (inp.id) {
      await q(`update wholesale_catalog set product=$2, size=$3, barcode=$4, code=$5, item_name=$6, grade=$7, active=$8, updated_at=now() where id=$1`,
        [inp.id, product, size, ntrim(inp.barcode), ntrim(inp.code), item_name, ntrim(inp.grade), inp.active !== false]);
    } else {
      await q(`insert into wholesale_catalog (platform, product, size, barcode, code, item_name, grade, active, sort)
               values ($1,$2,$3,$4,$5,$6,$7,true, coalesce((select max(sort)+1 from wholesale_catalog where platform=$1),0))
               on conflict (platform, product, size) do update set barcode=excluded.barcode, code=excluded.code, item_name=excluded.item_name, grade=excluded.grade, active=true, updated_at=now()`,
        [inp.platform, product, size, ntrim(inp.barcode), ntrim(inp.code), item_name, ntrim(inp.grade)]);
    }
  } catch (e: any) { return { ok: false, error: e?.message || "บันทึกไม่สำเร็จ" }; }
  await logActivity("wholesale.catalog", `${inp.platform} ${product} ${size}`); bump(); return { ok: true };
}
export async function deleteCatalogItem(id: number): Promise<{ ok: boolean; error?: string }> {
  const g = await gate(); if ("error" in g) return { ok: false, error: g.error };
  try { await q(`delete from wholesale_catalog where id=$1`, [id]); } catch (e: any) { return { ok: false, error: e?.message || "ลบไม่สำเร็จ" }; }
  await logActivity("wholesale.catalog", `ลบ catalog id ${id}`); bump(); return { ok: true };
}

// ── สาขาค้าส่ง (Eveandboy) ────────────────────────────────────────────
export type BranchInput = { id?: number; platform: string; branch: string; code?: string; address?: string; active?: boolean };
export async function saveBranch(inp: BranchInput): Promise<{ ok: boolean; error?: string }> {
  const g = await gate(); if ("error" in g) return { ok: false, error: g.error };
  const branch = (inp.branch || "").trim();
  if (!branch) return { ok: false, error: "กรอกชื่อสาขา" };
  try {
    if (inp.id) {
      await q(`update wholesale_branch set branch=$2, code=$3, address=$4, active=$5, updated_at=now() where id=$1`,
        [inp.id, branch, ntrim(inp.code), ntrim(inp.address), inp.active !== false]);
    } else {
      await q(`insert into wholesale_branch (platform, branch, code, address, active, sort)
               values ($1,$2,$3,$4,true, coalesce((select max(sort)+1 from wholesale_branch where platform=$1),0))
               on conflict (platform, branch) do update set code=excluded.code, address=excluded.address, active=true, updated_at=now()`,
        [inp.platform, branch, ntrim(inp.code), ntrim(inp.address)]);
    }
  } catch (e: any) { return { ok: false, error: e?.message || "บันทึกไม่สำเร็จ" }; }
  await logActivity("wholesale.branch", `${inp.platform} ${branch}`); bump(); return { ok: true };
}
export async function deleteBranch(id: number): Promise<{ ok: boolean; error?: string }> {
  const g = await gate(); if ("error" in g) return { ok: false, error: g.error };
  try { await q(`delete from wholesale_branch where id=$1`, [id]); } catch (e: any) { return { ok: false, error: e?.message || "ลบไม่สำเร็จ" }; }
  await logActivity("wholesale.branch", `ลบสาขา id ${id}`); bump(); return { ok: true };
}
