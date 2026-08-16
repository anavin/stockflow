import type ExcelJS from "exceljs";

export type SkuRow = { row: number; barcode: string; sku: string; product: string; size: string };

const norm = (s: any) => String(s ?? "").trim();
const key = (s: any) => norm(s).toLowerCase().replace(/[^a-z0-9ก-๙]/g, "");

/** map หัวคอลัมน์ → field (ยืดหยุ่นชื่อไทย/อังกฤษ) */
function colMap(headers: string[]): Record<string, number> {
  const m: Record<string, number> = {};
  headers.forEach((h, i) => {
    const k = key(h);
    if (!k) return;
    if (k.includes("barcode") || k === "ean" || k.startsWith("บาร")) m.barcode ??= i;
    else if (k === "sku" || k.startsWith("sku") || k.includes("รหัสรายชิ้น")) m.sku ??= i;
    else if (k.includes("กลิ่น") || k.includes("รายชื่อ") || k.includes("รายการ") || k === "product" || k === "name") m.product ??= i;
    else if (k.includes("ขนาด") || k === "size" || k.includes("ml")) m.size ??= i;
  });
  return m;
}

/** อ่านชีตนำเข้า SKU → คืนแถวดิบ (ยังไม่ resolve กลิ่น/ขนาด) + ชื่อชีตที่ใช้ */
export function parseSkuWorkbook(wb: ExcelJS.Workbook): { rows: SkuRow[]; sheet: string | null } {
  // เลือกชีตที่มีหัว SKU/Barcode (ข้ามชีตวิธีใช้/อ้างอิง)
  let ws: ExcelJS.Worksheet | null = null;
  wb.eachSheet((sheet) => {
    if (ws) return;
    const nm = key(sheet.name);
    if (nm.includes("วิธีใช้") || nm.includes("อ้างอิง") || nm.includes("reference")) return;
    const headers = (sheet.getRow(1).values as any[]).map(norm);
    const m = colMap(headers);
    if (m.sku != null || m.barcode != null) ws = sheet;
  });
  if (!ws) return { rows: [], sheet: null };

  const sheet: ExcelJS.Worksheet = ws;
  const headers = (sheet.getRow(1).values as any[]).map(norm);
  const m = colMap(headers);
  const rows: SkuRow[] = [];
  sheet.eachRow((row, rn) => {
    if (rn === 1) return;
    const vals = row.values as any[];
    const barcode = m.barcode != null ? norm(vals[m.barcode]) : "";
    const sku = m.sku != null ? norm(vals[m.sku]) : "";
    const product = m.product != null ? norm(vals[m.product]) : "";
    const size = m.size != null ? norm(vals[m.size]) : "";
    if (!barcode && !sku && !product && !size) return; // แถวว่าง
    rows.push({ row: rn, barcode, sku, product, size });
  });
  return { rows, sheet: sheet.name };
}
