"use server";
import { revalidatePath } from "next/cache";
import { q, tx } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { isStockTracked } from "@/lib/config";

/** แก้ไขสต๊อก (รับเข้า/ปรับยอด/นำเข้า/ยกเลิก) = เฉพาะ admin */
async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) return { error: "กรุณาเข้าสู่ระบบ" as const };
  if (user.role !== "admin") return { error: "เฉพาะผู้ดูแลระบบ (admin) เท่านั้นที่แก้ไขสต๊อกได้" as const };
  return { user };
}

export type IssueLine = { product: string; size: string; qty: number; balance: number };
export type SkipLine = { product: string; size: string; qty: number };
export type IssueResult = {
  ok: boolean;
  error?: string;
  alreadyIssued?: boolean;
  order_no?: string;
  doc_no?: string | null;
  lines?: IssueLine[];
  negatives?: IssueLine[];   // SKU ที่ตัดแล้วติดลบ (สต๊อกไม่พอ)
  skipped?: SkipLine[];      // ขนาดตัวอย่าง (1.2/4 ml) — ไม่ตัดสต๊อก
};

/**
 * สแกน/กรอก Order No. → ตัดสต๊อกตามรายการในใบเบิกอัตโนมัติ (atomic, กันตัดซ้ำ).
 */
export async function issueStockByOrder(orderNo: string): Promise<IssueResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "กรุณาเข้าสู่ระบบ" };
  const on = (orderNo || "").trim();
  if (!on) return { ok: false, error: "กรอก/สแกน Order No." };

  try {
    const out = await tx<IssueResult>(async (run) => {
      const [order] = await run<{ order_no: string; doc_no: string | null; deleted_at: string | null; stock_issued_at: string | null }>(
        `select order_no, doc_no, deleted_at, stock_issued_at from orders where order_no = $1`, [on]);
      if (!order) return { ok: false, error: `ไม่พบใบเบิก Order No. ${on}` };
      if (order.deleted_at) return { ok: false, error: `ใบเบิกนี้อยู่ในถังขยะ` };
      if (order.stock_issued_at) return { ok: false, alreadyIssued: true, order_no: on, doc_no: order.doc_no, error: `ใบเบิกนี้ตัดสต๊อกไปแล้ว` };

      const items = await run<{ product: string; size: string; qty: number }>(
        `select product, size, qty::float8 as qty from order_items where order_no = $1 and coalesce(product,'') <> ''`, [on]);
      if (items.length === 0) return { ok: false, error: "ใบเบิกไม่มีรายการสินค้า" };

      const lines: IssueLine[] = [];
      const skipped: SkipLine[] = [];
      for (const it of items) {
        // ขนาดตัวอย่าง (1.2/4 ml) ไม่ตัดสต๊อก
        if (!isStockTracked(it.size)) {
          skipped.push({ product: it.product, size: it.size || "", qty: Number(it.qty) });
          continue;
        }
        // หา SKU สต๊อกที่มีอยู่แบบ normalize ชื่อ (กันชื่อสะกดต่าง เช่น "DionysusX" vs "Dionysus X")
        const [m] = await run<{ product: string }>(
          `select product from stock
           where size = $2 and regexp_replace(lower(product),'[^a-z0-9]','','g') = regexp_replace(lower($1),'[^a-z0-9]','','g')
           limit 1`,
          [it.product, it.size || ""],
        );
        const stockProduct = m?.product ?? it.product;
        const [row] = await run<{ qty: number }>(
          `insert into stock (product, size, qty, updated_at) values ($1, $2, $3, now())
           on conflict (product, size) do update set qty = stock.qty + $3, updated_at = now()
           returning qty::float8 as qty`,
          [stockProduct, it.size || "", -Number(it.qty)],
        );
        await run(
          `insert into stock_moves (product, size, qty_change, balance, reason, order_no, created_by)
           values ($1,$2,$3,$4,'issue',$5,$6)`,
          [stockProduct, it.size || "", -Number(it.qty), row.qty, on, user.id],
        );
        lines.push({ product: it.product, size: it.size || "", qty: Number(it.qty), balance: row.qty });
      }

      await run(`update orders set stock_issued_at = now(), stock_issued_by = $2 where order_no = $1`, [on, user.id]);
      return { ok: true, order_no: on, doc_no: order.doc_no, lines, negatives: lines.filter((l) => l.balance < 0), skipped };
    });

    revalidatePath("/stock");
    revalidatePath("/stock/moves");
    return out;
  } catch (e: any) {
    return { ok: false, error: e?.message || "ตัดสต๊อกไม่สำเร็จ" };
  }
}

/** ยกเลิกการตัดสต๊อก (คืนสต๊อก + เคลียร์ flag) — เฉพาะ admin */
export async function reverseIssue(orderNo: string): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "กรุณาเข้าสู่ระบบ" };
  if (user.role !== "admin") return { ok: false, error: "เฉพาะผู้ดูแลระบบ" };
  const on = (orderNo || "").trim();
  try {
    await tx(async (run) => {
      const [o] = await run<{ stock_issued_at: string | null }>(`select stock_issued_at from orders where order_no = $1`, [on]);
      if (!o?.stock_issued_at) throw new Error("ใบเบิกนี้ยังไม่ได้ตัดสต๊อก");
      const items = await run<{ product: string; size: string; qty: number }>(
        `select product, size, qty::float8 as qty from order_items where order_no = $1 and coalesce(product,'') <> ''`, [on]);
      for (const it of items) {
        if (!isStockTracked(it.size)) continue;   // ตัวอย่างไม่เคยตัด → ไม่ต้องคืน
        const [row] = await run<{ qty: number }>(
          `insert into stock (product, size, qty, updated_at) values ($1,$2,$3,now())
           on conflict (product, size) do update set qty = stock.qty + $3, updated_at = now()
           returning qty::float8 as qty`, [it.product, it.size || "", Number(it.qty)]);
        await run(`insert into stock_moves (product, size, qty_change, balance, reason, order_no, note, created_by)
                   values ($1,$2,$3,$4,'adjust',$5,'ยกเลิกตัดสต๊อก',$6)`, [it.product, it.size || "", Number(it.qty), row.qty, on, user.id]);
      }
      await run(`update orders set stock_issued_at = null, stock_issued_by = null where order_no = $1`, [on]);
    });
    revalidatePath("/stock"); revalidatePath("/stock/moves");
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "ยกเลิกไม่สำเร็จ" };
  }
}

/** รับสินค้าเข้าสต๊อก (+qty) */
export async function receiveStock(product: string, size: string, qty: number, note?: string): Promise<{ ok: boolean; error?: string; balance?: number }> {
  const gate = await requireAdmin();
  if ("error" in gate) return { ok: false, error: gate.error };
  const user = gate.user;
  if (!product?.trim() || !size?.trim()) return { ok: false, error: "เลือกสินค้า + ขนาด" };
  const amt = Number(qty);
  if (!(amt > 0)) return { ok: false, error: "จำนวนต้องมากกว่า 0" };
  try {
    const balance = await tx<number>(async (run) => {
      const [row] = await run<{ qty: number }>(
        `insert into stock (product, size, qty, updated_at) values ($1,$2,$3,now())
         on conflict (product, size) do update set qty = stock.qty + $3, updated_at = now()
         returning qty::float8 as qty`, [product.trim(), size.trim(), amt]);
      await run(`insert into stock_moves (product, size, qty_change, balance, reason, note, created_by)
                 values ($1,$2,$3,$4,'receive',$5,$6)`, [product.trim(), size.trim(), amt, row.qty, note || null, user.id]);
      return row.qty;
    });
    revalidatePath("/stock"); revalidatePath("/stock/moves");
    return { ok: true, balance };
  } catch (e: any) {
    return { ok: false, error: e?.message || "รับเข้าไม่สำเร็จ" };
  }
}

/** ปรับยอดสต๊อกเป็นค่าที่นับได้ (set) — บันทึกส่วนต่างเป็น movement */
export async function adjustStock(product: string, size: string, newQty: number, note?: string): Promise<{ ok: boolean; error?: string }> {
  const gate = await requireAdmin();
  if ("error" in gate) return { ok: false, error: gate.error };
  const user = gate.user;
  const target = Number(newQty);
  if (Number.isNaN(target)) return { ok: false, error: "จำนวนไม่ถูกต้อง" };
  try {
    await tx(async (run) => {
      const [cur] = await run<{ qty: number }>(`select qty::float8 as qty from stock where product = $1 and size = $2`, [product.trim(), size.trim()]);
      const old = cur?.qty ?? 0;
      const diff = target - old;
      await run(
        `insert into stock (product, size, qty, updated_at) values ($1,$2,$3,now())
         on conflict (product, size) do update set qty = $3, updated_at = now()`,
        [product.trim(), size.trim(), target]);
      await run(`insert into stock_moves (product, size, qty_change, balance, reason, note, created_by)
                 values ($1,$2,$3,$4,'adjust',$5,$6)`, [product.trim(), size.trim(), diff, target, note || `ปรับยอดเป็น ${target}`, user.id]);
    });
    revalidatePath("/stock"); revalidatePath("/stock/moves");
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "ปรับยอดไม่สำเร็จ" };
  }
}
