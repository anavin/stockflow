import { buildProductLabel, type OrderItem, type OrderWithItems } from "@/lib/types";

/** Canonical fields we import into. */
type Field =
  | "line" | "month_label" | "doc_date" | "doc_no" | "channel" | "order_no"
  | "product" | "size" | "free" | "qty" | "product_label" | "note" | "campaign"
  | "username" | "receiver" | "phone" | "customer_type" | "purchase_count"
  | "district" | "province" | "postcode" | "address" | "box_scent" | "order_date" | "sku";

const norm = (s: string) => s.toString().trim().toLowerCase().replace(/\s+/g, "").replace(/[.]/g, "");

/** Header aliases (normalized) → canonical field. Matches the Shopee sheet. */
const ALIASES: Record<string, Field> = {};
const def = (field: Field, ...names: string[]) => names.forEach((n) => (ALIASES[norm(n)] = field));
def("line", "ลำดับ", "no", "#");
def("month_label", "เดือนปี", "เดือน/ปี", "month");
def("doc_date", "วันที่", "date");
def("doc_no", "เลขที่ใบเบิกสินค้า", "เลขที่ใบเบิก", "เลขที่", "docno");
def("channel", "channel", "ช่องทาง");
def("order_no", "หมายเลขคำสั่งซื้อ", "orderno", "order no", "orderid", "หมายเลขคําสั่งซื้อ");
def("product", "perfume", "กลิ่น", "รายการ", "รายการedp", "สินค้า");
def("size", "size", "ขนาด");
def("free", "free", "ของแถม");
def("qty", "จำนวน", "qty", "quantity");
def("product_label", "ชื่อสินค้า", "productname");
def("note", "note", "หมายเหตุ");
def("campaign", "campaign", "แคมเปญ");
def("username", "ชื่อผู้ใช้", "username");
def("receiver", "ชื่อผู้รับ", "ผู้รับ", "receiver", "name");
def("phone", "หมายเลขโทรศัพท์", "เบอร์โทร", "โทรศัพท์", "phone", "tel");
def("customer_type", "ลูกค้าเก่า/ใหม่", "ลูกค้าเก่าใหม่", "ลูกค้า", "customertype");
def("purchase_count", "ซื้อครั้งที่", "ครั้งที่");
def("district", "อำเภอ/เขต", "อำเภอ", "เขต", "district");
def("province", "จังหวัด", "province");
def("postcode", "postcode", "รหัสไปรษณีย์", "ไปรษณีย์", "zip");
def("address", "address", "ที่อยู่");
def("box_scent", "ฉีดกลิ่นอะไรลงในกล่อง", "ฉีดกลิ่น", "boxscent");
def("order_date", "วันที่ทำการสั่งซื้อ", "orderdate", "order creation date", "วันที่สั่งซื้อ");
def("sku", "sku", "sku reference no.", "parent sku reference no.");
// --- Shopee marketplace export (English / alt Thai) ---
def("order_no", "order id", "order sn", "ordersn");
def("username", "username (buyer)", "buyer username", "ชื่อผู้ใช้ (ผู้ซื้อ)", "ผู้ซื้อ");
def("receiver", "recipient", "recipient name", "ชื่อ-นามสกุลผู้รับ", "ผู้รับสินค้า");
def("phone", "phone number", "recipient phone no.", "เบอร์โทรผู้รับ");
def("address", "delivery address", "ที่อยู่ในการจัดส่ง", "ที่อยู่จัดส่ง");
def("district", "city", "town", "เมือง", "เขต/อำเภอ", "ตำบล/แขวง", "อําเภอ / เขต");
def("province", "state/region", "state / region");
def("postcode", "zip code", "zipcode");
def("qty", "quantity");
def("size", "variation name", "variation", "ชื่อตัวเลือก", "ชื่อรุ่นสินค้า", "ตัวเลือกสินค้า");
def("product", "product name", "ชื่อสินค้า (shopee)");

export function mapHeader(h: string): Field | null {
  return ALIASES[norm(h)] ?? null;
}

/** Excel serial or Date or string → "YYYY-MM-DD" (or null). */
export function toDateStr(v: any): string | null {
  if (v == null || v === "") return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "number") {
    // Excel serial date (days since 1899-12-30)
    const ms = Math.round((v - 25569) * 86400 * 1000);
    const d = new Date(ms);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  const s = String(v).trim();
  const m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

const str = (v: any) => (v == null ? "" : String(v).trim());

// --- Shopee export helpers: กลิ่น/ขนาดไม่ได้อยู่คอลัมน์เดียวชัดเจน ต้องเดาจากหลายช่อง ---
const normLoose = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9ก-๙]/g, "");

/** ดึงขนาด "N ml" จากผู้สมัครหลายช่อง (ชื่อตัวเลือก → SKU → ชื่อสินค้า) */
function extractMl(...cands: string[]): string {
  for (const s of cands) {
    const m = (s || "").match(/(\d+(?:\.\d+)?)\s*ml/i);
    if (m) return `${m[1]} ml`;
  }
  return "";
}

/** หา "กลิ่น" ที่ตรงกับรายการสินค้าในระบบ โดยดูว่าชื่อ master ตัวไหนโผล่ในข้อความ (ยาวสุดชนะ) */
function matchMasterScent(hay: string, products: string[]): string {
  const H = normLoose(hay);
  if (!H) return "";
  let best = "";
  for (const p of products) {
    const P = normLoose(p);
    if (P.length >= 2 && H.includes(P) && P.length > normLoose(best).length) best = p;
  }
  return best;
}

/** เดา product(กลิ่น)+size จาก Shopee export เมื่อไม่มีคอลัมน์กลิ่นชัดเจน
 *  - ขวดปกติ: ขนาดอยู่ "ชื่อตัวเลือก", กลิ่นอยู่ใน SKU/ชื่อสินค้า
 *  - ตัวอย่าง 4ml: "ชื่อตัวเลือก" = กลิ่น, ขนาดอยู่ในชื่อสินค้า/SKU
 *  จึงรวมทุกช่องเป็น haystack แล้ว match กับ master */
function deriveProductSize(title: string, sku: string, variation: string, products: string[]): { product: string; size: string; matched: boolean } {
  const size = extractMl(variation, sku, title);
  const matched = matchMasterScent(`${variation} ${sku} ${title}`, products);
  if (matched) return { product: matched, size, matched: true };
  // fallback: ชื่อตัวเลือกที่ไม่ใช่ขนาด = น่าจะเป็นกลิ่น; ไม่งั้นถอดขนาด/รหัสออกจาก SKU
  let guess = "";
  if (variation && !/ml/i.test(variation)) guess = variation.split(/[,(/|]/)[0].trim();
  else guess = sku.replace(/\d+(?:\.\d+)?\s*ml/ig, "").replace(/^lab/i, "").replace(/[-_]+/g, " ").trim();
  return { product: guess || title, size, matched: false };
}

/** ตัด prefix "จังหวัด/อำเภอ/เขต" ให้ตรงกับ dropdown ในระบบ */
const cleanProvince = (s: any) => str(s).replace(/^จังหวัด\s*/, "").replace(/^จ\.\s*/, "").trim();
const cleanDistrict = (s: any) => str(s).replace(/^(อำเภอ|เขต|อ\.)\s*/, "").trim();

export type ParseResult = {
  orders: OrderWithItems[];
  totalRows: number;
  itemCount: number;
  errors: { row: number; message: string }[];
  noItemOrders: number;   // order numbers found but with no product/size rows
  orderNos: string[];     // all distinct order numbers seen (for match-print)
  unmatchedItems: number; // รายการที่เดากลิ่นไม่ตรง master (ต้องให้ user ตรวจ)
};

/**
 * Convert flat rows (array of {header: value}) into grouped orders keyed by
 * Order No. Order-level fields come from the first row that carries them.
 */
export function rowsToOrders(rows: Record<string, any>[], products: string[] = []): ParseResult {
  const map = new Map<string, OrderWithItems>();
  const errors: { row: number; message: string }[] = [];
  let itemCount = 0;
  let unmatchedItems = 0;

  rows.forEach((raw, idx) => {
    const rowNo = idx + 2; // + header row
    // remap keys to canonical fields
    const r: Partial<Record<Field, any>> = {};
    for (const [k, v] of Object.entries(raw)) {
      const f = mapHeader(k);
      // เก็บค่าแรกที่ไม่ว่างต่อ field (กันหัวตารางซ้ำที่ว่างมาทับ)
      if (f && str(v) !== "" && str(r[f]) === "") r[f] = v;
    }

    const orderNo = str(r.order_no);
    // ข้อมูลสินค้าดิบ: บาง export ไม่มีคอลัมน์กลิ่นชัดเจน (ชื่อสินค้า=title, ชื่อตัวเลือก=size/กลิ่น)
    const title = str(r.product_label);
    const skuRaw = str(r.sku);
    const hasProductData = !!(str(r.product) || title || skuRaw);
    if (!orderNo) {
      if (hasProductData) errors.push({ row: rowNo, message: "ไม่มี Order No." });
      return;
    }

    let ord = map.get(orderNo);
    if (!ord) {
      ord = {
        order_no: orderNo,
        platform: "Shopee",
        doc_no: str(r.doc_no) || null,
        doc_date: toDateStr(r.doc_date),
        month_label: str(r.month_label) || null,
        channel: str(r.channel) || "Shopee",
        shop_name: null,
        username: str(r.username) || null,
        receiver: str(r.receiver) || null,
        phone: str(r.phone) || null,
        customer_type: str(r.customer_type) || null,
        purchase_count: r.purchase_count ? Number(r.purchase_count) : null,
        district: cleanDistrict(r.district) || null,
        province: cleanProvince(r.province) || null,
        postcode: str(r.postcode) || null,
        address: str(r.address) || null,
        campaign: str(r.campaign) || null,
        note: str(r.note) || null,
        box_scent: str(r.box_scent) || null,
        order_date: toDateStr(r.order_date),
        items: [],
      };
      map.set(orderNo, ord);
    } else {
      // fill order-level blanks from later rows
      const fill = (k: keyof OrderWithItems, v: any) => { if (!(ord as any)[k] && v) (ord as any)[k] = v; };
      fill("receiver", str(r.receiver));
      fill("phone", str(r.phone));
      fill("province", cleanProvince(r.province));
      fill("district", cleanDistrict(r.district));
      fill("postcode", str(r.postcode));
      fill("address", str(r.address));
      fill("customer_type", str(r.customer_type));
    }

    if (hasProductData) {
      // ถ้ามีคอลัมน์กลิ่นชัดเจน (format ภายในเดิม) ใช้ตรง ๆ; ไม่งั้นเดาจาก title/SKU/ชื่อตัวเลือก
      let product = str(r.product);
      let size = str(r.size);
      if (!product) {
        const d = deriveProductSize(title, skuRaw, size, products);
        product = d.product;
        size = d.size;
        if (!d.matched) unmatchedItems += 1;
      }
      const isFree = str(r.free) !== "";
      const item: OrderItem = {
        line_no: ord.items.length + 1,
        product,
        size,
        is_free: isFree,
        qty: r.qty != null && r.qty !== "" ? Number(r.qty) : 1,
        unit: "ขวด",
        product_label: title || buildProductLabel(product, size, isFree),
        sku: skuRaw || null,
      };
      ord.items.push(item);
      itemCount += 1;
    }
  });

  // drop orders that ended up with no items (e.g. a "to-ship" list of order
  // numbers only, with no product columns)
  const all = [...map.values()];
  const orders = all.filter((o) => o.items.length > 0);
  const noItemOrders = all.length - orders.length;
  return { orders, totalRows: rows.length, itemCount, errors, noItemOrders, orderNos: [...map.keys()], unmatchedItems };
}
