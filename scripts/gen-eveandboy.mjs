// สร้าง lib/eveandboy-data.ts จากไฟล์ EVEANDBOY PRODUCT NAME and BRANCH.xlsx
// รัน: node scripts/gen-eveandboy.mjs "/path/EVEANDBOY PRODUCT NAME and BRANCH.xlsx"
import ExcelJS from "exceljs";
import { writeFileSync } from "fs";
const file = process.argv[2] || "/Users/anavinst/Downloads/EVEANDBOY PRODUCT NAME and BRANCH.xlsx";
const wb = new ExcelJS.Workbook(); await wb.xlsx.readFile(file);
const ws = wb.worksheets[0];
const cell=(r,c)=>{const v=ws.getRow(r).getCell(c).value; return String((v&&v.text)?v.text:(v??"")).trim();};
const names={}, branches=[];
for(let r=3;r<=ws.rowCount;r++){
  const id=cell(r,1), name=cell(r,2), b=cell(r,4), addr=cell(r,5);
  if(id) names[id]=name;
  if(b){ const [code,...rest]=b.split(" - "); branches.push({ branch:b, code:code.trim(), name:rest.join(" - ").trim(), address:addr }); }
}
const ts = `// สร้างอัตโนมัติจาก EVEANDBOY PRODUCT NAME and BRANCH.xlsx (scripts/gen-eveandboy.mjs) — อย่าแก้มือ
// ชื่อสินค้าแบบ Eveandboy (key = barcode/ITEMID) — ใช้แสดงในใบเบิก Eveandboy
export const EVEANDBOY_NAMES: Record<string, string> = ${JSON.stringify(names, null, 2)};
// สาขา Eveandboy (dropdown + ที่อยู่บนใบเบิก)
export type EvbBranch = { branch: string; code: string; name: string; address: string };
export const EVEANDBOY_BRANCHES: EvbBranch[] = ${JSON.stringify(branches, null, 2)};
`;
writeFileSync("lib/eveandboy-data.ts", ts);
console.log(`✓ lib/eveandboy-data.ts — ${Object.keys(names).length} สินค้า · ${branches.length} สาขา`);
