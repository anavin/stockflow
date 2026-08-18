"use server";
import { revalidatePath } from "next/cache";
import { q, tx } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/roles";
import { logActivity } from "@/lib/activity";
import { isStockTracked } from "@/lib/config";
import { getActiveSpecRules, getScentBarcodes, stockGapFor } from "@/lib/queries";

// ---- auto-select spec ตามขนาด + Grade (จากตาราง spec_rules) --------------------
const normSize = (s: string) => (s || "").toLowerCase().replace(/[^0-9a-z]/g, "");
const isBagProduct = (product: string) => /ถุง/.test(product || "");  // ถุงกระดาษ = ใช้สเป็ก Size S/M
function pickAutoSpec(size: string, grade: string | null, rules: { sizes: string; grades: string; spec: string }[]): string {
  const sz = normSize(size);
  const gr = (grade || "").trim().toLowerCase();
  if (!sz || !gr) return "";
  for (const r of rules) {
    const sizes = r.sizes.split(",").map((x) => normSize(x)).filter(Boolean);
    const grades = r.grades.split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
    if (sizes.includes(sz) && grades.includes(gr)) return r.spec;
  }
  return "";
}

/** แก้ไขสต๊อก (รับเข้า/ปรับยอด/นำเข้า) = เจ้าของ (admin) + ฝ่ายคลัง (stock) */
async function requireStockEdit() {
  const user = await getCurrentUser();
  if (!user) return { error: "กรุณาเข้าสู่ระบบ" as const };
  if (!can.manageStock(user.role)) return { error: "เฉพาะผู้ดูแลระบบ / ฝ่ายคลัง เท่านั้นที่แก้ไขสต๊อกได้" as const };
  return { user };
}

/** SQL: จับคู่ SKU สต๊อกที่มีอยู่จริงแบบ normalize —
 *  ชื่อ: ตัดช่องว่าง/อักขระ (เก็บไทย ก-๙) ให้ตรงกับ productKey()
 *  ขนาด: ตัดช่องว่าง+จุดท้าย ('4 ml.' == '4 ml') กันสร้าง SKU ซ้ำจากรูปแบบต่างเล็กน้อย */
const SKU_MATCH = `regexp_replace(lower(product),'[^a-z0-9ก-๙]','','g') = regexp_replace(lower($1),'[^a-z0-9ก-๙]','','g')
   and btrim(lower(size), ' .') = btrim(lower($2), ' .')`;
const SKU_TIEBREAK = `order by (product = $1) desc, (size = $2) desc limit 1`;

/** คืน {product,size} จริงในตาราง stock ถ้าเจอ ไม่งั้นคืน input (จะสร้าง SKU ใหม่/ติดลบ).
 *  ใช้ทั้งตอน preview และตอนตัดจริง เพื่อให้ยอดที่โชว์กับที่ตัด "ตรงแถวเดียวกัน". */
async function matchStockSku(
  run: <R = any>(sql: string, p?: any[]) => Promise<R[]>,
  product: string,
  size: string,
): Promise<{ product: string; size: string }> {
  const [m] = await run<{ product: string; size: string }>(
    `select product, size from stock where ${SKU_MATCH} ${SKU_TIEBREAK}`,
    [product, size || ""],
  );
  return m ?? { product, size: size || "" };
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
  skipped?: SkipLine[];      // ขนาดที่ไม่มีหน่วย ml (ของแถม/อุปกรณ์) — ไม่ตัดสต๊อก
};

/**
 * สแกน/กรอก Order No. → ตัดสต๊อกตามรายการในใบเบิกอัตโนมัติ (atomic, กันตัดซ้ำ).
 */
/** core: CLAIM ใบเบิก (atomic กันตัดซ้ำ) + ตัดสต๊อกทุกบรรทัด — ต้องเรียกภายใน tx() เท่านั้น.
 *  แยกออกมาเพื่อให้ confirmIssueByOrder ห่อ SKU/Spec + การตัด ไว้ใน tx เดียว (atomic). */
async function runIssue(
  run: <R = any>(sql: string, p?: any[]) => Promise<R[]>,
  on: string,
  userId: number,
): Promise<IssueResult> {
  const [order] = await run<{ order_no: string; doc_no: string | null; deleted_at: string | null; stock_issued_at: string | null }>(
    `select order_no, doc_no, deleted_at, stock_issued_at from orders where order_no = $1`, [on]);
  if (!order) return { ok: false, error: `ไม่พบใบเบิก Order No. ${on}` };
  if (order.deleted_at) return { ok: false, error: `ใบเบิกนี้อยู่ในถังขยะ` };
  if (order.stock_issued_at) return { ok: false, alreadyIssued: true, order_no: on, doc_no: order.doc_no, error: `ใบเบิกนี้ตัดสต๊อกไปแล้ว` };

  // Atomically CLAIM the order so two concurrent scans can't both deduct.
  const claim = await run<{ order_no: string }>(
    `update orders set stock_issued_at = now(), stock_issued_by = $2
     where order_no = $1 and deleted_at is null and stock_issued_at is null
     returning order_no`,
    [on, userId]);
  if (claim.length === 0) return { ok: false, alreadyIssued: true, order_no: on, doc_no: order.doc_no, error: `ใบเบิกนี้ตัดสต๊อกไปแล้ว` };

  const items = await run<{ product: string; size: string; qty: number }>(
    `select product, size, qty::float8 as qty from order_items where order_no = $1 and coalesce(product,'') <> ''`, [on]);
  if (items.length === 0) throw new Error("ใบเบิกไม่มีรายการสินค้า");

  const lines: IssueLine[] = [];
  const skipped: SkipLine[] = [];
  for (const it of items) {
    // ตัดสต๊อกทุกขนาดที่เป็น ml (รวมตัวอย่าง 1.2/4 ml) — ขนาดที่ไม่มี ml (ของแถม/อุปกรณ์) ไม่ตัด
    if (!isStockTracked(it.size)) {
      skipped.push({ product: it.product, size: it.size || "", qty: Number(it.qty) });
      continue;
    }
    // จับคู่ SKU จริงในสต๊อก (normalize ชื่อ+ขนาด) → ตัดตรงแถวเดิม ไม่สร้าง SKU ซ้ำ
    const sku = await matchStockSku(run, it.product, it.size || "");
    const [row] = await run<{ qty: number }>(
      `insert into stock (product, size, qty, updated_at) values ($1, $2, $3, now())
       on conflict (product, size) do update set qty = stock.qty + $3, updated_at = now()
       returning qty::float8 as qty`,
      [sku.product, sku.size, -Number(it.qty)],
    );
    await run(
      `insert into stock_moves (product, size, qty_change, balance, reason, order_no, created_by)
       values ($1,$2,$3,$4,'issue',$5,$6)`,
      [sku.product, sku.size, -Number(it.qty), row.qty, on, userId],
    );
    lines.push({ product: sku.product, size: sku.size, qty: Number(it.qty), balance: row.qty });
  }

  return { ok: true, order_no: on, doc_no: order.doc_no, lines, negatives: lines.filter((l) => l.balance < 0), skipped };
}

export type IssueItemPreview = {
  line_no: number; product: string; size: string; qty: number; unit: string;
  is_free: boolean; sku: string | null; spec: string | null; stock: number; tracked: boolean;
  grade: string | null; is_bag: boolean; ctw_barcode: string | null;
};
export type IssueLookup = {
  ok: boolean; error?: string; alreadyIssued?: boolean;
  order_no?: string; doc_no?: string | null; note?: string | null; items?: IssueItemPreview[];
};

/** สแกน/กรอก Order No. → ดึงรายการทั้งหมดของใบเบิกมาให้ตรวจ (ยังไม่ตัดสต๊อก). */
export async function lookupOrderForIssue(orderNo: string): Promise<IssueLookup> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "กรุณาเข้าสู่ระบบ" };
  if (!can.issueStock(user.role)) return { ok: false, error: "ไม่มีสิทธิ์ตัดสต๊อก (เฉพาะฝ่ายจัดของ)" };
  const on = (orderNo || "").trim();
  if (!on) return { ok: false, error: "กรอก/สแกน Order No." };

  const [order] = await q<{ order_no: string; doc_no: string | null; note: string | null; deleted_at: string | null; stock_issued_at: string | null }>(
    `select order_no, doc_no, note, deleted_at, stock_issued_at from orders where order_no = $1`, [on]);
  if (!order) return { ok: false, error: `ไม่พบใบเบิก Order No. ${on}` };
  if (order.deleted_at) return { ok: false, error: "ใบเบิกนี้อยู่ในถังขยะ" };
  if (order.stock_issued_at) return { ok: false, alreadyIssued: true, order_no: on, doc_no: order.doc_no, error: "ใบเบิกนี้ตัดสต๊อกไปแล้ว" };

  const items = await q<{ line_no: number; product: string; size: string; qty: number; unit: string; is_free: boolean; sku: string | null; spec: string | null; grade: string | null }>(
    `select line_no, product, size, qty::float8 as qty, unit, is_free, sku, spec,
            (select p.ptype from products p where lower(btrim(p.name)) = lower(btrim(order_items.product)) limit 1) as grade
     from order_items where order_no = $1 and coalesce(product,'') <> '' order by line_no`, [on]);
  if (items.length === 0) return { ok: false, error: "ใบเบิกไม่มีรายการสินค้า" };

  const rules = await getActiveSpecRules();
  const bcMap = await getScentBarcodes();  // ทนทาน: คืน {} ถ้าตาราง product_barcodes ยังไม่มี
  const withStock: IssueItemPreview[] = [];
  for (const it of items) {
    // ยอดคงเหลือที่โชว์ต้องมาจาก SKU แถวเดียวกับที่จะตัดจริง (normalize ชื่อ+ขนาดเหมือน matchStockSku)
    const [s] = await q<{ qty: number }>(
      `select qty::float8 as qty from stock where ${SKU_MATCH} ${SKU_TIEBREAK}`,
      [it.product, it.size || ""]);
    const bag = isBagProduct(it.product);
    // เลือกสเป็กอัตโนมัติ: ใช้ค่าที่เคยกรอกไว้ก่อน ถ้าไม่มีค่อยเดาจากกฎ (เฉพาะสินค้าที่ไม่ใช่ถุง)
    const spec = it.spec || (bag ? "" : pickAutoSpec(it.size, it.grade, rules));
    // บาร์โค้ด CTW ที่ตรงกับ (กลิ่น + ขนาด) — match ใน JS
    const szKey = normSize(it.size);
    const ctw_barcode = (bcMap[it.product.toLowerCase().replace(/[^a-z0-9ก-๙]/g, "")] || []).find((b) => normSize(b.size) === szKey)?.barcode ?? null;
    withStock.push({ ...it, spec, stock: s?.qty ?? 0, tracked: isStockTracked(it.size), is_bag: bag, ctw_barcode });
  }
  return { ok: true, order_no: on, doc_no: order.doc_no, note: order.note, items: withStock };
}

/** บันทึก SKU + Spec ที่พนักงานสแกน/กรอก แล้วตัดสต๊อก (ยืนยัน). */
export async function confirmIssueByOrder(
  orderNo: string,
  entries: { line_no: number; sku?: string | null; spec?: string | null }[],
): Promise<IssueResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "กรุณาเข้าสู่ระบบ" };
  if (!can.issueStock(user.role)) return { ok: false, error: "ไม่มีสิทธิ์ตัดสต๊อก (เฉพาะฝ่ายจัดของ)" };
  const on = (orderNo || "").trim();
  if (!on) return { ok: false, error: "กรอก/สแกน Order No." };
  try {
    // บันทึก SKU/Spec แล้วตัดสต๊อก ใน tx เดียว → ถ้าตัดล้มเหลว SKU/Spec ก็ไม่ถูกบันทึกค้าง
    const out = await tx<IssueResult>(async (run) => {
      for (const e of entries) {
        await run(`update order_items set sku = $2, spec = $3 where order_no = $1 and line_no = $4`,
          [on, (e.sku || "").trim() || null, (e.spec || "").trim() || null, e.line_no]);
      }
      return runIssue(run, on, user.id);
    });
    // ผูก SKU รายชิ้น → order (best-effort, ไม่ทำให้การตัดล้มถ้าตาราง stock_unit ยังไม่มี)
    if (out.ok) {
      try {
        for (const e of entries) {
          const sku = (e.sku || "").trim();
          if (sku) await q(`update stock_unit set status = 'issued', order_no = $1, issued_at = now(), issued_by = $2 where btrim(sku) = $3 and status = 'in_stock'`, [on, user.id, sku]);
        }
      } catch { /* stock_unit ยังไม่พร้อม — ข้าม (traceability เสริม) */ }
    }
    if (out.ok) await logActivity("stock.issue", `${on}${out.doc_no ? " · " + out.doc_no : ""}`);
    revalidatePath("/stock");
    revalidatePath("/stock/moves");
    revalidatePath("/stock/units");
    return out;
  } catch (e: any) {
    return { ok: false, error: e?.message || "ตัดสต๊อกไม่สำเร็จ" };
  }
}

/** ยกเลิกการตัดสต๊อก (คืนสต๊อก + เคลียร์ flag)
 *  admin = ใบไหนก็ได้ · picker = เฉพาะใบที่ตัวเองตัด และภายใน 24 ชม. */
export async function reverseIssue(orderNo: string): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "กรุณาเข้าสู่ระบบ" };
  if (!can.issueStock(user.role)) return { ok: false, error: "ไม่มีสิทธิ์ยกเลิกการตัดสต๊อก" };
  const isAdmin = user.role === "admin";
  const on = (orderNo || "").trim();
  try {
    await tx(async (run) => {
      const [o] = await run<{ stock_issued_at: string | null; stock_issued_by: number | null; recent: boolean }>(
        `select stock_issued_at, stock_issued_by,
                (stock_issued_at > now() - interval '24 hours') as recent
         from orders where order_no = $1`, [on]);
      if (!o?.stock_issued_at) throw new Error("ใบเบิกนี้ยังไม่ได้ตัดสต๊อก");
      if (!isAdmin) {
        if (o.stock_issued_by !== user.id) throw new Error("ยกเลิกได้เฉพาะใบที่คุณตัดเอง (ใบอื่นให้แอดมิน)");
        if (!o.recent) throw new Error("เกิน 24 ชม. แล้ว — ให้แอดมินยกเลิกให้");
      }
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
    // คืนสถานะ SKU รายชิ้นกลับเป็น in_stock (best-effort — stock_unit อาจยังไม่มีบน prod)
    try {
      await q(`update stock_unit set status = 'in_stock', order_no = null, issued_at = null, issued_by = null
               where order_no = $1 and status = 'issued'`, [on]);
    } catch { /* stock_unit ยังไม่พร้อม — ข้าม */ }
    await logActivity("stock.reverse", on);
    revalidatePath("/stock"); revalidatePath("/stock/moves"); revalidatePath("/stock/units");
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "ยกเลิกไม่สำเร็จ" };
  }
}

/** รับสินค้าเข้าสต๊อก (+qty) */
/** สแกน/กรอก SKU (บาร์โค้ด) → หากลิ่น+ขนาดจาก product_barcodes (map ชื่อเข้ากับ master) */
export async function resolveSku(sku: string): Promise<{ ok: boolean; product?: string; size?: string; grade?: string | null; error?: string }> {
  const gate = await requireStockEdit();
  if ("error" in gate) return { ok: false, error: gate.error };
  const s = (sku || "").trim();
  if (!s) return { ok: false, error: "สแกน/กรอก SKU" };
  try {
    const [b] = await q<{ scent: string; size: string; grade: string | null }>(
      `select scent, size, grade from product_barcodes where btrim(barcode) = $1 limit 1`, [s]);
    if (!b) return { ok: false, error: `ไม่พบ SKU ${s} ในระบบ` };
    // map ชื่อกลิ่นให้ตรงกับ products master (normalize) เพื่อให้ยอดสต๊อกลงแถวเดียวกัน
    const [p] = await q<{ name: string }>(
      `select name from products where regexp_replace(lower(btrim(name)),'[^a-z0-9ก-๙]','','g') = regexp_replace(lower(btrim($1)),'[^a-z0-9ก-๙]','','g') limit 1`, [b.scent]);
    return { ok: true, product: p?.name ?? b.scent, size: b.size, grade: b.grade };
  } catch { return { ok: false, error: "ค้นหา SKU ไม่สำเร็จ (ตาราง product_barcodes ยังไม่พร้อม?)" }; }
}

export async function receiveStock(product: string, size: string, qty: number, note?: string, sku?: string): Promise<{ ok: boolean; error?: string; balance?: number }> {
  const gate = await requireStockEdit();
  if ("error" in gate) return { ok: false, error: gate.error };
  const user = gate.user;
  if (!product?.trim() || !size?.trim()) return { ok: false, error: "เลือกสินค้า + ขนาด" };
  const amt = Number(qty);
  if (!(amt > 0)) return { ok: false, error: "จำนวนต้องมากกว่า 0" };
  try {
    const balance = await tx<number>(async (run) => {
      const m = await matchStockSku(run, product.trim(), size.trim());   // normalize ให้ตรงแถวสต๊อกเดิม
      const [row] = await run<{ qty: number }>(
        `insert into stock (product, size, qty, updated_at) values ($1,$2,$3,now())
         on conflict (product, size) do update set qty = stock.qty + $3, updated_at = now()
         returning qty::float8 as qty`, [m.product, m.size, amt]);
      await run(`insert into stock_moves (product, size, qty_change, balance, reason, note, sku, created_by)
                 values ($1,$2,$3,$4,'receive',$5,$6,$7)`, [m.product, m.size, amt, row.qty, note || null, (sku || "").trim() || null, user.id]);
      return row.qty;
    });
    await logActivity("stock.receive", `${product.trim()} ${size.trim()} +${amt}`);
    revalidatePath("/stock"); revalidatePath("/stock/moves");
    return { ok: true, balance };
  } catch (e: any) {
    return { ok: false, error: e?.message || "รับเข้าไม่สำเร็จ" };
  }
}

/** รับเข้ารายชิ้น: user ใส่/สแกน SKU เอง (ไม่ gen) — 1 SKU = 1 ชิ้น, กันซ้ำ */
export async function receiveUnits(product: string, size: string, skus: string[], barcode?: string): Promise<{ ok: boolean; error?: string; added?: number; balance?: number; skus?: string[]; dupes?: string[] }> {
  const gate = await requireStockEdit();
  if ("error" in gate) return { ok: false, error: gate.error };
  const user = gate.user;
  const p = (product || "").trim(), sz = (size || "").trim();
  const list = [...new Set((skus || []).map((s) => s.trim()).filter(Boolean))];
  if (!p || !sz) return { ok: false, error: "เลือกสินค้า + ขนาด" };
  if (!list.length) return { ok: false, error: "สแกน/ใส่ SKU อย่างน้อย 1 ชิ้น" };
  if (list.length > 500) return { ok: false, error: "รับเข้าครั้งละไม่เกิน 500 ชิ้น" };
  try {
    const out = await tx<{ added: number; balance: number; dupes: string[] }>(async (run) => {
      const [pr] = await run<{ ptype: string | null }>(`select ptype from products where lower(btrim(name)) = lower(btrim($1)) limit 1`, [p]);
      const grade = pr?.ptype || null, bc = (barcode || "").trim() || null;
      const dupes: string[] = []; let added = 0;
      for (const sku of list) {
        const [ex] = await run<{ x: number }>(`select 1 as x from stock_unit where btrim(sku) = $1 limit 1`, [sku]);
        if (ex) { dupes.push(sku); continue; }
        await run(`insert into stock_unit (sku, product, size, grade, barcode, received_by) values ($1,$2,$3,$4,$5,$6)`,
          [sku, p, sz, grade, bc, user.id]);
        added++;
      }
      if (added === 0) throw new Error("SKU ที่ใส่มีอยู่ในระบบแล้วทั้งหมด");
      const m = await matchStockSku(run, p, sz);
      const [row] = await run<{ qty: number }>(
        `insert into stock (product, size, qty, updated_at) values ($1,$2,$3,now())
         on conflict (product, size) do update set qty = stock.qty + $3, updated_at = now()
         returning qty::float8 as qty`, [m.product, m.size, added]);
      await run(`insert into stock_moves (product, size, qty_change, balance, reason, note, created_by)
                 values ($1,$2,$3,$4,'receive',$5,$6)`, [m.product, m.size, added, row.qty, `รับเข้า ${added} SKU`, user.id]);
      return { added, balance: row.qty, dupes };
    });
    await logActivity("stock.receive", `${product.trim()} ${size.trim()} +${out.added} SKU`);
    revalidatePath("/stock"); revalidatePath("/stock/moves"); revalidatePath("/stock/units");
    return { ok: true, ...out, skus: list };
  } catch (e: any) { return { ok: false, error: e?.message || "รับเข้าไม่สำเร็จ" }; }
}

/** รับเข้าหลายกลิ่น/ขนาดพร้อมกัน (ตะกร้า) — tx เดียว, กัน SKU ซ้ำข้ามทุกบรรทัด */
export async function receiveUnitsBatch(
  lines: { product: string; size: string; skus: string[]; barcode?: string }[],
): Promise<{ ok: boolean; error?: string; added?: number; dupes?: string[]; perLine?: { product: string; size: string; added: number; balance: number }[] }> {
  const gate = await requireStockEdit();
  if ("error" in gate) return { ok: false, error: gate.error };
  const user = gate.user;
  const norm = (lines || [])
    .map((l) => ({
      product: (l.product || "").trim(), size: (l.size || "").trim(),
      barcode: (l.barcode || "").trim() || null,
      skus: [...new Set((l.skus || []).map((s) => s.trim()).filter(Boolean))],
    }))
    .filter((l) => l.product && l.size && l.skus.length);
  if (!norm.length) return { ok: false, error: "ไม่มีรายการที่จะรับเข้า" };
  const total = norm.reduce((n, l) => n + l.skus.length, 0);
  if (total > 1000) return { ok: false, error: "รับเข้าครั้งละไม่เกิน 1000 ชิ้น" };
  try {
    const out = await tx<{ added: number; dupes: string[]; perLine: { product: string; size: string; added: number; balance: number }[] }>(async (run) => {
      const seen = new Set<string>();   // กันซ้ำข้ามทุกบรรทัดในชุดเดียวกัน
      const dupes: string[] = [];
      const perLine: { product: string; size: string; added: number; balance: number }[] = [];
      for (const l of norm) {
        const [pr] = await run<{ ptype: string | null }>(`select ptype from products where lower(btrim(name)) = lower(btrim($1)) limit 1`, [l.product]);
        const grade = pr?.ptype || null;
        let added = 0;
        for (const sku of l.skus) {
          if (seen.has(sku)) { dupes.push(sku); continue; }
          seen.add(sku);
          const [ex] = await run<{ x: number }>(`select 1 as x from stock_unit where btrim(sku) = $1 limit 1`, [sku]);
          if (ex) { dupes.push(sku); continue; }
          await run(`insert into stock_unit (sku, product, size, grade, barcode, received_by) values ($1,$2,$3,$4,$5,$6)`,
            [sku, l.product, l.size, grade, l.barcode, user.id]);
          added++;
        }
        let balance = 0;
        if (added > 0) {
          const m = await matchStockSku(run, l.product, l.size);
          const [row] = await run<{ qty: number }>(
            `insert into stock (product, size, qty, updated_at) values ($1,$2,$3,now())
             on conflict (product, size) do update set qty = stock.qty + $3, updated_at = now()
             returning qty::float8 as qty`, [m.product, m.size, added]);
          balance = row.qty;
          await run(`insert into stock_moves (product, size, qty_change, balance, reason, note, created_by)
                     values ($1,$2,$3,$4,'receive',$5,$6)`, [m.product, m.size, added, balance, `รับเข้า ${added} SKU`, user.id]);
        }
        perLine.push({ product: l.product, size: l.size, added, balance });
      }
      const totalAdded = perLine.reduce((n, p) => n + p.added, 0);
      if (totalAdded === 0) throw new Error("SKU ที่ใส่มีอยู่ในระบบแล้วทั้งหมด");
      return { added: totalAdded, dupes, perLine };
    });
    await logActivity("stock.receive", `รวม ${out.added} SKU (${out.perLine.length} รายการ)`);
    revalidatePath("/stock"); revalidatePath("/stock/moves"); revalidatePath("/stock/units");
    return { ok: true, ...out };
  } catch (e: any) { return { ok: false, error: e?.message || "รับเข้าไม่สำเร็จ" }; }
}

/** ผูก SKU กับสต๊อกที่มีอยู่แล้ว (reconcile) — สร้าง stock_unit โดย "ไม่เพิ่มยอดรวม"
 *  ใช้กับของที่รับเข้าแบบยอดรวม/ปรับมือ ที่ยังไม่มีเลขรายชิ้น เพื่อให้จำนวน SKU ตรงยอด */
export async function assignUnitSkus(product: string, size: string, skus: string[]): Promise<{ ok: boolean; error?: string; added?: number; dupes?: string[] }> {
  const gate = await requireStockEdit();
  if ("error" in gate) return { ok: false, error: gate.error };
  const user = gate.user;
  const p = (product || "").trim(), sz = (size || "").trim();
  const list = [...new Set((skus || []).map((s) => s.trim()).filter(Boolean))];
  if (!p || !sz) return { ok: false, error: "ไม่พบสินค้า/ขนาด" };
  if (!list.length) return { ok: false, error: "กรอก SKU อย่างน้อย 1 ชิ้น" };
  // กันผูกเกินยอด — ผูกได้ไม่เกิน gap (จำนวนที่ยังไม่มี SKU)
  const g = await stockGapFor(p, sz);
  if (g.gap <= 0) return { ok: false, error: `ยอด SKU ครบแล้ว (มี SKU ${g.units} = ยอด ${g.qty})` };
  if (list.length > g.gap) list.length = g.gap;   // ตัดส่วนเกินทิ้ง ผูกแค่พอดี gap
  // เกรด + บาร์โค้ด (นอก tx กันพังถ้า product_barcodes ยังไม่มีบน prod)
  let grade: string | null = null, barcode: string | null = null;
  try { const [pr] = await q<{ ptype: string | null }>(`select ptype from products where lower(btrim(name)) = lower(btrim($1)) limit 1`, [p]); grade = pr?.ptype ?? null; } catch { /* ไม่มี */ }
  try {
    const [b] = await q<{ barcode: string }>(
      `select barcode from product_barcodes
        where regexp_replace(lower(btrim(scent)),'[^a-z0-9ก-๙]','','g') = regexp_replace(lower(btrim($1)),'[^a-z0-9ก-๙]','','g')
          and btrim(lower(size),' .') = btrim(lower($2),' .') limit 1`, [p, sz]);
    barcode = b?.barcode ?? null;
  } catch { /* ไม่มี */ }
  try {
    const out = await tx<{ added: number; dupes: string[] }>(async (run) => {
      const dupes: string[] = []; let added = 0;
      for (const sku of list) {
        const [ex] = await run<{ x: number }>(`select 1 as x from stock_unit where btrim(sku) = $1 limit 1`, [sku]);
        if (ex) { dupes.push(sku); continue; }
        await run(`insert into stock_unit (sku, product, size, grade, barcode, received_by, status) values ($1,$2,$3,$4,$5,$6,'in_stock')`,
          [sku, p, sz, grade, barcode, user.id]);   // ไม่แตะ stock (ยอดรวมนับไว้แล้ว)
        added++;
      }
      if (added === 0) throw new Error("SKU ที่ใส่มีอยู่ในระบบแล้วทั้งหมด");
      return { added, dupes };
    });
    revalidatePath("/stock/units"); revalidatePath("/stock");
    return { ok: true, ...out };
  } catch (e: any) { return { ok: false, error: e?.message || "ผูก SKU ไม่สำเร็จ" }; }
}

/** แก้ SKU รายชิ้น (แก้เลขที่พิมพ์ผิด) */
export async function updateUnitSku(oldSku: string, newSku: string): Promise<{ ok: boolean; error?: string }> {
  const gate = await requireStockEdit();
  if ("error" in gate) return { ok: false, error: gate.error };
  const o = (oldSku || "").trim(), n = (newSku || "").trim();
  if (!n) return { ok: false, error: "กรอก SKU" };
  if (o === n) return { ok: true };
  try {
    const [dup] = await q(`select 1 from stock_unit where btrim(sku) = $1`, [n]);
    if (dup) return { ok: false, error: "SKU นี้มีอยู่แล้ว" };
    await q(`update stock_unit set sku = $2 where btrim(sku) = $1`, [o, n]);
    revalidatePath("/stock/units");
    return { ok: true };
  } catch (e: any) { return { ok: false, error: e?.message || "แก้ไขไม่สำเร็จ" }; }
}

/** ลบ SKU รายชิ้น — ถ้าอยู่คลังจะหักยอดรวม -1 ด้วย */
export async function deleteUnit(sku: string): Promise<{ ok: boolean; error?: string }> {
  const gate = await requireStockEdit();
  if ("error" in gate) return { ok: false, error: gate.error };
  const user = gate.user;
  const s = (sku || "").trim();
  if (!s) return { ok: false, error: "ไม่พบ SKU" };
  try {
    await tx(async (run) => {
      const [u] = await run<{ product: string; size: string; status: string }>(`select product, size, status from stock_unit where btrim(sku) = $1`, [s]);
      if (!u) throw new Error("ไม่พบ SKU นี้");
      await run(`delete from stock_unit where btrim(sku) = $1`, [s]);
      if (u.status === "in_stock") {
        const m = await matchStockSku(run, u.product, u.size);
        const [row] = await run<{ qty: number }>(
          `update stock set qty = qty - 1, updated_at = now() where product = $1 and size = $2 returning qty::float8 as qty`, [m.product, m.size]);
        if (row) await run(`insert into stock_moves (product, size, qty_change, balance, reason, note, sku, created_by) values ($1,$2,-1,$3,'adjust',$4,$5,$6)`,
          [m.product, m.size, row.qty, `ลบ SKU`, s, user.id]);
      }
    });
    revalidatePath("/stock/units"); revalidatePath("/stock");
    return { ok: true };
  } catch (e: any) { return { ok: false, error: e?.message || "ลบไม่สำเร็จ" }; }
}

/** ปรับยอดสต๊อกเป็นค่าที่นับได้ (set) — บันทึกส่วนต่างเป็น movement */
export async function adjustStock(product: string, size: string, newQty: number, note?: string): Promise<{ ok: boolean; error?: string }> {
  const gate = await requireStockEdit();
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
    await logActivity("stock.adjust", `${product.trim()} ${size.trim()} → ${target}`);
    revalidatePath("/stock"); revalidatePath("/stock/moves");
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "ปรับยอดไม่สำเร็จ" };
  }
}
