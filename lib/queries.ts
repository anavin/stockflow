import "server-only";
import { q } from "./db";
import type { Order, OrderItem, OrderRow, OrderWithItems } from "./types";

/** PGlite returns `date`/`timestamptz` columns as JS Date objects while pg (with
 * our type parsers) returns strings. Normalize date-only fields to "YYYY-MM-DD"
 * strings so the UI + PDF are driver-agnostic. */
function dstr(v: any): string | null {
  if (v == null || v === "") return null;
  if (v instanceof Date) {
    const y = v.getFullYear(), m = String(v.getMonth() + 1).padStart(2, "0"), d = String(v.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return String(v).slice(0, 10);
}
function normOrder<T extends Partial<Order>>(o: T): T {
  return { ...o, doc_date: dstr(o.doc_date), order_date: dstr(o.order_date) };
}

// ---- reference data (for dropdowns) ---------------------------------------
export async function getProducts(): Promise<string[]> {
  const rows = await q<{ name: string }>(`select name from products where active order by sort, name`);
  return rows.map((r) => r.name);
}

/** map ชื่อกลิ่น → รหัส (เฉพาะกลิ่นที่มีรหัส) — ใช้โชว์/ค้นหาในช่องเลือกกลิ่น */
export async function getProductCodes(): Promise<Record<string, string>> {
  const rows = await q<{ name: string; code: string | null }>(
    `select name, code from products where active and coalesce(code,'') <> ''`);
  const m: Record<string, string> = {};
  for (const r of rows) if (r.code) m[r.name] = r.code;
  return m;
}

/** map ชื่อกลิ่น → ประเภทน้ำหอม (โชว์ในฟอร์ม/ใบพิมพ์) */
export async function getProductTypes(): Promise<Record<string, string>> {
  const rows = await q<{ name: string; ptype: string | null }>(
    `select name, ptype from products where active and coalesce(ptype,'') <> ''`);
  const m: Record<string, string> = {};
  for (const r of rows) if (r.ptype) m[r.name] = r.ptype;
  return m;
}

export type ProductAdminRow = { id: number; name: string; code: string | null; barcode: string | null; ptype: string | null; active: boolean; sort: number; used: number };
/** รายชื่อกลิ่นทั้งหมด (รวมที่ปิดไว้) + รหัส + บาร์โค้ด + ประเภท + จำนวนบรรทัดใบเบิกที่ใช้ชื่อนี้ — สำหรับหน้าจัดการ */
export async function listProductsAdmin(): Promise<ProductAdminRow[]> {
  return q<ProductAdminRow>(
    `select p.id, p.name, p.code, p.barcode, p.ptype, p.active, p.sort,
            (select count(*)::int from order_items i where i.product = p.name) as used
     from products p order by p.active desc, p.sort, p.name`,
  );
}

export type ScentBarcode = { id: number; size: string; barcode: string; sku: string | null; grade: string | null };
/** ขนาด+บาร์โค้ด (Barcode จาก CTW + ที่ user เพิ่มเอง) ต่อกลิ่น — คีย์ = ชื่อกลิ่น lower/trim; เรียงขนาดเล็ก→ใหญ่ */
export async function getScentBarcodes(): Promise<Record<string, ScentBarcode[]>> {
  let rows: (ScentBarcode & { scent: string })[] = [];
  try {
    rows = await q<ScentBarcode & { scent: string }>(
      `select id, scent, size, barcode, sku, grade,
              coalesce(nullif(regexp_replace(size, '[^0-9.]', '', 'g'), '')::numeric, 0) as ml
         from product_barcodes order by lower(btrim(scent)), ml`,
    );
  } catch { return {}; }  // ตารางยังไม่ถูกสร้าง (prod ยังไม่รัน SQL)
  const map: Record<string, ScentBarcode[]> = {};
  for (const r of rows) {
    const k = (r.scent || "").toLowerCase().replace(/[^a-z0-9ก-๙]/g, "");   // normalize เต็ม (ตัดเว้นวรรค/อักขระ) กัน "Virgin X" ≠ "VirginX"
    (map[k] ??= []).push({ id: r.id, size: r.size, barcode: r.barcode, sku: r.sku, grade: r.grade });
  }
  return map;
}

export type SpecOption = { label: string; for_bag: boolean };
/** รายการสเป็กที่เปิดใช้ (+ ธงถุงกระดาษ) — สำหรับ dropdown ตอนตัดสต๊อก */
export async function getSpecOptionsForIssue(): Promise<SpecOption[]> {
  try {
    return await q<SpecOption>(`select label, for_bag from spec_options where active order by sort, label`);
  } catch { return []; }  // ตารางยังไม่ถูกสร้าง (prod ยังไม่รัน SQL)
}
export type SpecOptionRow = { id: number; label: string; sort: number; active: boolean; for_bag: boolean };
export async function listSpecOptions(): Promise<SpecOptionRow[]> {
  try {
    return await q<SpecOptionRow>(`select id, label, sort, active, for_bag from spec_options order by sort, label`);
  } catch { return []; }
}

export type SpecRuleRow = { id: number; sizes: string; grades: string; spec: string; sort: number; active: boolean };
/** กฎเลือกสเป็กอัตโนมัติทั้งหมด (สำหรับหน้าจัดการ) */
export async function listSpecRules(): Promise<SpecRuleRow[]> {
  try {
    return await q<SpecRuleRow>(`select id, sizes, grades, spec, sort, active from spec_rules order by sort, id`);
  } catch { return []; }
}
/** กฎที่เปิดใช้ (สำหรับ auto-select ตอนดึงใบเบิก) */
export async function getActiveSpecRules(): Promise<{ sizes: string; grades: string; spec: string }[]> {
  try {
    return await q<{ sizes: string; grades: string; spec: string }>(
      `select sizes, grades, spec from spec_rules where active order by sort, id`);
  } catch { return []; }
}

export type UnitRow = {
  sku: string; product: string; size: string; grade: string | null; barcode: string | null;
  status: string; order_no: string | null; buyer: string | null; receiver: string | null; phone: string | null;
  received_at: string | null; issued_at: string | null;
  source: "unit" | "order";   // unit = รับเข้าผ่าน stock_unit · order = SKU ที่สแกนตอนตัดยอด (order_items)
};

/** SELECT รวม 2 แหล่ง: stock_unit (รับเข้า) + order_items.sku (สแกนตอนตัดยอด, ที่ไม่มีใน stock_unit)
 *  → ค้น SKU ของใบเบิกที่ตัดยอดไปแล้วเจอ แม้จะไม่เคยรับเข้าแบบ SKU */
const UNITS_UNION = `
  select su.sku, su.product, su.size, su.grade, su.barcode, su.status, su.order_no,
         su.received_at, su.issued_at, su.id as ord, 'unit' as source
    from stock_unit su
  union all
  select oi.sku, oi.product, oi.size, p.ptype as grade, null::text as barcode,
         'issued' as status, oi.order_no,
         null::timestamptz as received_at, o.stock_issued_at as issued_at,
         -oi.id as ord, 'order' as source
    from order_items oi
    join orders o on o.order_no = oi.order_no
    left join products p on lower(btrim(p.name)) = lower(btrim(oi.product))
   where coalesce(btrim(oi.sku),'') <> ''
     and o.stock_issued_at is not null
     and o.deleted_at is null
     and not exists (select 1 from stock_unit s where btrim(s.sku) = btrim(oi.sku))`;

/** ติดตาม SKU รายชิ้น — ค้นด้วย SKU/กลิ่น/order + สถานะ; join orders เพื่อรู้ผู้ซื้อ */
export async function listUnits(opts: { search?: string; status?: string; product?: string; size?: string; limit?: number } = {}): Promise<UnitRow[]> {
  const params: any[] = [];
  const where: string[] = [];
  if (opts.search) { params.push(`%${opts.search}%`); const i = params.length; where.push(`(u.sku ilike $${i} or u.product ilike $${i} or coalesce(u.order_no,'') ilike $${i})`); }
  if (opts.product) { params.push(opts.product); where.push(`lower(btrim(u.product)) = lower(btrim($${params.length}))`); }
  if (opts.size) { params.push(opts.size); where.push(`regexp_replace(lower(u.size),'[^0-9a-z]','','g') = regexp_replace(lower($${params.length}),'[^0-9a-z]','','g')`); }
  if (opts.status) { params.push(opts.status); where.push(`u.status = $${params.length}`); }
  const limit = Math.min(opts.limit ?? 500, 2000);
  try {
    return await q<UnitRow>(
      `select u.sku, u.product, u.size, u.grade, u.barcode, u.status, u.order_no,
              o.shop_name as buyer, o.receiver, o.phone, u.received_at, u.issued_at, u.source
       from (${UNITS_UNION}) u left join orders o on o.order_no = u.order_no
       ${where.length ? "where " + where.join(" and ") : ""}
       order by u.ord desc limit ${limit}`, params);
  } catch { return []; }
}
export async function unitCounts(): Promise<{ in_stock: number; issued: number }> {
  try {
    const [r] = await q<{ in_stock: number; issued: number }>(
      `select count(*) filter (where status='in_stock')::int as in_stock,
              count(*) filter (where status='issued')::int as issued
       from (${UNITS_UNION}) u`);
    return { in_stock: r?.in_stock ?? 0, issued: r?.issued ?? 0 };
  } catch { return { in_stock: 0, issued: 0 }; }
}

/** ช่องว่างของสินค้าหนึ่ง (กลิ่น+ขนาด): ยอดรวม vs จำนวน SKU ที่อยู่คลัง → gap = จำนวนที่ยังไม่ผูก SKU */
export async function stockGapFor(product: string, size: string): Promise<{ qty: number; units: number; gap: number }> {
  const M = `regexp_replace(lower(btrim(product)),'[^a-z0-9ก-๙]','','g') = regexp_replace(lower(btrim($1)),'[^a-z0-9ก-๙]','','g')
             and btrim(lower(size),' .') = btrim(lower($2),' .')`;
  try {
    const [r] = await q<{ qty: number; units: number }>(
      `select coalesce((select sum(qty) from stock where ${M}),0)::float8 as qty,
              (select count(*) from stock_unit where ${M} and status='in_stock')::int as units`,
      [product, size]);
    const qty = Number(r?.qty ?? 0), units = Number(r?.units ?? 0);
    return { qty, units, gap: qty - units };
  } catch { return { qty: 0, units: 0, gap: 0 }; }
}

// ---- ข้อมูล อย. (FDA registration) + แจ้งเตือนใกล้หมดอายุ ----
export type FdaRow = {
  id: number; seq: number | null; product: string; grade: string | null; reg_no: string | null;
  issue_date: string | null; expiry_date: string | null; fda_status: string | null; prod_status: string | null;
  name_en: string | null; name_th: string | null; brand: string | null; days_left: number | null;
  renewal_count?: number; last_renewed?: string | null;
};
export async function listFda(): Promise<FdaRow[]> {
  const sel = `select id, seq, product, grade, reg_no, issue_date, expiry_date, fda_status, prod_status,
              name_en, name_th, brand,
              case when expiry_date is null then null else (expiry_date - current_date)::int end as days_left`;
  const ord = `order by expiry_date asc nulls last, seq nulls last, product`;
  try {
    // รวมจำนวนครั้งที่ต่ออายุ (ถ้ามีตาราง fda_renewals)
    return await q<FdaRow>(
      `${sel},
        (select count(*)::int from fda_renewals rn where rn.fda_id = f.id) as renewal_count,
        (select max(renewed_at) from fda_renewals rn where rn.fda_id = f.id) as last_renewed
       from fda_registrations f ${ord}`);
  } catch {
    try { return await q<FdaRow>(`${sel}, 0 as renewal_count, null as last_renewed from fda_registrations ${ord}`); }
    catch { return []; }
  }
}
export type FdaExpirySummary = { expired: number; d10: number; d15: number; d30: number; total: number };
/** สรุปแจ้งเตือนหมดอายุ อย. — แบ่ง tier: หมดอายุแล้ว / ≤10 / 11–15 / 16–30 วัน (ไม่ซ้ำกัน) */
export async function fdaExpirySummary(): Promise<FdaExpirySummary> {
  try {
    const [r] = await q<FdaExpirySummary>(
      `select
         count(*) filter (where expiry_date is not null and expiry_date < current_date)::int as expired,
         count(*) filter (where (expiry_date - current_date) between 0 and 10)::int as d10,
         count(*) filter (where (expiry_date - current_date) between 11 and 15)::int as d15,
         count(*) filter (where (expiry_date - current_date) between 16 and 30)::int as d30,
         count(*)::int as total
       from fda_registrations`);
    return r ?? { expired: 0, d10: 0, d15: 0, d30: 0, total: 0 };
  } catch { return { expired: 0, d10: 0, d15: 0, d30: 0, total: 0 }; }
}

export type UnitMismatch = { product: string; size: string; units: number; qty: number };
/** ตรวจความตรง: (กลิ่น,ขนาด) ที่มี SKU รายชิ้น (in_stock) แต่จำนวนไม่ตรงยอดรวม
 *  — normalize ชื่อ+ขนาดแบบเดียวกับ matchStockSku; เฉพาะที่มี unit เท่านั้น (ไม่เตือนสินค้าที่ไม่ได้ใช้ SKU) */
export async function stockUnitMismatches(): Promise<UnitMismatch[]> {
  try {
    return await q<UnitMismatch>(
      `with u as (
         select regexp_replace(lower(btrim(product)),'[^a-z0-9ก-๙]','','g') as pk, btrim(lower(size),' .') as sk,
                max(product) as product, max(size) as size, count(*)::int as units
         from stock_unit where status='in_stock' group by 1,2),
       s as (
         select regexp_replace(lower(btrim(product)),'[^a-z0-9ก-๙]','','g') as pk, btrim(lower(size),' .') as sk,
                sum(qty)::float8 as qty from stock group by 1,2)
       select u.product, u.size, u.units, coalesce(s.qty,0)::float8 as qty
       from u left join s on s.pk=u.pk and s.sk=u.sk
       where u.units <> coalesce(s.qty,0)
       order by u.product, u.size`);
  } catch { return []; }
}

/** SKU (Barcode) ต่อ (กลิ่น+ขนาด) — คีย์ = normalize(scent)|normalize(size) → barcode */
export async function getSkuLookup(): Promise<Record<string, string>> {
  const nz = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9ก-๙]/g, "");
  try {
    const rows = await q<{ scent: string; size: string; barcode: string }>(`select scent, size, barcode from product_barcodes`);
    const m: Record<string, string> = {};
    for (const r of rows) m[`${nz(r.scent)}|${nz(r.size)}`] = r.barcode;
    return m;
  } catch { return {}; }
}

/** เลิกผลิตต่อขนาด — คีย์ = ชื่อกลิ่น (normalize), ค่า = ขนาดที่เลิกผลิต (normalize) */
export async function getDiscontinued(): Promise<Record<string, string[]>> {
  const norm = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9ก-๙]/g, "");
  try {
    const rows = await q<{ scent: string; size: string }>(`select scent, size from discontinued_sku`);
    const map: Record<string, string[]> = {};
    for (const r of rows) { (map[norm(r.scent)] ??= []).push(norm(r.size)); }
    return map;
  } catch { return {}; }  // ตารางยังไม่ถูกสร้าง
}

/** ชื่อกลิ่นที่ปิดการขาย (active = false) — คืนเป็น key ที่ normalize แล้ว */
export async function getInactiveScents(): Promise<string[]> {
  try {
    const rows = await q<{ name: string }>(`select name from products where active = false`);
    return rows.map((r) => (r.name || "").toLowerCase().replace(/[^a-z0-9ก-๙]/g, ""));
  } catch { return []; }
}

export type DailyIssue = { day: string; orders: number; issued: number; pending: number };
/** รายวัน: ออร์เดอร์ที่เข้ามา (ตามวันที่ใบเบิก) เทียบกับที่ตัดสต๊อกแล้ว */
export async function dailyIssueStatus(platform = "Shopee", days = 14): Promise<DailyIssue[]> {
  // ใช้ "วันที่สั่งซื้อจริง" (order_date) เป็นหลัก ถ้าไม่มีค่อยใช้วันที่ใบเบิก
  const rows = await q<{ day: string; orders: number; issued: number }>(
    `select to_char(coalesce(order_date, doc_date),'YYYY-MM-DD') as day,
            count(*)::int as orders,
            count(stock_issued_at)::int as issued
     from orders
     where deleted_at is null and platform = $1 and coalesce(order_date, doc_date) is not null
     group by to_char(coalesce(order_date, doc_date),'YYYY-MM-DD')
     order by day desc limit $2`,
    [platform, days],
  );
  return rows.map((r) => ({ day: r.day, orders: Number(r.orders), issued: Number(r.issued), pending: Number(r.orders) - Number(r.issued) }));
}

export async function getSizes(): Promise<string[]> {
  const rows = await q<{ label: string }>(`select label from sizes order by sort, label`);
  return rows.map((r) => r.label);
}

export type PostcodeRow = { province: string; district: string; postcode: string };
export async function getPostcodes(): Promise<PostcodeRow[]> {
  return q<PostcodeRow>(`select province, district, postcode from postcodes order by province, district`);
}

export async function getProvinces(): Promise<string[]> {
  const rows = await q<{ province: string }>(`select distinct province from postcodes order by province`);
  return rows.map((r) => r.province);
}

// ---- orders ----------------------------------------------------------------
export async function listOrders(opts: { platform?: string; search?: string; month?: string; from?: string; to?: string; issued?: "yes" | "no"; limit?: number; offset?: number } = {}): Promise<OrderRow[]> {
  const where: string[] = ["o.deleted_at is null"];
  const params: any[] = [];
  if (opts.platform) { params.push(opts.platform); where.push(`o.platform = $${params.length}`); }
  if (opts.month) { params.push(opts.month); where.push(`o.month_label = $${params.length}`); }
  if (opts.from) { params.push(opts.from); where.push(`coalesce(o.order_date, o.doc_date) >= $${params.length}`); }
  if (opts.to) { params.push(opts.to); where.push(`coalesce(o.order_date, o.doc_date) <= $${params.length}`); }
  if (opts.issued === "yes") where.push(`o.stock_issued_at is not null`);
  else if (opts.issued === "no") where.push(`o.stock_issued_at is null`);
  if (opts.search) {
    params.push(`%${opts.search}%`);
    const p = `$${params.length}`;
    where.push(`(o.order_no ilike ${p} or o.doc_no ilike ${p} or o.receiver ilike ${p} or o.username ilike ${p} or o.shop_name ilike ${p} or o.province ilike ${p})`);
  }
  const limit = Math.min(opts.limit ?? 50, 200);
  const offset = Math.max(opts.offset ?? 0, 0);
  const sql = `
    select o.*,
           coalesce(count(i.id), 0)::int as item_count,
           coalesce(sum(i.qty), 0)::float8 as total_qty
    from orders o
    left join order_items i on i.order_no = o.order_no
    ${where.length ? "where " + where.join(" and ") : ""}
    group by o.order_no
    order by o.doc_date desc nulls last, o.created_at desc
    limit ${limit} offset ${offset}`;
  const rows = await q<OrderRow>(sql, params);
  return rows.map(normOrder);
}

export async function countOrders(opts: { platform?: string; search?: string; month?: string; from?: string; to?: string; issued?: "yes" | "no" } = {}): Promise<number> {
  const where: string[] = ["deleted_at is null"];
  const params: any[] = [];
  if (opts.platform) { params.push(opts.platform); where.push(`platform = $${params.length}`); }
  if (opts.month) { params.push(opts.month); where.push(`month_label = $${params.length}`); }
  if (opts.from) { params.push(opts.from); where.push(`coalesce(order_date, doc_date) >= $${params.length}`); }
  if (opts.to) { params.push(opts.to); where.push(`coalesce(order_date, doc_date) <= $${params.length}`); }
  if (opts.issued === "yes") where.push(`stock_issued_at is not null`);
  else if (opts.issued === "no") where.push(`stock_issued_at is null`);
  if (opts.search) {
    params.push(`%${opts.search}%`);
    const p = `$${params.length}`;
    // ต้องตรงกับ listOrders เป๊ะ (รวม province) ไม่งั้น total/หน้าเพจเพี้ยน
    where.push(`(order_no ilike ${p} or doc_no ilike ${p} or receiver ilike ${p} or username ilike ${p} or shop_name ilike ${p} or province ilike ${p})`);
  }
  const [r] = await q<{ n: number }>(`select count(*)::int n from orders ${where.length ? "where " + where.join(" and ") : ""}`, params);
  return r?.n ?? 0;
}

export async function listDeletedOrders(platform = "Shopee", limit = 200): Promise<OrderRow[]> {
  const rows = await q<OrderRow>(
    `select o.*, coalesce(count(i.id),0)::int as item_count, coalesce(sum(i.qty),0)::float8 as total_qty
     from orders o left join order_items i on i.order_no = o.order_no
     where o.platform = $1 and o.deleted_at is not null
     group by o.order_no
     order by o.deleted_at desc
     limit ${Math.min(limit, 500)}`,
    [platform],
  );
  return rows.map(normOrder);
}

export async function countDeleted(platform = "Shopee"): Promise<number> {
  const [r] = await q<{ n: number }>(`select count(*)::int n from orders where platform = $1 and deleted_at is not null`, [platform]);
  return r?.n ?? 0;
}

export async function getOrder(orderNo: string, opts: { includeDeleted?: boolean } = {}): Promise<OrderWithItems | null> {
  const [order] = await q<Order>(
    `select * from orders where order_no = $1 ${opts.includeDeleted ? "" : "and deleted_at is null"}`,
    [orderNo],
  );
  if (!order) return null;
  const items = await q<OrderItem>(
    `select id, line_no, product, size, is_free, qty::float8 as qty, unit, product_label, sku,
            (select p.ptype from products p where p.name = order_items.product limit 1) as ptype
     from order_items where order_no = $1 order by line_no, id`,
    [orderNo],
  );
  return { ...normOrder(order), items };
}

// ---- stock -----------------------------------------------------------------
export type StockRow = { product: string; size: string; qty: number; updated_at: string | null; grade: string | null };
export async function listStock(opts: { search?: string; lowOnly?: boolean; threshold?: number; limit?: number } = {}): Promise<StockRow[]> {
  const params: any[] = [];
  const where: string[] = [];
  if (opts.search) { params.push(`%${opts.search}%`); where.push(`ps.product ilike $${params.length}`); }
  const th = opts.threshold ?? 10;
  const having = opts.lowOnly ? `where coalesce(s.qty,0) <= ${th}` : "";
  const limit = Math.min(opts.limit ?? 1000, 5000);
  // ทุก SKU ที่เคยมี (จาก stock ∪ รายการในใบเบิก) + ยอดปัจจุบัน
  const sql = `
    select ps.product, ps.size, coalesce(s.qty,0)::float8 as qty, s.updated_at,
           (select p.ptype from products p where lower(btrim(p.name)) = lower(btrim(ps.product)) limit 1) as grade
    from (
      select distinct oi.product, oi.size from order_items oi
        join orders o on o.order_no = oi.order_no
        where o.deleted_at is null and coalesce(oi.product,'') <> '' and coalesce(oi.size,'') <> ''
      union
      select product, size from stock
    ) ps
    left join stock s on s.product = ps.product and s.size = ps.size
    ${where.length ? "where " + where.join(" and ") : ""}
    ${opts.lowOnly ? (where.length ? `and s.qty is not null and s.qty <= ${th}` : `where s.qty is not null and s.qty <= ${th}`) : ""}
    order by coalesce(s.qty,0) asc, ps.product, ps.size
    limit ${limit}`;
  return q<StockRow>(sql, params);
}

export type StockMoveRow = { id: number; product: string; size: string; qty_change: number; balance: number | null; reason: string; order_no: string | null; note: string | null; created_at: string; by_name: string | null };
export async function getStockMoves(opts: { orderNo?: string; product?: string; size?: string; limit?: number } = {}): Promise<StockMoveRow[]> {
  const params: any[] = [];
  const where: string[] = [];
  if (opts.orderNo) { params.push(opts.orderNo); where.push(`m.order_no = $${params.length}`); }
  if (opts.product) { params.push(opts.product); where.push(`m.product = $${params.length}`); }
  if (opts.size) { params.push(opts.size); where.push(`m.size = $${params.length}`); }
  const limit = Math.min(opts.limit ?? 200, 1000);
  return q<StockMoveRow>(
    `select m.id, m.product, m.size, m.qty_change::float8 as qty_change, m.balance::float8 as balance,
            m.reason, m.order_no, m.note, m.created_at,
            coalesce(nullif(u.full_name,''), u.username) as by_name
     from stock_moves m left join users u on u.id = m.created_by
     ${where.length ? "where " + where.join(" and ") : ""}
     order by m.created_at desc, m.id desc limit ${limit}`,
    params,
  );
}

/** Order + items with current stock level per item (สำหรับหน้า preview ก่อนตัดสต๊อก). */
export async function getOrderWithStock(orderNo: string): Promise<(OrderWithItems & { stock_issued_at: string | null; itemsStock: (OrderItem & { stock: number })[] }) | null> {
  const order = await getOrder(orderNo);
  if (!order) return null;
  const [meta] = await q<{ stock_issued_at: string | null }>(`select stock_issued_at from orders where order_no = $1`, [orderNo]);
  const itemsStock = await Promise.all(order.items.map(async (it) => {
    // จับคู่แบบ normalize (keep อักษรไทย) ให้ตรงกับตอนตัดสต๊อกจริง (matchStockProduct)
    // ไม่งั้น preview โชว์ 0 ทั้งที่ตัดจริงไปเจอ SKU ที่สะกดต่างเล็กน้อย
    const [s] = await q<{ qty: number }>(
      `select qty::float8 as qty from stock
       where size = $2 and regexp_replace(lower(product),'[^a-z0-9ก-๙]','','g') = regexp_replace(lower($1),'[^a-z0-9ก-๙]','','g')
       order by (product = $1) desc limit 1`,
      [it.product, it.size],
    );
    return { ...it, stock: s?.qty ?? 0 };
  }));
  return { ...order, stock_issued_at: meta?.stock_issued_at ?? null, itemsStock };
}

export type IssuedOrderRow = { order_no: string; doc_no: string | null; receiver: string | null; province: string | null; item_count: number; total_qty: number; stock_issued_at: string; issued_by: string | null };
export async function listIssuedOrders(opts: { search?: string; limit?: number } = {}): Promise<IssuedOrderRow[]> {
  const params: any[] = [];
  const where: string[] = ["o.stock_issued_at is not null"];
  if (opts.search) {
    params.push(`%${opts.search}%`);
    const p = `$${params.length}`;
    where.push(`(o.order_no ilike ${p} or o.doc_no ilike ${p} or o.receiver ilike ${p})`);
  }
  const limit = Math.min(opts.limit ?? 100, 500);
  return q<IssuedOrderRow>(
    `select o.order_no, o.doc_no, o.receiver, o.province, o.stock_issued_at,
            coalesce(count(i.id),0)::int as item_count, coalesce(sum(i.qty),0)::float8 as total_qty,
            coalesce(nullif(u.full_name,''), u.username) as issued_by
     from orders o
     left join order_items i on i.order_no = o.order_no
     left join users u on u.id = o.stock_issued_by
     where ${where.join(" and ")}
     group by o.order_no, u.full_name, u.username
     order by o.stock_issued_at desc
     limit ${limit}`,
    params,
  );
}

export type DashStats = {
  ordersTotal: number; ordersToday: number; ordersMonth: number;
  issuedTotal: number; issuedToday: number; pendingIssue: number;
  skus: number; low: number; negative: number;
};
export async function dashboardStats(): Promise<DashStats> {
  // ทำเป็น query เดียว (scalar subqueries) แทน 8 query ขนาน — ลดจำนวน connection
  // ที่เปิดพร้อมกันบน Workers/Hyperdrive (เปิดหลาย connection พร้อมกันเคยทำให้ค้าง).
  // สุขภาพสต๊อก อิงเฉพาะ SKU ที่ track จริง (ตาราง stock): ปกติ(>10)+ต้องเติม(0..10)+ติดลบ(<0)=skus
  const [r] = await q<DashStats & { pendingIssue?: number }>(
    `select
       (select count(*)::int from orders where deleted_at is null) as "ordersTotal",
       (select count(*)::int from orders where deleted_at is null and doc_date = current_date) as "ordersToday",
       (select count(*)::int from orders where deleted_at is null and to_char(doc_date,'YYYY-MM') = to_char(current_date,'YYYY-MM')) as "ordersMonth",
       (select count(*)::int from orders where deleted_at is null and stock_issued_at is not null) as "issuedTotal",
       (select count(*)::int from orders where deleted_at is null and stock_issued_at::date = current_date) as "issuedToday",
       (select count(*)::int from stock) as skus,
       (select count(*)::int from stock where qty >= 0 and qty <= 10) as low,
       (select count(*)::int from stock where qty < 0) as negative`,
  );
  const s = r ?? ({} as DashStats);
  const ordersTotal = s.ordersTotal ?? 0, issuedTotal = s.issuedTotal ?? 0;
  return {
    ordersTotal, ordersToday: s.ordersToday ?? 0, ordersMonth: s.ordersMonth ?? 0,
    issuedTotal, issuedToday: s.issuedToday ?? 0, pendingIssue: ordersTotal - issuedTotal,
    skus: s.skus ?? 0, low: s.low ?? 0, negative: s.negative ?? 0,
  };
}

/** กลิ่นที่เบิกมากสุด (ผลรวมจำนวนจากใบเบิกที่ยังไม่ลบ) — สำหรับกราฟบนหน้าภาพรวม */
export type TopProduct = { product: string; qty: number };
export async function topProducts(limit = 6): Promise<TopProduct[]> {
  const lim = Math.min(Math.max(1, limit), 500);
  return q<TopProduct>(
    `select oi.product, sum(oi.qty)::float8 as qty
     from order_items oi join orders o on o.order_no = oi.order_no
     where o.deleted_at is null and coalesce(oi.product,'') <> ''
     group by oi.product order by qty desc limit ${lim}`,
  );
}

/** จำนวนใบเบิกต่อเดือน (ล่าสุด N เดือน) — สำหรับ mini bar chart หน้าภาพรวม */
export type MonthPoint = { ym: string; label: string; n: number };
export async function ordersTrend(months = 6): Promise<MonthPoint[]> {
  const m = Math.min(Math.max(1, months), 24);
  const rows = await q<{ ym: string; n: number }>(
    `select to_char(date_trunc('month', doc_date),'YYYY-MM') as ym, count(*)::int as n
     from orders where deleted_at is null and doc_date is not null
     group by 1 order by 1 desc limit ${m}`,
  );
  const TH = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  return rows
    .map((r) => {
      const mm = Number((r.ym || "").slice(5, 7));
      const yy = (r.ym || "").slice(2, 4);
      return { ym: r.ym, label: `${TH[mm - 1] ?? r.ym}${yy}`, n: r.n };
    })
    .reverse(); // เก่า→ใหม่ สำหรับวาดกราฟ
}

export async function stockSummary(): Promise<{ skus: number; low: number; issuedOrders: number }> {
  const [a] = await q<{ n: number }>(`select count(*)::int n from (select distinct oi.product, oi.size from order_items oi join orders o on o.order_no=oi.order_no where o.deleted_at is null and coalesce(oi.product,'')<>'' union select product,size from stock) t`);
  const [b] = await q<{ n: number }>(`select count(*)::int n from stock where qty <= 10`);
  const [c] = await q<{ n: number }>(`select count(*)::int n from orders where deleted_at is null and stock_issued_at is not null`);
  return { skus: a?.n ?? 0, low: b?.n ?? 0, issuedOrders: c?.n ?? 0 };
}

export type UserRow = { id: number; username: string; full_name: string; role: string; is_active: boolean; last_login_at: string | null; created_at: string };
export async function listUsers(): Promise<UserRow[]> {
  return q<UserRow>(`select id, username, full_name, role, is_active, last_login_at, created_at from users order by id`);
}

/** Distinct month labels present, newest first (for the filter dropdown). */
export async function getMonths(platform?: string): Promise<string[]> {
  const rows = await q<{ month_label: string; d: string }>(
    `select month_label, max(doc_date) d from orders
     where month_label is not null ${platform ? "and platform = $1" : ""}
     group by month_label order by d desc nulls last`,
    platform ? [platform] : [],
  );
  return rows.map((r) => r.month_label);
}
