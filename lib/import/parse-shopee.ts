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

export type ParseResult = {
  orders: OrderWithItems[];
  totalRows: number;
  itemCount: number;
  errors: { row: number; message: string }[];
  noItemOrders: number;   // order numbers found but with no product/size rows
  orderNos: string[];     // all distinct order numbers seen (for match-print)
};

/**
 * Convert flat rows (array of {header: value}) into grouped orders keyed by
 * Order No. Order-level fields come from the first row that carries them.
 */
export function rowsToOrders(rows: Record<string, any>[]): ParseResult {
  const map = new Map<string, OrderWithItems>();
  const errors: { row: number; message: string }[] = [];
  let itemCount = 0;

  rows.forEach((raw, idx) => {
    const rowNo = idx + 2; // + header row
    // remap keys to canonical fields
    const r: Partial<Record<Field, any>> = {};
    for (const [k, v] of Object.entries(raw)) {
      const f = mapHeader(k);
      if (f) r[f] = v;
    }

    const orderNo = str(r.order_no);
    const product = str(r.product);
    if (!orderNo) {
      if (product) errors.push({ row: rowNo, message: "ไม่มี Order No." });
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
        district: str(r.district) || null,
        province: str(r.province) || null,
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
      fill("province", str(r.province));
      fill("district", str(r.district));
      fill("postcode", str(r.postcode));
      fill("address", str(r.address));
      fill("customer_type", str(r.customer_type));
    }

    if (product) {
      const size = str(r.size);
      const isFree = str(r.free) !== "";
      const item: OrderItem = {
        line_no: ord.items.length + 1,
        product,
        size,
        is_free: isFree,
        qty: r.qty != null && r.qty !== "" ? Number(r.qty) : 1,
        unit: "ขวด",
        product_label: str(r.product_label) || buildProductLabel(product, size, isFree),
        sku: str(r.sku) || null,
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
  return { orders, totalRows: rows.length, itemCount, errors, noItemOrders, orderNos: [...map.keys()] };
}
