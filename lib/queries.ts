import "server-only";
import { unstable_cache } from "next/cache";
import { q } from "./db";
import type { Order, OrderItem, OrderRow, OrderWithItems } from "./types";
import { LABEL_COMPONENTS, gradeToLabelKey, labelSpecFor, bulkRef, labelRef, mnorm } from "./materials";

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

/** ชื่อพ้องกลิ่น (alias) → Record<alias_key(normalize), ชื่อกลิ่นจริง> สำหรับ parser จับกลิ่น */
export async function getScentAliases(): Promise<Record<string, string>> {
  try {
    const rows = await q<{ alias_key: string; product: string }>(`select alias_key, product from scent_aliases`);
    const m: Record<string, string> = {};
    for (const r of rows) m[r.alias_key] = r.product;
    return m;
  } catch { return {}; }
}
export type ScentAliasRow = { id: number; alias_key: string; alias_text: string; product: string };
/** รายการ alias ทั้งหมด (สำหรับหน้าจัดการ) */
export async function listScentAliases(): Promise<ScentAliasRow[]> {
  try { return await q<ScentAliasRow>(`select id, alias_key, alias_text, product from scent_aliases order by product, alias_text`); }
  catch { return []; }
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
            coalesce(u.used, 0)::int as used
     from products p
     left join (select product, count(*)::int as used from order_items group by product) u on u.product = p.name
     order by p.active desc, p.sort, p.name`,
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
  status: string; order_no: string | null; platform: string | null; buyer: string | null; receiver: string | null; phone: string | null;
  received_at: string | null; issued_at: string | null; shipped_at: string | null;
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

type UnitsFilter = { search?: string; status?: string; product?: string; size?: string; platform?: string };
function unitsWhere(opts: UnitsFilter, params: any[]): string {
  const where: string[] = [];
  if (opts.search) { params.push(`%${opts.search}%`); const i = params.length; where.push(`(u.sku ilike $${i} or u.product ilike $${i} or coalesce(u.order_no,'') ilike $${i})`); }
  if (opts.product) { params.push(opts.product); where.push(`lower(btrim(u.product)) = lower(btrim($${params.length}))`); }
  if (opts.size) { params.push(opts.size); where.push(`regexp_replace(lower(u.size),'[^0-9a-z]','','g') = regexp_replace(lower($${params.length}),'[^0-9a-z]','','g')`); }
  if (opts.status) { params.push(opts.status); where.push(`u.status = $${params.length}`); }
  if (opts.platform) { params.push(opts.platform); where.push(`o.platform = $${params.length}`); }
  return where.length ? "where " + where.join(" and ") : "";
}
/** ติดตาม SKU รายชิ้น — ค้นด้วย SKU/กลิ่น/order + สถานะ; join orders เพื่อรู้ผู้ซื้อ · แบ่งหน้า */
export async function listUnits(opts: UnitsFilter & { limit?: number; offset?: number } = {}): Promise<UnitRow[]> {
  const params: any[] = [];
  const where = unitsWhere(opts, params);
  const limit = Math.min(opts.limit ?? 200, 500);
  const offset = Math.max(0, opts.offset ?? 0);
  try {
    return await q<UnitRow>(
      `select u.sku, u.product, u.size, u.grade, u.barcode, u.status, u.order_no, o.platform,
              o.shop_name as buyer, o.receiver, o.phone, u.received_at, u.issued_at, o.shipped_at, u.source
       from (${UNITS_UNION}) u left join orders o on o.order_no = u.order_no
       ${where}
       order by u.ord desc limit ${limit} offset ${offset}`, params);
  } catch { return []; }
}
export async function countUnits(opts: UnitsFilter = {}): Promise<number> {
  const params: any[] = [];
  const where = unitsWhere(opts, params);
  try {
    const [r] = await q<{ n: number }>(
      `select count(*)::int n from (${UNITS_UNION}) u left join orders o on o.order_no = u.order_no ${where}`, params);
    return r?.n ?? 0;
  } catch { return 0; }
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

export type OrderBrief = { order_no: string; doc_no: string | null; platform: string | null; receiver: string | null; province: string | null; stock_issued_at: boolean; shipped_at: string | null; item_count: number };
/** สรุปออเดอร์ (สำหรับหน้าติดตาม SKU: ค้น Order No. ที่ยังไม่มี SKU รายชิ้น → โชว์สถานะตัด/ส่ง) */
export async function getOrderBrief(orderNo: string): Promise<OrderBrief | null> {
  const code = (orderNo || "").trim();
  if (!code) return null;
  try {
    const [o] = await q<OrderBrief>(
      `select o.order_no, o.doc_no, o.platform, coalesce(o.receiver, o.username) as receiver, o.province,
              (o.stock_issued_at is not null) as stock_issued_at,
              to_char(o.shipped_at at time zone 'Asia/Bangkok', 'YYYY-MM-DD') as shipped_at,
              (select count(*)::int from order_items i where i.order_no = o.order_no) as item_count
       from orders o where o.deleted_at is null and upper(btrim(o.order_no)) = upper(btrim($1)) limit 1`, [code]);
    return o ?? null;
  } catch { return null; }
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
/** คีย์ชื่อกลิ่น (normalize) ที่มีทะเบียน อย. — ใช้เตือนกลิ่นที่ยังไม่มีใน อย. · ทนทานถ้าตารางยังไม่มี */
export async function getFdaScentKeys(): Promise<string[]> {
  try {
    const rows = await q<{ k: string }>(
      `select distinct regexp_replace(lower(btrim(product)),'[^a-z0-9ก-๙]','','g') as k
       from fda_registrations where coalesce(product,'') <> ''`);
    return rows.map((r) => r.k).filter(Boolean);
  } catch { return []; }
}

export async function listFda(): Promise<FdaRow[]> {
  const sel = `select id, seq, product, grade, reg_no, issue_date, expiry_date, fda_status, prod_status,
              name_en, name_th, brand,
              case when expiry_date is null then null else (expiry_date - current_date)::int end as days_left`;
  // เรียง 3 ระดับ: ปกติ(0) → เลิกผลิต แต่ อย.คงอยู่(1) → สิ้นอายุ/หมดอายุ(2 ล่างสุดจริง) · ในกลุ่มเรียงใกล้หมดอายุก่อน
  const ord = `order by (case
                          when (fda_status like '%สิ้นอาย%') or (fda_status like '%ยกเลิก%') or (expiry_date is not null and expiry_date < current_date) then 2
                          when prod_status like '%เลิก%' then 1
                          else 0 end) asc,
                        expiry_date asc nulls last, seq nulls last, product`;
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

/** กลิ่นที่เปิดขาย (active) แต่ยังไม่มีสต๊อก/ไม่เคยอยู่ในใบเบิก — ให้โผล่ในหน้าสต๊อกเป็น "ยังไม่มีสต๊อก" */
export async function getScentsWithoutStock(): Promise<{ name: string; grade: string | null }[]> {
  try {
    return await q<{ name: string; grade: string | null }>(`
      with used as (
        select regexp_replace(lower(btrim(product)),'[^a-z0-9ก-๙]','','g') as k from stock
        union
        select regexp_replace(lower(btrim(oi.product)),'[^a-z0-9ก-๙]','','g')
          from order_items oi join orders o on o.order_no = oi.order_no
          where o.deleted_at is null and coalesce(oi.product,'') <> ''
      )
      select name, ptype as grade from products p
      where p.active
        and regexp_replace(lower(btrim(p.name)),'[^a-z0-9ก-๙]','','g') <> ''
        and regexp_replace(lower(btrim(p.name)),'[^a-z0-9ก-๙]','','g') not in (select k from used)
      order by name`);
  } catch { return []; }
}

/** กลิ่น+ขนาด ที่ปิดการขาย → Record<normScent, normSize[]> (แพทเทิร์นเดียวกับ getDiscontinued) */
export async function getClosedSkus(): Promise<Record<string, string[]>> {
  const norm = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9ก-๙]/g, "");
  try {
    const rows = await q<{ scent: string; size: string }>(`select scent, size from closed_sku`);
    const map: Record<string, string[]> = {};
    for (const r of rows) { (map[norm(r.scent)] ??= []).push(norm(r.size)); }
    return map;
  } catch { return {}; }  // ตารางยังไม่ถูกสร้าง
}

/** ขนาดที่เลือกในใบเบิกไม่ได้ = เลิกผลิต ∪ ปิดการขาย (รวมเป็น map เดียว ส่งให้ฟอร์มสั่งซื้อ) */
export async function getBlockedSizesForOrder(): Promise<Record<string, string[]>> {
  const [disc, closed] = await Promise.all([getDiscontinued(), getClosedSkus()]);
  const out: Record<string, string[]> = {};
  for (const src of [disc, closed]) for (const [k, v] of Object.entries(src)) out[k] = [...new Set([...(out[k] ?? []), ...v])];
  return out;
}

/** สรุปการจัดส่ง: ส่งแล้ววันนี้ (เวลาไทย) + ค้างส่ง (ตัดสต๊อกแล้วแต่ยังไม่ส่ง) */
export async function shipSummary(platform?: string): Promise<{ shippedToday: number; pending: number }> {
  try {
    const params: any[] = [];
    const pc = platform ? (params.push(platform), " and platform = $1") : "";
    const [r] = await q<{ shipped_today: number; pending: number }>(
      `select
         count(*) filter (where (shipped_at at time zone 'Asia/Bangkok')::date = (now() at time zone 'Asia/Bangkok')::date)::int as shipped_today,
         count(*) filter (where stock_issued_at is not null and shipped_at is null)::int as pending
       from orders where deleted_at is null${pc}`, params);
    return { shippedToday: r?.shipped_today ?? 0, pending: r?.pending ?? 0 };
  } catch { return { shippedToday: 0, pending: 0 }; }
}

export type ShipRow = { order_no: string; doc_no: string | null; platform: string | null; receiver: string | null; province: string | null; item_count: number; shipped_at: string; shipped_by_name: string | null };
/** รายการที่ส่งในวันหนึ่ง (default = วันนี้ เวลาไทย) เรียงล่าสุดก่อน · กรองแพลตฟอร์มได้ */
export async function listShippedByDay(dateStr?: string, platform?: string): Promise<ShipRow[]> {
  try {
    const params: any[] = [];
    let cond = `(o.shipped_at at time zone 'Asia/Bangkok')::date = (now() at time zone 'Asia/Bangkok')::date`;
    if (dateStr) { params.push(dateStr); cond = `(o.shipped_at at time zone 'Asia/Bangkok')::date = $${params.length}::date`; }
    const pc = platform ? (params.push(platform), ` and o.platform = $${params.length}`) : "";
    return await q<ShipRow>(
      `select o.order_no, o.doc_no, o.platform, coalesce(o.receiver, o.username) as receiver, o.province,
              (select count(*)::int from order_items i where i.order_no = o.order_no) as item_count,
              o.shipped_at, coalesce(nullif(btrim(u.full_name), ''), u.username) as shipped_by_name
       from orders o left join users u on u.id = o.shipped_by
       where o.deleted_at is null and o.shipped_at is not null and ${cond}${pc}
       order by o.shipped_at desc`, params);
  } catch { return []; }
}

export type PlatformCount = { platform: string; count: number };
/** จำนวนที่ส่งในวันหนึ่ง แยกตามแพลตฟอร์ม (สำหรับแถบสรุป) */
export async function shippedCountsByPlatform(dateStr?: string): Promise<PlatformCount[]> {
  try {
    const params: any[] = [];
    let cond = `(shipped_at at time zone 'Asia/Bangkok')::date = (now() at time zone 'Asia/Bangkok')::date`;
    if (dateStr) { params.push(dateStr); cond = `(shipped_at at time zone 'Asia/Bangkok')::date = $1::date`; }
    return await q<PlatformCount>(
      `select coalesce(platform,'Shopee') as platform, count(*)::int as count
       from orders where deleted_at is null and shipped_at is not null and ${cond}
       group by 1 order by count desc`, params);
  } catch { return []; }
}

export type DailyIssue = { day: string; orders: number; issued: number; pending: number };
/** รายวัน: ออร์เดอร์ที่เข้ามา (ตามวันที่ใบเบิก) เทียบกับที่ตัดสต๊อกแล้ว */
export async function dailyIssueStatus(platform?: string, days = 14): Promise<DailyIssue[]> {
  // ใช้ "วันที่สั่งซื้อจริง" (order_date) เป็นหลัก ถ้าไม่มีค่อยใช้วันที่ใบเบิก · platform undefined = ทุกแพลตฟอร์ม
  try {
    const params: any[] = [days];
    const pc = platform ? (params.push(platform), ` and platform = $${params.length}`) : "";
    const rows = await q<{ day: string; orders: number; issued: number }>(
      `select to_char(coalesce(order_date, doc_date),'YYYY-MM-DD') as day,
              count(*)::int as orders,
              count(stock_issued_at)::int as issued
       from orders
       where deleted_at is null and coalesce(order_date, doc_date) is not null${pc}
       group by to_char(coalesce(order_date, doc_date),'YYYY-MM-DD')
       order by day desc limit $1`,
      params,
    );
    return rows.map((r) => ({ day: r.day, orders: Number(r.orders), issued: Number(r.issued), pending: Number(r.orders) - Number(r.issued) }));
  } catch { return []; }
}

export type DayOrderItem = { product: string; size: string | null; qty: number; is_free: boolean };
export type DayOrderRow = {
  order_no: string; doc_no: string | null; receiver: string | null; username: string | null;
  province: string | null; created_by_name: string | null;
  issued: boolean; shipped: boolean; return_status: string | null;
  qty: number; items: DayOrderItem[] | null;
};
/** ออเดอร์ + รายการ ตามฟิลเตอร์ (เดียวกับหน้า /shopee: เดือน/ช่วงวันที่/สถานะ/ค้นหา) — สำหรับรายงานสรุป */
export async function reportRows(opts: { platform?: string; search?: string; month?: string; from?: string; to?: string; issued?: "yes" | "no"; shipped?: "yes" | "no" } = {}): Promise<DayOrderRow[]> {
  try {
    const where: string[] = ["o.deleted_at is null"];
    const params: any[] = [];
    params.push(opts.platform ?? "Shopee"); where.push(`o.platform = $${params.length}`);
    if (opts.month) { params.push(opts.month); where.push(`o.month_label = $${params.length}`); }
    if (opts.from) { params.push(opts.from); where.push(`coalesce(o.order_date, o.doc_date) >= $${params.length}`); }
    if (opts.to) { params.push(opts.to); where.push(`coalesce(o.order_date, o.doc_date) <= $${params.length}`); }
    if (opts.issued === "yes") where.push(`o.stock_issued_at is not null`);
    else if (opts.issued === "no") where.push(`o.stock_issued_at is null`);
    if (opts.shipped === "yes") where.push(`o.shipped_at is not null`);
    else if (opts.shipped === "no") where.push(`o.shipped_at is null`);
    if (opts.search) {
      params.push(`%${opts.search}%`); const p = `$${params.length}`;
      where.push(`(o.order_no ilike ${p} or o.doc_no ilike ${p} or o.receiver ilike ${p} or o.username ilike ${p} or o.shop_name ilike ${p} or o.province ilike ${p})`);
    }
    return await q<DayOrderRow>(
      `select o.order_no, o.doc_no, coalesce(o.receiver, o.username) as receiver, o.username, o.province,
              coalesce(nullif(btrim(u.full_name), ''), u.username) as created_by_name,
              (o.stock_issued_at is not null) as issued, (o.shipped_at is not null) as shipped, o.return_status,
              coalesce(sum(i.qty) filter (where coalesce(i.product,'') <> ''), 0)::float8 as qty,
              coalesce(json_agg(json_build_object('product', i.product, 'size', i.size, 'qty', i.qty, 'is_free', i.is_free)
                       order by i.line_no) filter (where coalesce(i.product,'') <> ''), '[]'::json) as items
       from orders o
       left join order_items i on i.order_no = o.order_no
       left join users u on u.id = o.created_by
       where ${where.join(" and ")}
       group by o.order_no, o.doc_no, o.receiver, o.username, o.province, u.full_name, u.username,
                o.stock_issued_at, o.shipped_at, o.return_status, o.doc_date, o.created_at
       order by o.doc_date desc nulls last, o.created_at desc
       limit 5000`,
      params,
    );
  } catch { return []; }
}

export async function getSizes(): Promise<string[]> {
  const rows = await q<{ label: string }>(`select label from sizes order by sort, label`);
  return rows.map((r) => r.label);
}

export type PostcodeRow = { province: string; district: string; postcode: string };
// postcodes/provinces = ข้อมูล seed ที่แอปไม่เคยแก้ → cache ข้ามรีเควสต์ (เดิมอ่าน DB ทุกครั้งที่เปิดฟอร์มใบเบิก)
export const getPostcodes = unstable_cache(
  async (): Promise<PostcodeRow[]> => q<PostcodeRow>(`select province, district, postcode from postcodes order by province, district`),
  ["ref:postcodes"], { revalidate: 86400 },
);
export const getProvinces = unstable_cache(
  async (): Promise<string[]> => (await q<{ province: string }>(`select distinct province from postcodes order by province`)).map((r) => r.province),
  ["ref:provinces"], { revalidate: 86400 },
);

// ---- orders ----------------------------------------------------------------
export async function listOrders(opts: { platform?: string; search?: string; month?: string; from?: string; to?: string; issued?: "yes" | "no"; shipped?: "yes" | "no"; limit?: number; offset?: number } = {}): Promise<OrderRow[]> {
  const where: string[] = ["o.deleted_at is null"];
  const params: any[] = [];
  if (opts.platform) { params.push(opts.platform); where.push(`o.platform = $${params.length}`); }
  if (opts.month) { params.push(opts.month); where.push(`o.month_label = $${params.length}`); }
  if (opts.from) { params.push(opts.from); where.push(`coalesce(o.order_date, o.doc_date) >= $${params.length}`); }
  if (opts.to) { params.push(opts.to); where.push(`coalesce(o.order_date, o.doc_date) <= $${params.length}`); }
  if (opts.issued === "yes") where.push(`o.stock_issued_at is not null`);
  else if (opts.issued === "no") where.push(`o.stock_issued_at is null`);
  if (opts.shipped === "yes") where.push(`o.shipped_at is not null`);
  else if (opts.shipped === "no") where.push(`o.shipped_at is null`);
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

export async function countOrders(opts: { platform?: string; search?: string; month?: string; from?: string; to?: string; issued?: "yes" | "no"; shipped?: "yes" | "no" } = {}): Promise<number> {
  const where: string[] = ["deleted_at is null"];
  const params: any[] = [];
  if (opts.platform) { params.push(opts.platform); where.push(`platform = $${params.length}`); }
  if (opts.month) { params.push(opts.month); where.push(`month_label = $${params.length}`); }
  if (opts.from) { params.push(opts.from); where.push(`coalesce(order_date, doc_date) >= $${params.length}`); }
  if (opts.to) { params.push(opts.to); where.push(`coalesce(order_date, doc_date) <= $${params.length}`); }
  if (opts.issued === "yes") where.push(`stock_issued_at is not null`);
  else if (opts.issued === "no") where.push(`stock_issued_at is null`);
  if (opts.shipped === "yes") where.push(`shipped_at is not null`);
  else if (opts.shipped === "no") where.push(`shipped_at is null`);
  if (opts.search) {
    params.push(`%${opts.search}%`);
    const p = `$${params.length}`;
    // ต้องตรงกับ listOrders เป๊ะ (รวม province) ไม่งั้น total/หน้าเพจเพี้ยน
    where.push(`(order_no ilike ${p} or doc_no ilike ${p} or receiver ilike ${p} or username ilike ${p} or shop_name ilike ${p} or province ilike ${p})`);
  }
  const [r] = await q<{ n: number }>(`select count(*)::int n from orders ${where.length ? "where " + where.join(" and ") : ""}`, params);
  return r?.n ?? 0;
}

export async function listDeletedOrders(platform = "Shopee", limit = 200, offset = 0): Promise<OrderRow[]> {
  const rows = await q<OrderRow>(
    `select o.*, coalesce(count(i.id),0)::int as item_count, coalesce(sum(i.qty),0)::float8 as total_qty
     from orders o left join order_items i on i.order_no = o.order_no
     where o.platform = $1 and o.deleted_at is not null
     group by o.order_no
     order by o.deleted_at desc
     limit ${Math.min(limit, 500)} offset ${Math.max(0, offset)}`,
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
  const th = opts.threshold ?? 10;
  const limit = Math.min(opts.limit ?? 1000, 5000);
  const searchCond = opts.search ? (params.push(`%${opts.search}%`), `where n.product ilike $${params.length}`) : "";
  const lowHaving = opts.lowOnly ? `having sum(n.qty) <= ${th}` : "";
  // ทุก SKU ที่เคยมี (จาก stock ∪ รายการในใบเบิก) + ยอดปัจจุบัน
  // จัดกลุ่มด้วยชื่อ+ขนาดที่ normalize แล้ว → ยุบแถวที่สะกดต่างกันแค่ตัวพิมพ์/ช่องว่าง เป็นแถวเดียว (รวม qty)
  const NP = `regexp_replace(lower(btrim(product)),'[^a-z0-9ก-๙]','','g')`;
  const NS = `regexp_replace(lower(btrim(size)),'[^a-z0-9ก-๙]','','g')`;
  const sql = `
    with raw as (
      select product, size, qty::float8 as qty, updated_at from stock
      union all
      select distinct oi.product, oi.size, 0::float8, null::timestamptz
        from order_items oi join orders o on o.order_no = oi.order_no
        where o.deleted_at is null and coalesce(oi.product,'') <> '' and coalesce(oi.size,'') <> ''
    ),
    n as (select product, size, qty, updated_at, ${NP} as pkey, ${NS} as skey from raw)
    select
      coalesce((select p.name from products p where regexp_replace(lower(btrim(p.name)),'[^a-z0-9ก-๙]','','g') = n.pkey limit 1), max(n.product)) as product,
      max(n.size) as size,
      sum(n.qty)::float8 as qty,
      max(n.updated_at) as updated_at,
      (select p.ptype from products p where regexp_replace(lower(btrim(p.name)),'[^a-z0-9ก-๙]','','g') = n.pkey limit 1) as grade
    from n
    ${searchCond}
    group by n.pkey, n.skey
    ${lowHaving}
    order by sum(n.qty) asc, product, max(n.size)
    limit ${limit}`;
  try { return await q<StockRow>(sql, params); } catch { return []; }
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
  // ยอดคงเหลือทุกบรรทัดในครั้งเดียว (เดิม N+1 = 1 query/บรรทัด) — unnest + lateral join stock
  // จับคู่แบบ normalize (keep อักษรไทย) ให้ตรงกับตอนตัดสต๊อกจริง — ไม่งั้น preview โชว์ 0 ทั้งที่ตัดจริงเจอ
  const prods = order.items.map((it) => it.product);
  const sizes = order.items.map((it) => it.size);
  const sr = await q<{ idx: number; qty: number }>(
    `select t.idx::int as idx, coalesce(s.qty,0)::float8 as qty
     from unnest($1::text[], $2::text[]) with ordinality as t(product, size, idx)
     left join lateral (
       select qty from stock
       where size = t.size and regexp_replace(lower(product),'[^a-z0-9ก-๙]','','g') = regexp_replace(lower(t.product),'[^a-z0-9ก-๙]','','g')
       order by (product = t.product) desc limit 1
     ) s on true`,
    [prods, sizes],
  );
  const stockByIdx = new Map(sr.map((r) => [Number(r.idx), Number(r.qty)]));
  const itemsStock = order.items.map((it, i) => ({ ...it, stock: stockByIdx.get(i + 1) ?? 0 }));
  return { ...order, stock_issued_at: meta?.stock_issued_at ?? null, itemsStock };
}

export type IssuedOrderRow = { order_no: string; doc_no: string | null; platform: string | null; receiver: string | null; province: string | null; item_count: number; total_qty: number; stock_issued_at: string; issued_by: string | null };
export async function listIssuedOrders(opts: { search?: string; platform?: string; limit?: number } = {}): Promise<IssuedOrderRow[]> {
  const params: any[] = [];
  const where: string[] = ["o.stock_issued_at is not null"];
  if (opts.search) {
    params.push(`%${opts.search}%`);
    const p = `$${params.length}`;
    where.push(`(o.order_no ilike ${p} or o.doc_no ilike ${p} or o.receiver ilike ${p})`);
  }
  if (opts.platform) { params.push(opts.platform); where.push(`o.platform = $${params.length}`); }
  const limit = Math.min(opts.limit ?? 100, 500);
  try {
    return await q<IssuedOrderRow>(
      `select o.order_no, o.doc_no, o.platform, o.receiver, o.province, o.stock_issued_at,
              coalesce(count(i.id),0)::int as item_count, coalesce(sum(i.qty),0)::float8 as total_qty,
              coalesce(nullif(u.full_name,''), u.username) as issued_by
       from orders o
       left join order_items i on i.order_no = o.order_no
       left join users u on u.id = o.stock_issued_by
       where ${where.join(" and ")}
       group by o.order_no, o.platform, u.full_name, u.username
       order by o.stock_issued_at desc
       limit ${limit}`,
      params,
    );
  } catch { return []; }
}

export type DashStats = {
  ordersTotal: number; ordersToday: number; ordersMonth: number;
  issuedTotal: number; issuedToday: number; pendingIssue: number;
  skus: number; low: number; negative: number;
};
export async function dashboardStats(platform?: string): Promise<DashStats> {
  // ทำเป็น query เดียว (scalar subqueries) แทน 8 query ขนาน — ลดจำนวน connection
  // ที่เปิดพร้อมกันบน Workers/Hyperdrive (เปิดหลาย connection พร้อมกันเคยทำให้ค้าง).
  // สุขภาพสต๊อก อิงเฉพาะ SKU ที่ track จริง (ตาราง stock): ปกติ(>10)+ต้องเติม(0..10)+ติดลบ(<0)=skus
  const empty: DashStats = { ordersTotal: 0, ordersToday: 0, ordersMonth: 0, issuedTotal: 0, issuedToday: 0, pendingIssue: 0, skus: 0, low: 0, negative: 0 };
  try {
    const params: any[] = [];
    const pc = platform ? (params.push(platform), " and platform = $1") : "";
    const [r] = await q<DashStats & { pendingIssue?: number }>(
      `select
         (select count(*)::int from orders where deleted_at is null${pc}) as "ordersTotal",
         (select count(*)::int from orders where deleted_at is null${pc} and doc_date = current_date) as "ordersToday",
         (select count(*)::int from orders where deleted_at is null${pc} and to_char(doc_date,'YYYY-MM') = to_char(current_date,'YYYY-MM')) as "ordersMonth",
         (select count(*)::int from orders where deleted_at is null${pc} and stock_issued_at is not null) as "issuedTotal",
         (select count(*)::int from orders where deleted_at is null${pc} and stock_issued_at::date = current_date) as "issuedToday",
         (select count(*)::int from stock) as skus,
         (select count(*)::int from stock where qty >= 0 and qty <= 10) as low,
         (select count(*)::int from stock where qty < 0) as negative`,
      params,
    );
    const s = r ?? ({} as DashStats);
    const ordersTotal = s.ordersTotal ?? 0, issuedTotal = s.issuedTotal ?? 0;
    return {
      ordersTotal, ordersToday: s.ordersToday ?? 0, ordersMonth: s.ordersMonth ?? 0,
      issuedTotal, issuedToday: s.issuedToday ?? 0, pendingIssue: ordersTotal - issuedTotal,
      skus: s.skus ?? 0, low: s.low ?? 0, negative: s.negative ?? 0,
    };
  } catch (e) { console.error("[dashboardStats]", (e as any)?.message); return empty; }
}

/** กลิ่นที่เบิกมากสุด (ผลรวมจำนวนจากใบเบิกที่ยังไม่ลบ) — สำหรับกราฟบนหน้าภาพรวม */
export type TopProduct = { product: string; qty: number };
export async function topProducts(limit = 6): Promise<TopProduct[]> {
  const lim = Math.min(Math.max(1, limit), 500);
  try {
    return await q<TopProduct>(
      `select oi.product, sum(oi.qty)::float8 as qty
       from order_items oi join orders o on o.order_no = oi.order_no
       where o.deleted_at is null and coalesce(oi.product,'') <> ''
       group by oi.product order by qty desc limit ${lim}`,
    );
  } catch { return []; }
}

/** จำนวนใบเบิกต่อเดือน (ล่าสุด N เดือน) — สำหรับ mini bar chart หน้าภาพรวม */
export type MonthPoint = { ym: string; label: string; n: number };
export async function ordersTrend(months = 6, platform?: string): Promise<MonthPoint[]> {
  const m = Math.min(Math.max(1, months), 24);
  try {
    const params: any[] = [];
    const pc = platform ? (params.push(platform), " and platform = $1") : "";
    const rows = await q<{ ym: string; n: number }>(
      `select to_char(date_trunc('month', doc_date),'YYYY-MM') as ym, count(*)::int as n
       from orders where deleted_at is null and doc_date is not null${pc}
       group by 1 order by 1 desc limit ${m}`,
      params,
    );
    const TH = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
    return rows
      .map((r) => {
        const mm = Number((r.ym || "").slice(5, 7));
        const yy = (r.ym || "").slice(2, 4);
        return { ym: r.ym, label: `${TH[mm - 1] ?? r.ym}${yy}`, n: r.n };
      })
      .reverse(); // เก่า→ใหม่ สำหรับวาดกราฟ
  } catch { return []; }
}

export async function stockSummary(): Promise<{ skus: number; low: number; issuedOrders: number }> {
  try {
    const [a] = await q<{ n: number }>(`select count(*)::int n from (select distinct oi.product, oi.size from order_items oi join orders o on o.order_no=oi.order_no where o.deleted_at is null and coalesce(oi.product,'')<>'' union select product,size from stock) t`);
    const [b] = await q<{ n: number }>(`select count(*)::int n from stock where qty <= 10`);
    const [c] = await q<{ n: number }>(`select count(*)::int n from orders where deleted_at is null and stock_issued_at is not null`);
    return { skus: a?.n ?? 0, low: b?.n ?? 0, issuedOrders: c?.n ?? 0 };
  } catch { return { skus: 0, low: 0, issuedOrders: 0 }; }
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

// ---- คลังวัตถุดิบ & บรรจุภัณฑ์ (material_item + material_move) ---------------
export type BulkRow = { scent: string; brand: string; grade: string | null; qty: number; reorder: number | null; note: string | null };
/** ปริมาตรน้ำหอม (ml) — กลิ่นที่ขาย (Lab Parfumo) + OEM ที่เพิ่มเอง */
export async function listBulkStock(): Promise<BulkRow[]> {
  try {
    const [prods, items] = await Promise.all([
      q<{ name: string; ptype: string | null }>(`select name, ptype from products where active`),
      q<{ ref_key: string; scent: string | null; brand: string | null; grade: string | null; label: string; qty: number; reorder: number | null; note: string | null }>(
        `select ref_key, scent, brand, grade, label, qty::float8 as qty, reorder_point::float8 as reorder, note from material_item where category='bulk'`),
    ]);
    const byRef = new Map(items.map((i) => [i.ref_key, i]));
    const rows: BulkRow[] = prods.map((p) => {
      const it = byRef.get(bulkRef(p.name, "Lab Parfumo"));
      if (it) byRef.delete(bulkRef(p.name, "Lab Parfumo"));
      return { scent: p.name, brand: "Lab Parfumo", grade: p.ptype, qty: it ? Number(it.qty) : 0, reorder: it?.reorder ?? null, note: it?.note ?? null };
    });
    for (const it of byRef.values()) {   // OEM / รายการที่ไม่มีในสินค้าปัจจุบัน
      rows.push({ scent: it.scent || it.label, brand: it.brand || "OEM", grade: it.grade, qty: Number(it.qty), reorder: it.reorder ?? null, note: it.note ?? null });
    }
    return rows.sort((a, b) => a.brand.localeCompare(b.brand, "en") || a.scent.localeCompare(b.scent, "en"));
  } catch { return []; }
}

export type LabelScent = { scent: string; grade: string; components: { key: string; label: string; qty: number; reorder: number | null }[] };
/** สติ๊กเกอร์และการ์ด — ต่อกลิ่น แสดง component ตาม Grade + ชิ้นส่วนที่ import มานอกแคตตาล็อก (data-driven ไม่ตกหล่น) */
export async function listLabelStock(): Promise<LabelScent[]> {
  try {
    const [prods, items] = await Promise.all([
      q<{ name: string; ptype: string | null }>(`select name, ptype from products where active`),
      q<{ scent: string | null; comp_key: string | null; label: string; grade: string | null; qty: number; reorder: number | null }>(
        `select scent, comp_key, label, grade, qty::float8 as qty, reorder_point::float8 as reorder from material_item where category='label'`),
    ]);
    // จัดกลุ่มชิ้นส่วนที่มีในคลังตามกลิ่น (normalize) → comp_key → รายการ
    const compLabel = (s: string) => (s || "").split(" · ").pop() || s;
    const byScent = new Map<string, Map<string, typeof items[number]>>();
    for (const it of items) {
      const key = mnorm(it.scent || "");
      if (!key || !it.comp_key) continue;   // ข้ามแถวไม่มี comp_key (กันสร้างกลุ่มว่าง → crash ตอน leftover)
      if (!byScent.has(key)) byScent.set(key, new Map());
      byScent.get(key)!.set(it.comp_key, it);
    }
    const used = new Set<string>();
    const out: LabelScent[] = [];
    for (const p of prods) {
      const spec = labelSpecFor(p.name, p.ptype);   // override เฉพาะกลิ่น > ตาม Grade
      if (!spec) continue;
      const nk = mnorm(p.name);
      used.add(nk);
      const owned = byScent.get(nk);
      const catalogKeys = new Set(spec.comps.map((c) => c.key));
      const comps = spec.comps.map((c) => { const it = owned?.get(c.key); return { key: c.key, label: c.label, qty: it ? Number(it.qty) : 0, reorder: it?.reorder ?? null }; });
      // ชิ้นส่วนที่ import มาแต่ไม่อยู่ในแคตตาล็อกของกลิ่นนี้ → เพิ่มต่อท้าย ไม่ให้ตกหล่น
      if (owned) for (const [ck, it] of owned) if (!catalogKeys.has(ck)) comps.push({ key: ck, label: compLabel(it.label), qty: Number(it.qty), reorder: it.reorder ?? null });
      out.push({ scent: p.name, grade: spec.grade, components: comps });
    }
    // กลิ่นที่มีข้อมูลในคลังแต่ไม่มีในรายการสินค้า (เช่น กลิ่นที่เลิกขาย/OEM) → แสดงเป็นกลุ่ม "อื่นๆ"
    for (const [nk, owned] of byScent) {
      if (used.has(nk)) continue;
      const first = [...owned.values()][0];
      out.push({ scent: first.scent || nk, grade: first.grade || "อื่นๆ", components: [...owned.values()].map((it) => ({ key: it.comp_key!, label: compLabel(it.label), qty: Number(it.qty), reorder: it.reorder ?? null })) });
    }
    return out.sort((a, b) => a.grade.localeCompare(b.grade, "en") || a.scent.localeCompare(b.scent, "en"));
  } catch { return []; }
}

export type PackagingRow = { ref_key: string; label: string; category: string; qty: number; reorder: number | null };
/** ขวดและแพ็คเกจ — รายการคงที่ */
export async function listPackagingStock(): Promise<PackagingRow[]> {
  try {
    return await q<PackagingRow>(`select ref_key, label, coalesce(category2,'อื่นๆ') as category, qty::float8 as qty, reorder_point::float8 as reorder from material_item where category='packaging' order by sort, ref_key`);
  } catch { return []; }
}

export type MaterialPick = { category: string; ref_key: string; label: string; scent: string | null; comp_key: string | null; brand: string | null; grade: string | null; category2: string | null; unit: string; qty: number };
/** ทุกรายการวัตถุดิบที่มีในคลัง (3 หมวด) — ใช้หน้าเบิกรวม */
export async function listAllMaterials(): Promise<MaterialPick[]> {
  try {
    return await q<MaterialPick>(
      `select category, ref_key, label, scent, comp_key, brand, grade, category2, unit, qty::float8 as qty
       from material_item order by category, label`);
  } catch { return []; }
}

// ── ระบบรับคืน ──────────────────────────────────────────────────────────
export type DamagedRow = { product: string; size: string; qty: number };
/** คลังของชำรุด — คงเหลือต่อ SKU (ที่ยังมี > 0) */
export async function listDamaged(): Promise<DamagedRow[]> {
  try {
    return await q<DamagedRow>(`select product, size, qty::float8 as qty from damaged where qty > 0 order by product, size`);
  } catch { return []; }
}

export type ReturnRow = {
  id: number; order_no: string; platform: string | null; username: string | null; receiver: string | null; product: string; size: string; qty: number;
  disposition: string; reason: string | null; note: string | null; voided_at: string | null;
  created_at: string; by_name: string | null;
};
/** ประวัติการคืน (ล่าสุดก่อน) · กรองแพลตฟอร์มได้ */
export async function listReturns(limit = 200, platform?: string): Promise<ReturnRow[]> {
  try {
    const params: any[] = [limit];
    const pc = platform ? (params.push(platform), ` and o.platform = $${params.length}`) : "";
    return await q<ReturnRow>(
      `select r.id, r.order_no, o.platform, o.username, o.receiver, r.product, r.size, r.qty::float8 as qty, r.disposition, r.reason, r.note, r.voided_at,
              r.created_at, u.full_name as by_name
       from order_returns r
       left join users u on u.id = r.created_by
       left join orders o on o.order_no = r.order_no
       where true${pc}
       order by r.created_at desc limit $1`, params);
  } catch { return []; }
}

export type ReturnPlatformStat = { platform: string; shipped: number; returned_orders: number; qty: number; rate: number };
/** อัตราการคืนต่อแพลตฟอร์ม = จำนวนออเดอร์ที่มีการคืน ÷ ออเดอร์ที่ส่งแล้ว (%) */
export async function returnStatsByPlatform(): Promise<ReturnPlatformStat[]> {
  try {
    return await q<ReturnPlatformStat>(
      `with shipped as (
         select coalesce(platform,'Shopee') as platform, count(*)::int as shipped
         from orders where deleted_at is null and shipped_at is not null group by 1
       ), ret as (
         select coalesce(o.platform,'Shopee') as platform,
                count(distinct r.order_no)::int as returned_orders, sum(r.qty)::float8 as qty
         from order_returns r join orders o on o.order_no = r.order_no
         where r.voided_at is null and o.deleted_at is null and o.shipped_at is not null group by 1
       )
       select s.platform, s.shipped,
              coalesce(rt.returned_orders,0) as returned_orders, coalesce(rt.qty,0) as qty,
              round(100.0 * coalesce(rt.returned_orders,0) / nullif(s.shipped,0), 1)::float8 as rate
       from shipped s left join ret rt on rt.platform = s.platform
       order by rate desc nulls last, s.shipped desc`);
  } catch { return []; }
}

export type PlatformOverviewRow = {
  platform: string; orders: number; month: number; issued: number; shipped: number; pending: number; returned: number;
};
/** สรุปเทียบทุกแพลตฟอร์มในช็อตเดียว (สำหรับ dashboard ภาพรวม) — ออร์เดอร์/ตัด/ส่ง/ค้างส่ง/คืน */
export async function platformOverview(): Promise<PlatformOverviewRow[]> {
  try {
    return await q<PlatformOverviewRow>(
      `select coalesce(platform,'Shopee') as platform,
              count(*)::int as orders,
              count(*) filter (where date_trunc('month', coalesce(order_date, doc_date)) = date_trunc('month', (now() at time zone 'Asia/Bangkok')))::int as month,
              count(*) filter (where stock_issued_at is not null)::int as issued,
              count(*) filter (where shipped_at is not null)::int as shipped,
              count(*) filter (where stock_issued_at is not null and shipped_at is null)::int as pending,
              count(*) filter (where coalesce(return_status,'none') <> 'none')::int as returned
       from orders where deleted_at is null
       group by 1 order by orders desc`);
  } catch {
    // เผื่อ prod ยังไม่มีคอลัมน์ return_status → ลองใหม่แบบไม่รวมคืน
    try {
      const rows = await q<Omit<PlatformOverviewRow, "returned">>(
        `select coalesce(platform,'Shopee') as platform,
                count(*)::int as orders,
                count(*) filter (where date_trunc('month', coalesce(order_date, doc_date)) = date_trunc('month', (now() at time zone 'Asia/Bangkok')))::int as month,
                count(*) filter (where stock_issued_at is not null)::int as issued,
                count(*) filter (where shipped_at is not null)::int as shipped,
                count(*) filter (where stock_issued_at is not null and shipped_at is null)::int as pending
         from orders where deleted_at is null group by 1 order by orders desc`);
      return rows.map((r) => ({ ...r, returned: 0 }));
    } catch { return []; }
  }
}

export type ReturnCustomerStat = { username: string; receiver: string | null; times: number; qty: number; damaged: number; last_at: string };
/** รายงานลูกค้าที่คืนบ่อย — นับจำนวนครั้ง (ออเดอร์ที่มีการคืน) ต่อผู้ใช้ Shopee */
export async function returnStatsByCustomer(platform?: string): Promise<ReturnCustomerStat[]> {
  try {
    const params: any[] = [];
    const pc = platform ? (params.push(platform), ` and o.platform = $${params.length}`) : "";
    return await q<ReturnCustomerStat>(
      `select coalesce(nullif(btrim(o.username), ''), '(ไม่ระบุผู้ใช้)') as username,
              max(o.receiver) as receiver,
              count(distinct r.order_no)::int as times,
              sum(r.qty)::float8 as qty,
              sum(case when r.disposition='damaged' then r.qty else 0 end)::float8 as damaged,
              max(r.created_at) as last_at
       from order_returns r left join orders o on o.order_no = r.order_no
       where r.voided_at is null${pc}
       group by 1 order by times desc, qty desc limit 50`, params);
  } catch { return []; }
}

export type ReturnStat = { product: string; returned: number; damaged: number; times: number };
/** รายงานอัตราคืนต่อกลิ่น (นับเฉพาะที่ไม่ถูกยกเลิก) */
export async function returnStatsByScent(platform?: string): Promise<ReturnStat[]> {
  try {
    if (platform) {
      return await q<ReturnStat>(
        `select r.product,
                sum(r.qty)::float8 as returned,
                sum(case when r.disposition='damaged' then r.qty else 0 end)::float8 as damaged,
                count(distinct r.order_no)::int as times
         from order_returns r join orders o on o.order_no = r.order_no
         where r.voided_at is null and coalesce(r.product,'') <> '' and o.platform = $1
         group by r.product order by returned desc limit 50`, [platform]);
    }
    return await q<ReturnStat>(
      `select product,
              sum(qty)::float8 as returned,
              sum(case when disposition='damaged' then qty else 0 end)::float8 as damaged,
              count(distinct order_no)::int as times
       from order_returns where voided_at is null and coalesce(product,'') <> ''
       group by product order by returned desc limit 50`);
  } catch { return []; }
}

export type MaterialMoveRow = { id: number; category: string; label: string; scent: string | null; qty_change: number; balance: number | null; reason: string; note: string | null; created_at: string; by_name: string | null };
/** ประวัติเคลื่อนไหววัตถุดิบ (รับเข้า/จ่ายออก/ปรับ) — กรองหมวด/วัน/รายการเดียว/ค้นหาชื่อ */
export async function listMaterialMoves(opts: { category?: string; date?: string; ref?: string; q?: string; limit?: number } = {}): Promise<MaterialMoveRow[]> {
  try {
    const params: any[] = []; const where: string[] = [];
    if (opts.category) { params.push(opts.category); where.push(`i.category = $${params.length}`); }
    if (opts.ref) { params.push(opts.ref); where.push(`i.ref_key = $${params.length}`); }
    if (opts.q) { params.push(`%${opts.q.trim()}%`); where.push(`(i.label ilike $${params.length} or i.scent ilike $${params.length})`); }
    if (opts.date) { params.push(opts.date); where.push(`(m.created_at at time zone 'Asia/Bangkok')::date = $${params.length}::date`); }
    const limit = Math.min(opts.limit ?? 300, 1000);
    return await q<MaterialMoveRow>(
      `select m.id, i.category, i.label, i.scent, m.qty_change::float8 as qty_change, m.balance::float8 as balance,
              m.reason, m.note, m.created_at, coalesce(nullif(btrim(u.full_name),''), u.username) as by_name
       from material_move m join material_item i on i.id = m.item_id left join users u on u.id = m.created_by
       ${where.length ? "where " + where.join(" and ") : ""}
       order by m.created_at desc limit ${limit}`, params);
  } catch { return []; }
}

// ---- บันทึกการใช้งาน (activity_log) — เห็นเฉพาะ admin ----------------------
export type ActivityRow = { id: number; user_id: number | null; username: string | null; role: string | null; action: string; detail: string | null; ip: string | null; created_at: string };
type ActivityFilter = { user?: string; action?: string; from?: string; to?: string; date?: string };
function activityWhere(opts: ActivityFilter, params: any[]): string {
  const where: string[] = [];
  if (opts.user) { params.push(`%${opts.user.trim()}%`); where.push(`username ilike $${params.length}`); }
  if (opts.action) { params.push(opts.action); where.push(`action = $${params.length}`); }
  const from = opts.from || opts.date, to = opts.to || opts.date;   // date = วันเดียว (เข้ากันได้กับของเดิม)
  if (from) { params.push(from); where.push(`(created_at at time zone 'Asia/Bangkok')::date >= $${params.length}::date`); }
  if (to) { params.push(to); where.push(`(created_at at time zone 'Asia/Bangkok')::date <= $${params.length}::date`); }
  return where.length ? "where " + where.join(" and ") : "";
}
export async function listActivityLog(opts: ActivityFilter & { limit?: number; offset?: number } = {}): Promise<ActivityRow[]> {
  try {
    const params: any[] = [];
    const where = activityWhere(opts, params);
    const limit = Math.min(opts.limit ?? 100, 500);
    const offset = Math.max(0, opts.offset ?? 0);
    return await q<ActivityRow>(
      `select id, user_id, username, role, action, detail, ip, created_at from activity_log
       ${where} order by created_at desc, id desc limit ${limit} offset ${offset}`, params);
  } catch { return []; }
}
export async function countActivityLog(opts: ActivityFilter = {}): Promise<number> {
  try {
    const params: any[] = [];
    const where = activityWhere(opts, params);
    const [r] = await q<{ n: number }>(`select count(*)::int n from activity_log ${where}`, params);
    return r?.n ?? 0;
  } catch { return 0; }
}
