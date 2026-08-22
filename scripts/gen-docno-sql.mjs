// สร้าง SQL เติม doc_no (เลขที่ใบเบิกสินค้า) ให้ออเดอร์เดิม จากไฟล์ "รายการเบิกสินค้า-Data-2.xlsx"
// - map order_no → doc_no (มี prefix ต่อแพลตฟอร์มอยู่แล้ว: LZ/TT/LM/WE)
// - guarded UPDATE: อัปเดตเฉพาะออเดอร์ที่ "มีอยู่จริง + doc_no ยังว่าง + เลขนี้ยังไม่มีใครใช้"
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
  stat[ws.name] = { total: 0, used: 0, dupOrder: 0, dupDoc: 0 };
  ws.eachRow({includeEmpty:false},(row,rn)=>{
    if (rn===1) return;
    const on = str(row.getCell(cOrder)), dn = str(row.getCell(cDoc));
    if (!on || !dn) return;
    const s = stat[ws.name];
    if (seenOrder.has(on)) { return; }          // 1 order เอาแถวแรกพอ
    seenOrder.add(on); s.total++;
    if (seenDoc.has(dn)) { s.dupDoc++; return; } // doc ซ้ำในชุด → ข้าม (ปล่อย null)
    seenDoc.add(dn); s.used++;
    rows.push([on, dn]);
  });
}
let out = "";
out += "-- เติมเลขที่ใบเบิกสินค้า (doc_no) ให้ออเดอร์เดิม — idempotent, รันซ้ำได้\n";
out += "begin;\n";
out += "create temp table _docmap(order_no text primary key, doc_no text) on commit drop;\n";
const CH = 500;
for (let i=0;i<rows.length;i+=CH) {
  const vals = rows.slice(i,i+CH).map(([o,d])=>`(${q(o)},${q(d)})`).join(",");
  out += `insert into _docmap(order_no,doc_no) values ${vals} on conflict do nothing;\n`;
}
out += `
-- อัปเดตเฉพาะที่ปลอดภัย: ออเดอร์มีอยู่ · doc_no ปัจจุบันว่าง · เลขใบเบิกนี้ยังไม่มีใครใช้
update orders o set doc_no = m.doc_no, updated_at = now()
from _docmap m
where o.order_no = m.order_no
  and coalesce(o.doc_no,'') = ''
  and not exists (select 1 from orders o2 where o2.doc_no = m.doc_no);

-- สรุปผล
select
  (select count(*) from _docmap) as ในไฟล์,
  (select count(*) from orders o join _docmap m on m.order_no=o.order_no) as จับคู่ออเดอร์ได้,
  (select count(*) from orders o join _docmap m on m.order_no=o.order_no and o.doc_no=m.doc_no) as มีเลขใบเบิกแล้ว;
commit;
`;
console.log(out);
console.error("สรุปต่อชีต:", JSON.stringify(stat, null, 0));
console.error("รวมแถวที่จะเติม:", rows.length);
