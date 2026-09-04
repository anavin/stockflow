// สร้าง lib/kingpower-data.ts จากไฟล์ "King Power Product Name.xlsx"
// รัน: node scripts/gen-kingpower.mjs "/path/King Power Product Name.xlsx"
// คอลัมน์: REFERENCE(บาร์โค้ด) · ARTICLE(รหัส King Power) · DESCRIPTION ("LPF 30ML NEVER BLUE EAU DE PARFUM")
import ExcelJS from "exceljs";
import { writeFileSync } from "fs";

const file = process.argv[2] || "/Users/anavinst/Downloads/King Power Product Name.xlsx";
const wb = new ExcelJS.Workbook(); await wb.xlsx.readFile(file);
const ws = wb.worksheets[0];
const cell = (r, c) => { const v = ws.getRow(r).getCell(c).value; return String((v && v.text) ? v.text : (v ?? "")).trim(); };
const nk = (s) => (s || "").toLowerCase().replace(/[^a-z0-9ก-๙]/g, "");

// แยก size + scent + grade จาก DESCRIPTION — รองรับ 3 เกรด + เคสไม่เว้นวรรคหลัง ML
function parse(desc) {
  const m = desc.match(/LPF\s*([\d.]+)\s*ML\s*(.+?)\s+(EAU DE PARFUM|LE PARFUM|EDP EXTRAIT|EXTRAIT DE PARFUM)\s*$/i);
  if (!m) return null;
  return { ml: m[1], scent: m[2].trim(), grade: m[3].toUpperCase() };
}

const byKey = {}, sizesByScent = {}, names = {}, unmatched = [];
for (let r = 2; r <= ws.rowCount; r++) {
  const ref = cell(r, 1), article = cell(r, 2), desc = cell(r, 3);
  if (!desc) continue;
  const p = parse(desc);
  if (!p) { unmatched.push(desc); continue; }
  const key = `${nk(p.scent)}|${p.ml}`;
  byKey[key] = { code: article || ref, barcode: ref, item_name: desc, scent: p.scent, grade: p.grade };
  names[ref] = desc;
  const k = nk(p.scent), sz = `${p.ml} ml`;
  (sizesByScent[k] ??= []); if (!sizesByScent[k].includes(sz)) sizesByScent[k].push(sz);
}
for (const k in sizesByScent) sizesByScent[k].sort((a, b) => parseFloat(b) - parseFloat(a));   // ใหญ่→เล็ก

const ts = `// สร้างอัตโนมัติจาก "King Power Product Name.xlsx" (scripts/gen-kingpower.mjs) — อย่าแก้มือ
// map (กลิ่น+ขนาด ml) → {code=ARTICLE King Power, barcode=REFERENCE, item_name=DESCRIPTION}
// key = normalize(scent)+"|"+ml เช่น "neverblue|30"
export type KpItem = { code: string; barcode: string; item_name: string; scent: string; grade: string };
export const KINGPOWER_BY_KEY: Record<string, KpItem> = ${JSON.stringify(byKey, null, 2)};
// ขนาดที่ King Power มีต่อกลิ่น (key = normalize(scent)) — ใช้จำกัดตัวเลือกในฟอร์ม
export const KINGPOWER_SIZES_BY_SCENT: Record<string, string[]> = ${JSON.stringify(sizesByScent, null, 2)};
// ชื่อสินค้า King Power (key = barcode)
export const KINGPOWER_NAMES: Record<string, string> = ${JSON.stringify(names, null, 2)};
`;
writeFileSync("lib/kingpower-data.ts", ts);
console.log(`✓ lib/kingpower-data.ts — ${Object.keys(byKey).length} สินค้า · ${Object.keys(sizesByScent).length} กลิ่น`);
if (unmatched.length) console.log("⚠️ parse ไม่ได้:", unmatched);
