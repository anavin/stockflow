// โหลดข้อมูลใบเบิกเก่า (ฟอร์แมตภายใน — sheet ต่อแพลตฟอร์ม) เข้า DB ครั้งเดียว
// ไฟล์: "รายการเบิกสินค้า-Data-2.xlsx" — sheet Lazada/Tiktok/Line/Website (หัวคอลัมน์เหมือน sheet Shopee เดิม)
//
// รันบน LOCAL (ทดสอบก่อน — เขียนลง .pgdata, ปิด dev server ก่อน):
//   node scripts/import-old-data.mjs "/path/รายการเบิกสินค้า-Data-2.xlsx"
// รันบน PROD:
//   DATABASE_URL="postgres://...6543/postgres" node scripts/import-old-data.mjs "/path/ไฟล์.xlsx"
//
// ปลอดภัย: upsert (on conflict order_no do update) + ลบ+ใส่ order_items ใหม่ต่อใบ → รันซ้ำได้ (idempotent)
// เก็บ doc_no/วันที่เดิมจากไฟล์ (ไม่ออกเลขใหม่) · tag platform ตามชื่อ sheet
import ExcelJS from "exceljs";

const FILE = process.argv[2];
if (!FILE) { console.error('❌ ใส่ path ไฟล์: node scripts/import-old-data.mjs "<ไฟล์.xlsx>"'); process.exit(1); }

// sheet name → platform code (ต้องมีใน ตาราง platforms)
const SHEET_PLATFORM = { Lazada: "Lazada", Tiktok: "Tiktok", Line: "Line", Website: "Website", Shopee: "Shopee" };

// ---- DB adapter: prod (pg) ถ้ามี DATABASE_URL, ไม่งั้น local PGlite ----
const DATABASE_URL = process.env.DATABASE_URL;
let run, label, close;
if (DATABASE_URL) {
  const pg = (await import("pg")).default;
  const client = new pg.Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  run = (sql, params) => client.query(sql, params).then((r) => r.rows);
  label = "PROD (Supabase)"; close = () => client.end();
} else {
  const { PGlite } = await import("@electric-sql/pglite");
  const db = new PGlite(".pgdata"); await db.waitReady;
  run = (sql, params) => db.query(sql, params).then((r) => r.rows);
  label = "LOCAL (.pgdata)"; close = () => {};
}
console.log(`✓ เชื่อมต่อ: ${label}\n`);

const flat = (v) => { if (v == null) return ""; if (typeof v === "object") { if ("text" in v) return v.text; if ("result" in v) return v.result; if ("richText" in v) return v.richText.map((r) => r.text).join(""); } return v; };
const str = (v) => String(flat(v) ?? "").trim();
const num = (v) => { const n = Number(String(flat(v) ?? "").replace(/[^\d.-]/g, "")); return isNaN(n) ? 0 : n; };
const toDate = (v) => {
  const f = flat(v); if (f == null || f === "") return null;
  if (f instanceof Date) return f.toISOString().slice(0, 10);
  if (typeof f === "number") { const d = new Date(Math.round((f - 25569) * 86400 * 1000)); return isNaN(d) ? null : d.toISOString().slice(0, 10); }
  const s = String(f).trim();
  let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/); if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/); if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  const d = new Date(s); return isNaN(d) ? null : d.toISOString().slice(0, 10);
};
const buildLabel = (p, sz, free) => `${p}${sz ? " " + sz : ""}${free ? " (Free)" : ""}`;

const wb = new ExcelJS.Workbook(); await wb.xlsx.readFile(FILE);
const ORDER_COLS = ["order_no", "platform", "doc_no", "doc_date", "month_label", "channel", "shop_name", "username", "receiver", "phone", "customer_type", "purchase_count", "district", "subdistrict", "province", "postcode", "address", "campaign", "note", "box_scent", "order_date"];

let grandOrders = 0, grandItems = 0;
for (const ws of wb.worksheets) {
  const platform = SHEET_PLATFORM[ws.name];
  if (!platform) { console.log(`▸ ${ws.name}: ข้าม (ไม่รู้จักแพลตฟอร์ม)`); continue; }

  const idx = {}; ws.getRow(1).eachCell({ includeEmpty: true }, (c, col) => { idx[str(c.value)] = col; });
  const G = (row, name) => { const c = idx[name]; return c ? row.getCell(c).value : null; };

  // จัดกลุ่มเป็นออเดอร์ตาม order_no
  const orders = new Map();
  ws.eachRow({ includeEmpty: false }, (row, rn) => {
    if (rn === 1) return;
    const on = str(G(row, "หมายเลขคำสั่งซื้อ")); if (!on) return;
    const perfume = str(G(row, "Perfume"));
    if (!orders.has(on)) {
      orders.set(on, {
        order_no: on, platform,
        // ไม่เก็บ doc_no เดิมจากไฟล์ — ไฟล์เก่าใช้เลขใบเบิกชุดเดียวข้ามแพลตฟอร์ม (SH-...) ชนกับ Shopee ใน DB
        // (doc_no มี UNIQUE constraint) · order_no คือ key ธุรกิจจริง ยังเก็บครบ · ออกเลขใหม่ได้ทีหลังถ้าต้องการ
        doc_no: null,
        doc_date: toDate(G(row, "วันที่")),
        month_label: str(G(row, "เดือนปี")) || null,
        channel: str(G(row, "Channel")) || platform,
        shop_name: null,
        username: str(G(row, "ชื่อผู้ใช้ (ผู้ซื้อ)")) || null,
        receiver: str(G(row, "ชื่อผู้รับ")) || null,
        phone: str(G(row, "หมายเลขโทรศัพท์")) || null,
        customer_type: str(G(row, "ลูกค้าเก่า/ใหม่")) || null,
        purchase_count: G(row, "ซื้อครั้งที่") != null && str(G(row, "ซื้อครั้งที่")) !== "" ? num(G(row, "ซื้อครั้งที่")) : null,
        district: str(G(row, "อำเภอ / เขต")) || null,
        subdistrict: null,
        province: str(G(row, "จังหวัด")) || null,
        postcode: str(G(row, "PostCode")) || null,
        address: str(G(row, "Address")) || null,
        campaign: str(G(row, "Campaign")) || null,
        note: str(G(row, "Note")) || null,
        box_scent: str(G(row, "ฉีดกลิ่นอะไรลงในกล่อง")) || null,
        order_date: toDate(G(row, "วันที่ทำการสั่งซื้อ")),
        items: [],
      });
    }
    if (perfume) {
      const ord = orders.get(on);
      const size = str(G(row, "Size"));
      const is_free = str(G(row, "Free")) !== "";
      ord.items.push({ line_no: ord.items.length + 1, product: perfume, size, is_free, qty: num(G(row, "จำนวน")) || 1, unit: "ขวด", product_label: str(G(row, "ชื่อสินค้า")) || buildLabel(perfume, size, is_free), sku: null });
    }
  });

  const list = [...orders.values()].filter((o) => o.items.length > 0);
  // upsert เป็น chunk
  const CHUNK = 200; let done = 0;
  for (let i = 0; i < list.length; i += CHUNK) {
    const slice = list.slice(i, i + CHUNK);
    // orders upsert
    const vals = []; const tuples = slice.map((o) => {
      const ph = ORDER_COLS.map((_, j) => `$${vals.length + j + 1}`);
      ORDER_COLS.forEach((c) => vals.push(o[c] ?? null));
      return `(${ph.join(",")})`;
    });
    const upd = ORDER_COLS.slice(1).map((c) => `${c}=excluded.${c}`).join(",");
    await run(`insert into orders (${ORDER_COLS.join(",")}) values ${tuples.join(",")} on conflict (order_no) do update set ${upd}, updated_at=now(), deleted_at=null`, vals);
    // items: ลบเก่า+ใส่ใหม่ (idempotent)
    const ons = slice.map((o) => o.order_no);
    await run(`delete from order_items where order_no = any($1::text[])`, [ons]);
    const iv = []; const it = [];
    for (const o of slice) for (const x of o.items) {
      const ph = [`$${iv.length + 1}`, `$${iv.length + 2}`, `$${iv.length + 3}`, `$${iv.length + 4}`, `$${iv.length + 5}`, `$${iv.length + 6}`, `$${iv.length + 7}`, `$${iv.length + 8}`, `$${iv.length + 9}`];
      iv.push(o.order_no, x.line_no, x.product, x.size, x.is_free, x.qty, x.unit, x.product_label, x.sku);
      it.push(`(${ph.join(",")})`);
    }
    if (it.length) await run(`insert into order_items (order_no, line_no, product, size, is_free, qty, unit, product_label, sku) values ${it.join(",")}`, iv);
    done += slice.length; process.stdout.write(`\r▸ ${ws.name} (${platform}): ${done}/${list.length} ออเดอร์`);
  }
  const items = list.reduce((a, o) => a + o.items.length, 0);
  console.log(`  ✓ · ${items} รายการ`);
  grandOrders += list.length; grandItems += items;
}

console.log(`\n🎉 เสร็จ: ${grandOrders} ออเดอร์ · ${grandItems} รายการ`);
await close();
