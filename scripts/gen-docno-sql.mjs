// สร้าง SQL เติม doc_no (เลขที่ใบเบิกสินค้า) ให้ออเดอร์เดิม จากไฟล์ "รายการเบิกสินค้า-Data-2.xlsx"
// - map order_no → doc_no (มี prefix ต่อแพลตฟอร์มอยู่แล้ว: LZ/TT/LM/WE)
// - single-statement UPDATE ... FROM (VALUES ...) → ไม่ใช้ temp table, รันบน Supabase SQL Editor ได้
// - guarded: อัปเดตเฉพาะ "ออเดอร์มีอยู่ + doc_no ว่าง + เลขนี้ยังไม่มีใครใช้"
// - dedup ทั้ง order_no และ doc_no (กันชน UNIQUE ภายในชุดเดียว)
// ใช้: node scripts/gen-docno-sql.mjs "<ไฟล์.xlsx>" > supabase/fill-docno.sql
import ExcelJS from "exceljs";
const FILE = process.argv[2];
if (!FILE) { console.error("ใส่ path ไฟล์"); process.exit(1); }
const str = (c) => { if (!c) return ""; const t = c.text; return (t==null?"":String(t)).trim(); };
const q = (s) => "'" + String(s).replace(/'/g, "''") + "'";

const wb = new ExcelJS.Workbook(); await wb.xlsx.readFile(FILE);
const seenOrder = new Set(), seenDoc = new Set();
const rows = []; const stat = {};
for (const ws of wb.worksheets) {
  const idx = {}; ws.getRow(1).eachCell({includeEmpty:true},(c,col)=>{ idx[str(c)]=col; });
  const cOrder = idx["หมายเลขคำสั่งซื้อ"], cDoc = idx["เลขที่ใบเบิกสินค้า"];
  if (!cOrder || !cDoc) continue;
  stat[ws.name] = { total: 0, used: 0, dupDoc: 0 };
  ws.eachRow({includeEmpty:false},(row,rn)=>{
    if (rn===1) return;
    const on = str(row.getCell(cOrder)), dn = str(row.getCell(cDoc));
    if (!on || !dn) return;
    const s = stat[ws.name];
    if (seenOrder.has(on)) return;                 // 1 order เอาแถวแรกพอ
    seenOrder.add(on); s.total++;
    if (seenDoc.has(dn)) { s.dupDoc++; return; }   // doc ซ้ำในชุด → ข้าม (ปล่อย null)
    seenDoc.add(dn); s.used++;
    rows.push([on, dn]);
  });
}
let out = "";
out += "-- เติมเลขที่ใบเบิกสินค้า (doc_no) ให้ออเดอร์เดิม จากไฟล์ Data-2\n";
out += "-- statement เดียว ไม่ใช้ temp table → วางรันบน Supabase SQL Editor ได้ทันที · idempotent รันซ้ำได้\n";
out += "-- guarded: เติมเฉพาะออเดอร์ที่ doc_no ว่าง + เลขใบเบิกนี้ยังไม่มีใครใช้ (กันชน UNIQUE)\n\n";
out += "update orders o\n   set doc_no = m.doc_no, updated_at = now()\n  from (values\n";
out += rows.map(([o,d]) => `    (${q(o)},${q(d)})`).join(",\n") + "\n";
out += "  ) as m(order_no, doc_no)\n";
out += " where o.order_no = m.order_no\n";
out += "   and coalesce(o.doc_no,'') = ''\n";
out += "   and not exists (select 1 from orders o2 where o2.doc_no = m.doc_no);\n\n";
out += "-- สรุปหลังรัน: จำนวนออเดอร์ที่มีเลขใบเบิก แยกแพลตฟอร์ม\n";
out += "select platform,\n       count(*) filter (where coalesce(doc_no,'') <> '') as มีเลขใบเบิก,\n       count(*) as ทั้งหมด\n  from orders where deleted_at is null group by 1 order by 2 desc;\n";
console.log(out);
console.error("สรุปต่อชีต:", JSON.stringify(stat));
console.error("รวมแถวที่จะเติม:", rows.length);
