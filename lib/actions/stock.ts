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

/** หา SKU สต๊อกที่ตรงกับชื่อในใบเบิกแบบ normalize (กันสะกดต่าง) — keep อักษรไทย
 *  ให้ตรงกับ productKey() ใน config. คืนชื่อจริงในตาราง stock ถ้าเจอ ไม่งั้นคืนชื่อเดิม. */
async function matchStockProduct(
  run: <R = any>(sql: string, p?: any[]) => Promise<R[]>,
  product: string,
  size: string,
): Promise<string> {
  const [m] = await run<{ product: string }>(
    `select product from stock
     where size = $2 and regexp_replace(lower(product),'[^a-z0-9ก-๙]','','g') = regexp_replace(lower($1),'[^a-z0-9ก-๙]','','g')
     limit 1`,
    [product, size],
  );
  return m?.product ?? product;
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

      // Atomically CLAIM the order so two concurrent scans can't both deduct.
      // Only the winner gets a row back; a concurrent claimer sees 0 rows.
      const claim = await run<{ order_no: string }>(
        `update orders set stock_issued_at = now(), stock_issued_by = $2
         where order_no = $1 and deleted_at is null and stock_issued_at is null
         returning order_no`,
        [on, user.id]);
      if (claim.length === 0) return { ok: false, alreadyIssued: true, order_no: on, doc_no: order.doc_no, error: `ใบเบิกนี้ตัดสต๊อกไปแล้ว` };

      const items = await run<{ product: string; size: string; qty: number }>(
        `select product, size, qty::float8 as qty from order_items where order_no = $1 and coalesce(product,'') <> ''`, [on]);
      if (items.length === 0) throw new Error("ใบเบิกไม่มีรายการสินค้า");

      const lines: IssueLine[] = [];
      const skipped: SkipLine[] = [];
      for (const it of items) {
        // ขนาดตัวอย่าง (1.2/4 ml) ไม่ตัดสต๊อก
        if (!isStockTracked(it.size)) {
          skipped.push({ product: it.product, size: it.size || "", qty: Number(it.qty) });
          continue;
        }
        // หา SKU สต๊อกที่มีอยู่แบบ normalize ชื่อ (กันชื่อสะกดต่าง เช่น "DionysusX" vs "Dionysus X")
        // regex เก็บอักษรไทย (ก-๙) ให้ตรงกับ productKey() — ไม่งั้นกลิ่นชื่อไทยจะยุบเป็นค่าว่างชนกัน
        const stockProduct = await matchStockProduct(run, it.product, it.size || "");
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
        lines.push({ product: stockProduct, size: it.size || "", qty: Number(it.qty), balance: row.qty });
      }

      return { ok: true, order_no: on, doc_no: order.doc_no, lines, negatives: lines.filter((l) => l.balance < 0), skipped };
    });

    revalidatePath("/stock");
    revalidatePath("/stock/moves");
    return out;
  } catch (e: any) {
    return { ok: false, error: e?.message || "ตัดสต๊อกไม่สำเร็จ" };
  }
}

export type IssueItemPreview = {
  line_no: number; product: string; size: string; qty: number; unit: string;
  is_free: boolean; sku: string | null; spec: string | null; stock: number; tracked: boolean;
};
export type IssueLookup = {
  ok: boolean; error?: string; alreadyIssued?: boolean;
  order_no?: string; doc_no?: string | null; items?: IssueItemPreview[];
};

/** สแกน/กรอก Order No. → ดึงรายการทั้งหมดของใบเบิกมาให้ตรวจ (ยังไม่ตัดสต๊อก). */
export async function lookupOrderForIssue(orderNo: string): Promise<IssueLookup> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "กรุณาเข้าสู่ระบบ" };
  const on = (orderNo || "").trim();
  if (!on) return { ok: false, error: "กรอก/สแกน Order No." };

  const [order] = await q<{ order_no: string; doc_no: string | null; deleted_at: string | null; stock_issued_at: string | null }>(
    `select order_no, doc_no, deleted_at, stock_issued_at from orders where order_no = $1`, [on]);
  if (!order) return { ok: false, error: `ไม่พบใบเบิก Order No. ${on}` };
  if (order.deleted_at) return { ok: false, error: "ใบเบิกนี้อยู่ในถังขยะ" };
  if (order.stock_issued_at) return { ok: false, alreadyIssued: true, order_no: on, doc_no: order.doc_no, error: "ใบเบิกนี้ตัดสต๊อกไปแล้ว" };

  const items = await q<{ line_no: number; product: string; size: string; qty: number; unit: string; is_free: boolean; sku: string | null; spec: string | null }>(
    `select line_no, product, size, qty::float8 as qty, unit, is_free, sku, spec
     from order_items where order_no = $1 and coalesce(product,'') <> '' order by line_no`, [on]);
  if (items.length === 0) return { ok: false, error: "ใบเบิกไม่มีรายการสินค้า" };

  const withStock: IssueItemPreview[] = [];
  for (const it of items) {
    const [s] = await q<{ qty: number }>(
      `select qty::float8 as qty from stock
       where size = $2 and regexp_replace(lower(product),'[^a-z0-9ก-๙]','','g') = regexp_replace(lower($1),'[^a-z0-9ก-๙]','','g')
       order by (product = $1) desc limit 1`, [it.product, it.size]);
    withStock.push({ ...it, stock: s?.qty ?? 0, tracked: isStockTracked(it.size) });
  }
  return { ok: true, order_no: on, doc_no: order.doc_no, items: withStock };
}

/** บันทึก SKU + Spec ที่พนักงานสแกน/กรอก แล้วตัดสต๊อก (ยืนยัน). */
export async function confirmIssueByOrder(
  orderNo: string,
  entries: { line_no: number; sku?: string | null; spec?: string | null }[],
): Promise<IssueResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "กรุณาเข้าสู่ระบบ" };
  const on = (orderNo || "").trim();
  try {
    await tx(async (run) => {
      for (const e of entries) {
        await run(`update order_items set sku = $2, spec = $3 where order_no = $1 and line_no = $4`,
          [on, (e.sku || "").trim() || null, (e.spec || "").trim() || null, e.line_no]);
      }
    });
  } catch (e: any) {
    return { ok: false, error: e?.message || "บันทึกข้อมูลไม่สำเร็จ" };
  }
  return issueStockByOrder(on); // ตัดสต๊อก (atomic + กันตัดซ้ำ)
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
      // คืนสต๊อกจากสิ่งที่ "ตัดจริง" ที่บันทึกไว้ใน ledger (ไม่ใช่คำนวณใหม่จาก order_items)
      // → คืนตรง SKU/จำนวนที่ตัดไป แม้ชื่อจะถูก normalize-match หรือ order ถูกแก้ภายหลัง.
      // จำกัดเฉพาะรอบตัดล่าสุด (created_at >= stock_issued_at) กันคืนซ้ำจากรอบก่อนๆ.
      const moves = await run<{ product: string; size: string; qty_change: number }>(
        `select product, size, qty_change::float8 as qty_change from stock_moves
         where order_no = $1 and reason = 'issue' and created_at >= $2`, [on, o.stock_issued_at]);
      for (const mv of moves) {
        const back = -Number(mv.qty_change);   // issue บันทึกเป็นค่าลบ → คืนเป็นบวก
        if (!back) continue;
        const [row] = await run<{ qty: number }>(
          `insert into stock (product, size, qty, updated_at) values ($1,$2,$3,now())
           on conflict (product, size) do update set qty = stock.qty + $3, updated_at = now()
           returning qty::float8 as qty`, [mv.product, mv.size || "", back]);
        await run(`insert into stock_moves (product, size, qty_change, balance, reason, order_no, note, created_by)
                   values ($1,$2,$3,$4,'adjust',$5,'ยกเลิกตัดสต๊อก',$6)`, [mv.product, mv.size || "", back, row.qty, on, user.id]);
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
