// สร้าง lib/eveandboy-data.ts จากไฟล์ EVEANDBOY PRODUCT NAME and BRANCH.xlsx
// รัน: node scripts/gen-eveandboy.mjs "/path/EVEANDBOY PRODUCT NAME and BRANCH.xlsx"
import ExcelJS from "exceljs";
import { writeFileSync } from "fs";
const file = process.argv[2] || "/Users/anavinst/Downloads/EVEANDBOY PRODUCT NAME and BRANCH.xlsx";
const wb = new ExcelJS.Workbook(); await wb.xlsx.readFile(file);
const ws = wb.worksheets[0];
const cell=(r,c)=>{const v=ws.getRow(r).getCell(c).value; return String((v&&v.text)?v.text:(v??"")).trim();};
// normalize กลิ่น (ตัดอักขระที่ไม่ใช่ตัวอักษร/เลข) — ใช้ทำ key จับกับสินค้าในระบบ
const nk = (s) => (s || "").toLowerCase().replace(/[^a-z0-9ก-๙]/g, "");
// แยกกลิ่น+ขนาด(ml) จาก ITEMNAME เช่น "LAB PARFUMO-Dream Island Eau De Parfum//50ML"
function parseItem(name) {
  const m = name.match(/^LAB PARFUMO-(.+?)\s+Eau\s+[Dd]e\s+P[ae]rfum\/\/\s*(\d+(?:\.\d+)?)\s*ML/i);
  if (!m) return null;
  return { scent: m[1].trim(), ml: m[2] };
}

const names={}, byKey={}, branches=[], sizesByScent={};
for(let r=3;r<=ws.rowCount;r++){
  const id=cell(r,1), name=cell(r,2), b=cell(r,4), addr=cell(r,5);
  if(id){ names[id]=name; const p=parseItem(name); if(p){ byKey[`${nk(p.scent)}|${p.ml}`]={ barcode:id, item_name:name };
    const k=nk(p.scent), sz=`${p.ml} ml`; (sizesByScent[k]??=[]); if(!sizesByScent[k].includes(sz)) sizesByScent[k].push(sz); } }
  if(b){ const [code,...rest]=b.split(" - "); branches.push({ branch:b, code:code.trim(), name:rest.join(" - ").trim(), address:addr }); }
}
// เรียงขนาดใหญ่→เล็ก
for(const k in sizesByScent) sizesByScent[k].sort((a,b)=>parseFloat(b)-parseFloat(a));
const ts = `// สร้างอัตโนมัติจาก EVEANDBOY PRODUCT NAME and BRANCH.xlsx (scripts/gen-eveandboy.mjs) — อย่าแก้มือ
// ชื่อสินค้าแบบ Eveandboy (key = barcode/ITEMID)
export const EVEANDBOY_NAMES: Record<string, string> = ${JSON.stringify(names, null, 2)};
// map (กลิ่น+ขนาด ml) → {barcode, ชื่อ Eveandboy} — key = normalize(scent)+"|"+ml เช่น "dreamisland|50"
export type EvbItem = { barcode: string; item_name: string };
export const EVEANDBOY_BY_KEY: Record<string, EvbItem> = ${JSON.stringify(byKey, null, 2)};
// ขนาดที่ Eveandboy มีต่อกลิ่น (key = normalize(scent)) — ใช้จำกัดตัวเลือกในฟอร์ม (เลือกได้เฉพาะที่มี)
export const EVEANDBOY_SIZES_BY_SCENT: Record<string, string[]> = ${JSON.stringify(sizesByScent, null, 2)};
// สาขา Eveandboy (dropdown + ที่อยู่บนใบเบิก)
export type EvbBranch = { branch: string; code: string; name: string; address: string };
export const EVEANDBOY_BRANCHES: EvbBranch[] = ${JSON.stringify(branches, null, 2)};
`;
writeFileSync("lib/eveandboy-data.ts", ts);
console.log(`✓ lib/eveandboy-data.ts — ${Object.keys(names).length} สินค้า · ${branches.length} สาขา`);
