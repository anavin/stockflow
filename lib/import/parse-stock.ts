import type ExcelJS from "exceljs";

export type StockLine = { product: string; size: string; qty: number };

// exceljs cell values: formulas → {formula, result}, errors → {error}, rich text
// → {richText}, hyperlinks → {text}. ดึงค่าจริงออกมา (ข้าม error/date object).
const cellText = (v: any): string => {
  if (v == null) return "";
  if (v instanceof Date) return "";                 // วันที่ ไม่ใช่ชื่อสินค้า
  if (typeof v === "object") {
    if ("result" in v) {                            // formula
      const r = (v as any).result;
      return r == null || typeof r === "object" ? "" : String(r).trim();
    }
    if (Array.isArray((v as any).richText)) return (v as any).richText.map((t: any) => t.text).join("").trim();
    if ("text" in v) return String((v as any).text).trim();
    return "";                                       // error object ฯลฯ
  }
  return String(v).trim();
};
// คืน null เมื่อค่าจำนวนอ่านไม่ได้ (เช่น "-", "N/A", สูตร error) — จะได้ "ข้าม" แถวนั้น
// แทนที่จะ set สต๊อกเป็น 0 เงียบๆ (import เป็นการ set ค่าสัมบูรณ์ = เสี่ยงล้างสต๊อก)
const num = (v: any): number | null => {
  let t: any = v;
  if (t === "" || t == null) return null;
  if (t && typeof t === "object") t = "result" in t ? t.result : "text" in t ? t.text : NaN;
  if (t === "" || t == null) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

/** ปรับ "50 ml." / "50 ml" / "50ml" → "50 ml" ให้ตรงกับระบบ */
export function normalizeSize(s: string): string {
  const m = s.match(/([\d.]+)\s*ml/i);
  return m ? `${m[1]} ml` : s.trim();
}

/**
 * Parse the "Lab Stock & Seller Data Monitoring" workbook — reads the per-size
 * summary sheets ("สต๊อก 90/50/30/10 ml.") and returns current remaining stock
 * (คงเหลือ) per perfume+size. Cols: C = รายการน้ำหอม, G = คงเหลือ; size from sheet name.
 */
const norm = (s: string) => s.toString().trim().toLowerCase().replace(/\s+/g, "").replace(/[.]/g, "");

/** เทมเพลตแบบง่าย: ชีตที่มีหัวคอลัมน์ สินค้า/ชื่อ/กลิ่น + ขนาด + จำนวนคงเหลือ/คงเหลือ/จำนวน */
function parseSimpleSheet(ws: ExcelJS.Worksheet): StockLine[] | null {
  // หา header row + คอลัมน์
  for (let r = 1; r <= Math.min(10, ws.rowCount); r++) {
    const row = ws.getRow(r);
    let cp = 0, cs = 0, cq = 0;
    row.eachCell({ includeEmpty: true }, (c, col) => {
      const h = norm(cellText(c.value));
      if (!h) return;
      if (!cp && /(สินค้า|ชื่อ|กลิ่น|perfume|product|edp)/.test(h)) cp = col;
      if (!cs && /(ขนาด|size)/.test(h)) cs = col;
      if (!cq && /(คงเหลือ|จำนวน|qty|quantity|stock|balance)/.test(h)) cq = col;
    });
    if (cp && cs && cq) {
      const out: StockLine[] = [];
      for (let rr = r + 1; rr <= ws.rowCount; rr++) {
        const product = cellText(ws.getRow(rr).getCell(cp).value);
        if (!product) continue;
        const size = normalizeSize(cellText(ws.getRow(rr).getCell(cs).value));
        if (!size) continue;
        const qty = num(ws.getRow(rr).getCell(cq).value);
        if (qty == null) continue;   // อ่านจำนวนไม่ได้ → ข้าม (ไม่ล้างสต๊อกเป็น 0)
        out.push({ product, size, qty });
      }
      return out;
    }
  }
  return null;
}

export function parseStockWorkbook(wb: ExcelJS.Workbook): { lines: StockLine[]; sheets: string[] } {
  const lines: StockLine[] = [];
  const sheets: string[] = [];

  // ถ้ามีชีตแบบ "สต๊อก 90/50/30/10 ml." = ไฟล์ Lab Stock & Seller → ใช้รูปแบบนั้น (กันชน "Stock List" รายขวด)
  const isLabStock = wb.worksheets.some((ws) => /สต๊อก\s*\d+\s*ml/i.test(ws.name || ""));

  if (!isLabStock) {
    // เทมเพลตแบบง่าย: ชีตที่มีหัวคอลัมน์ สินค้า/ขนาด/คงเหลือ
    for (const ws of wb.worksheets) {
      const simple = parseSimpleSheet(ws);
      if (simple && simple.length) { lines.push(...simple); sheets.push(ws.name); break; }
    }
    return { lines, sheets };
  }

  // รูปแบบไฟล์ Lab Stock & Seller (ชีต "สต๊อก 90/50/30/10 ml.")
  for (const ws of wb.worksheets) {
    const name = ws.name || "";
    if (!/สต๊อก/.test(name) || !/ml/i.test(name)) continue;
    const size = normalizeSize(name.replace("สต๊อก", "").trim());
    // find header row containing "รายการน้ำหอม"
    let hdr = 0;
    for (let r = 1; r <= Math.min(20, ws.rowCount); r++) {
      const row = ws.getRow(r);
      let found = false;
      row.eachCell({ includeEmpty: true }, (c) => { if (cellText(c.value) === "รายการน้ำหอม") found = true; });
      if (found) { hdr = r; break; }
    }
    if (!hdr) continue;
    sheets.push(name);
    for (let r = hdr + 1; r <= ws.rowCount; r++) {
      const product = cellText(ws.getRow(r).getCell(3).value);   // C
      if (!product) continue;
      const qty = num(ws.getRow(r).getCell(7).value);            // G = คงเหลือ
      if (qty == null) continue;   // อ่านจำนวนไม่ได้ → ข้าม (ไม่ล้างสต๊อกเป็น 0)
      lines.push({ product, size, qty });
    }
  }
  return { lines, sheets };
}
