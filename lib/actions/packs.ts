"use server";
import { q, tx } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/roles";
import { revalidatePath, revalidateTag } from "next/cache";
import { logActivity } from "@/lib/activity";

// จัดการนิยาม "แพ็ค" (bundle) — สินค้า 1 listing = หลายขวดตายตัว → แตกเป็นกลิ่นย่อย
// สิทธิ์: admin + คลัง (manageScents) เหมือนหน้า master สินค้า/ค้าส่ง

async function gate() {
  const user = await getCurrentUser();
  if (!user) return { error: "กรุณาเข้าสู่ระบบ" as const };
  if (!can.manageScents(user.role)) return { error: "เฉพาะแอดมิน / คลัง" as const };
  return { user };
}
function bump() { revalidateTag("reference"); revalidatePath("/packs"); }

export type PackItemInput = { product: string; size: string; is_free: boolean };
export type PackInput = { id?: number; name: string; match: string; active: boolean; items: PackItemInput[] };

/** บันทึกแพ็ค (สร้าง/แก้) — แทนที่รายการกลิ่นทั้งชุด */
export async function savePack(inp: PackInput): Promise<{ ok: boolean; error?: string; id?: number }> {
  const g = await gate(); if ("error" in g) return { ok: false, error: g.error };
  const name = (inp.name || "").trim(), match = (inp.match || "").trim();
  if (!name || !match) return { ok: false, error: "กรอกชื่อแพ็ค + คำที่ใช้จับชื่อสินค้า" };
  const items = (inp.items || [])
    .map((i) => ({ product: (i.product || "").trim(), size: (i.size || "").trim() || "4 ml", is_free: !!i.is_free }))
    .filter((i) => i.product);
  if (!items.length) return { ok: false, error: "ใส่กลิ่นในแพ็คอย่างน้อย 1 รายการ" };
  try {
    const id = await tx<number>(async (run) => {
      let pid = inp.id;
      if (pid) {
        await run(`update packs set name=$2, match_text=$3, active=$4, updated_at=now() where id=$1`, [pid, name, match, inp.active !== false]);
        await run(`delete from pack_items where pack_id=$1`, [pid]);
      } else {
        const [r] = await run<{ id: number }>(
          `insert into packs (name, match_text, active, sort) values ($1,$2,$3, coalesce((select max(sort)+1 from packs),0)) returning id`,
          [name, match, inp.active !== false]);
        pid = r.id;
      }
      let sort = 0;
      for (const it of items) await run(`insert into pack_items (pack_id, product, size, is_free, sort) values ($1,$2,$3,$4,$5)`, [pid, it.product, it.size, it.is_free, ++sort]);
      return pid!;
    });
    await logActivity("pack.save", `${name} (${items.length} กลิ่น)`);
    bump();
    return { ok: true, id };
  } catch (e: any) { return { ok: false, error: e?.message || "บันทึกไม่สำเร็จ (รัน 0048 บน prod แล้วหรือยัง?)" }; }
}

export async function deletePack(id: number): Promise<{ ok: boolean; error?: string }> {
  const g = await gate(); if ("error" in g) return { ok: false, error: g.error };
  try { await q(`delete from packs where id=$1`, [id]); }
  catch (e: any) { return { ok: false, error: e?.message || "ลบไม่สำเร็จ" }; }
  await logActivity("pack.delete", `pack ${id}`);
  bump();
  return { ok: true };
}
