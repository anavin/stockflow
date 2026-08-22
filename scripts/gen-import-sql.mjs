// สร้างไฟล์ SQL จากไฟล์ข้อมูลเก่า (รันบน Supabase SQL Editor แทน node script — เลี่ยงเรื่องรหัส DB)
//   node scripts/gen-import-sql.mjs "<ไฟล์.xlsx>" out.sql
// อ่านเซลล์ด้วย cell.text (คอลัมน์ที่อยู่ในไฟล์เป็นสูตร XLOOKUP พัง #REF! → ต้องใช้ .text ไม่ใช่ .value)
// ผลลัพธ์: upsert orders + ลบ/ใส่ order_items + backfill จังหวัดจาก postcode · idempotent · doc_no=NULL
import ExcelJS from "exceljs";
import { writeFileSync } from "node:fs";
const FILE = process.argv[2], OUT = process.argv[3] || "import-old-data.sql";
const SHEET_PLATFORM = { Lazada: "Lazada", Tiktok: "Tiktok", Line: "Line", Website: "Website", Shopee: "Shopee" };
const cstr = (c) => { if (!c) return ""; const t = c.text; return (t == null ? "" : String(t)).trim(); };
const cnum = (c) => { if (!c) return 0; const n = Number(String(c.text ?? "").replace(/[^\d.-]/g, "")); return isNaN(n) ? 0 : n; };
const cdate = (c) => { if (!c) return null; const v = c.value;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "number") { const d = new Date(Math.round((v - 25569) * 86400 * 1000)); return isNaN(d) ? null : d.toISOString().slice(0, 10); }
  const s = (c.text || String(v || "")).trim(); let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/); if (m) return `${m[1]}-${m[2].padStart(2,"0")}-${m[3].padStart(2,"0")}`;
  m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/); if (m) return `${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`; const d = new Date(s); return isNaN(d) ? null : d.toISOString().slice(0, 10); };
const bl = (p, sz, f) => `${p}${sz ? " " + sz : ""}${f ? " (Free)" : ""}`;
const S = (v) => (v == null || v === "") ? "NULL" : "'" + String(v).replace(/'/g, "''") + "'";
const N = (v) => (v == null || v === "") ? "NULL" : String(Number(v));
const B = (v) => v ? "true" : "false";
const wb = new ExcelJS.Workbook(); await wb.xlsx.readFile(FILE);
const OC = ["order_no","platform","doc_no","doc_date","month_label","channel","shop_name","username","receiver","phone","customer_type","purchase_count","district","subdistrict","province","postcode","address","campaign","note","box_scent","order_date"];
const allOrders = [], allItems = [], allOns = [];
for (const ws of wb.worksheets) {
  const platform = SHEET_PLATFORM[ws.name]; if (!platform) continue;
  const idx = {}; ws.getRow(1).eachCell({ includeEmpty: true }, (c, col) => { idx[cstr(c)] = col; });
  const G = (row, name) => { const c = idx[name]; return c ? row.getCell(c) : null; };
  const orders = new Map();
  ws.eachRow({ includeEmpty: false }, (row, rn) => {
    if (rn === 1) return; const on = cstr(G(row, "หมายเลขคำสั่งซื้อ")); if (!on) return; const perfume = cstr(G(row, "Perfume"));
    if (!orders.has(on)) orders.set(on, { order_no: on, platform, doc_no: null, doc_date: cdate(G(row, "วันที่")), month_label: cstr(G(row, "เดือนปี")) || null, channel: cstr(G(row, "Channel")) || platform, shop_name: null, username: cstr(G(row, "ชื่อผู้ใช้ (ผู้ซื้อ)")) || null, receiver: cstr(G(row, "ชื่อผู้รับ")) || null, phone: cstr(G(row, "หมายเลขโทรศัพท์")) || null, customer_type: cstr(G(row, "ลูกค้าเก่า/ใหม่")) || null, purchase_count: cstr(G(row, "ซื้อครั้งที่")) !== "" ? cnum(G(row, "ซื้อครั้งที่")) : null, district: cstr(G(row, "อำเภอ / เขต")) || null, subdistrict: null, province: cstr(G(row, "จังหวัด")) || null, postcode: cstr(G(row, "PostCode")) || null, address: cstr(G(row, "Address")) || null, campaign: cstr(G(row, "Campaign")) || null, note: cstr(G(row, "Note")) || null, box_scent: cstr(G(row, "ฉีดกลิ่นอะไรลงในกล่อง")) || null, order_date: cdate(G(row, "วันที่ทำการสั่งซื้อ")), items: [] });
    if (perfume) { const o = orders.get(on); const size = cstr(G(row, "Size")); const free = cstr(G(row, "Free")) !== ""; o.items.push({ line_no: o.items.length + 1, product: perfume, size, is_free: free, qty: cnum(G(row, "จำนวน")) || 1, product_label: cstr(G(row, "ชื่อสินค้า")) || bl(perfume, size, free) }); }
  });
  for (const o of orders.values()) { if (!o.items.length) continue; allOrders.push(o); allOns.push(o.order_no); for (const it of o.items) allItems.push({ ...it, order_no: o.order_no }); }
}
let sql = `-- โหลดข้อมูลใบเบิกเก่าต่อแพลตฟอร์ม (Lazada/Tiktok/Line/Website) — วางใน Supabase SQL Editor แล้ว Run\n-- idempotent (upsert + ลบ/ใส่ items) · doc_no=NULL · province/district ที่ไฟล์ว่าง(สูตรพัง)→backfill จาก postcode\nbegin;\n\n`;
const upd = OC.slice(1).map((c) => `${c}=excluded.${c}`).join(",");
for (let i = 0; i < allOrders.length; i += 400) { const rows = allOrders.slice(i, i + 400).map((o) => `(${OC.map((c) => c === "purchase_count" ? N(o[c]) : S(o[c])).join(",")})`); sql += `insert into orders (${OC.join(",")}) values\n${rows.join(",\n")}\non conflict (order_no) do update set ${upd}, updated_at=now(), deleted_at=null;\n\n`; }
for (let i = 0; i < allOns.length; i += 800) sql += `delete from order_items where order_no = any(array[${allOns.slice(i, i + 800).map(S).join(",")}]::text[]);\n`;
sql += "\n";
for (let i = 0; i < allItems.length; i += 400) { const rows = allItems.slice(i, i + 400).map((x) => `(${S(x.order_no)},${N(x.line_no)},${S(x.product)},${S(x.size)},${B(x.is_free)},${N(x.qty)},'ขวด',${S(x.product_label)},NULL)`); sql += `insert into order_items (order_no,line_no,product,size,is_free,qty,unit,product_label,sku) values\n${rows.join(",\n")};\n\n`; }
sql += `-- เติมจังหวัด/อำเภอ จาก postcode (ไฟล์เก่า XLOOKUP พัง แต่รหัสไปรษณีย์มีครบ)\nupdate orders o set province=pc.province, district=coalesce(nullif(o.district,''),pc.district)\n  from (select distinct on (postcode) postcode, province, district from postcodes order by postcode) pc\n  where o.postcode=pc.postcode and coalesce(o.province,'')='' and o.platform in ('Lazada','Tiktok','Line','Website');\n\ncommit;\n`;
writeFileSync(OUT, sql);
console.log(`✓ ${allOrders.length} ออเดอร์ · ${allItems.length} รายการ → ${OUT}`);
