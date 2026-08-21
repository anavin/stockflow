import { buildProductLabel, type OrderWithItems } from "@/lib/types";
import { deriveProductSize, type ParseResult } from "./parse-shopee";

/**
 * แปลงไฟล์ export ของ TikTok Shop (sheet "OrderSKUList", 1 แถว = 1 SKU) → ออเดอร์จัดกลุ่มด้วย Order ID.
 *
 * ต่างจาก Shopee/Lazada:
 *  - แถวที่ 2 ของไฟล์เป็น "คำอธิบายคอลัมน์" ไม่ใช่ข้อมูล → กรองทิ้งด้วย Order ID ต้องเป็นเลขล้วน
 *  - มีคอลัมน์ Quantity ชัดเจน (ไม่ต้องนับแถวเหมือน Lazada)
 *  - Created Time = "DD/MM/YYYY HH:MM:SS" (ต้อง parse เอง toDateStr มาตรฐานอ่านไม่ได้)
 *  - Seller SKU ("NeverBlue4ml") ช่วยแมตช์กลิ่นได้ดี แต่ไม่เก็บให้อัตโนมัติ (user เติมตอนตัดสต๊อก — เหมือน Lazada)
 *  - ไฟล์ใช้ ExcelJS อ่านไม่ออก → route ต้องอ่านด้วย readXlsxRaw ก่อนส่งเข้ามาที่นี่
 */
const str = (v: any) => (v == null ? "" : String(v).trim());
const num = (v: any) => { const n = Number(String(v ?? "").replace(/[^\d.-]/g, "")); return isNaN(n) ? 0 : n; };
const cleanProvince = (s: any) => str(s).replace(/^จังหวัด\s*/, "").replace(/^จ\.\s*/, "").trim();
const cleanDistrict = (s: any) => str(s).replace(/^(อำเภอ|เขต|อ\.)\s*/, "").trim();
const cleanSub = (s: any) => str(s).replace(/^(ตำบล|แขวง|ต\.)\s*/, "").trim();

/** "DD/MM/YYYY HH:MM:SS" (รูปแบบ TikTok) → "YYYY-MM-DD"; เผื่อ fallback รูปแบบอื่น */
function tiktokDate(v: any): string | null {
  const s = str(v);
  if (!s) return null;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  const iso = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
  return null;
}

type ItemAgg = { product: string; size: string; is_free: boolean; label: string; qty: number };

export function rowsToOrders(rows: Record<string, any>[], products: string[] = [], aliases: Record<string, string> = {}): ParseResult {
  const map = new Map<string, OrderWithItems>();
  const agg = new Map<string, Map<string, ItemAgg>>();
  const errors: { row: number; message: string }[] = [];
  let itemCount = 0, unmatchedItems = 0;

  rows.forEach((raw, idx) => {
    const rowNo = idx + 2;
    const g = (k: string) => raw[k];
    const orderNo = str(g("Order ID"));
    // แถวคำอธิบายคอลัมน์ (Order ID = "Platform unique order ID.") → ข้าม; Order ID จริงเป็นเลขล้วน
    if (!/^\d{6,}$/.test(orderNo)) return;

    const title = str(g("Product Name"));
    const sku = str(g("Seller SKU"));
    const hasItem = !!(title || sku);

    // ที่อยู่ TikTok: Province · District(อำเภอ) · Districts(ตำบล) · Zipcode · Detail Address (+ Additional)
    const province = cleanProvince(g("Province"));
    const district = cleanDistrict(g("District"));
    const subdistrict = cleanSub(g("Districts"));
    const postcode = str(g("Zipcode")).replace(/[^\d]/g, "");
    const street = [str(g("Detail Address")), str(g("Additional address information"))].filter(Boolean).join(" ");

    let ord = map.get(orderNo);
    if (!ord) {
      ord = {
        order_no: orderNo,
        platform: "Tiktok",
        doc_no: null,
        doc_date: tiktokDate(g("Created Time")),
        month_label: null,
        channel: "TikTok",
        shop_name: null,
        username: str(g("Buyer Username")) || null,
        receiver: str(g("Recipient")) || null,
        phone: str(g("Phone #")) || null,
        customer_type: null,
        purchase_count: null,
        district: district || null,
        subdistrict: subdistrict || null,
        province: province || null,
        postcode: postcode || null,
        address: street || null,
        campaign: null,
        note: str(g("Buyer Message")) || str(g("Seller Note")) || null,
        box_scent: null,
        order_date: tiktokDate(g("Created Time")),
        items: [],
      };
      map.set(orderNo, ord);
      agg.set(orderNo, new Map());
    } else {
      const fill = (k: keyof OrderWithItems, v: string) => { if (!(ord as any)[k] && v) (ord as any)[k] = v; };
      fill("receiver", str(g("Recipient")));
      fill("phone", str(g("Phone #")));
      fill("province", province);
      fill("district", district);
      fill("subdistrict", subdistrict);
      fill("postcode", postcode);
      fill("address", street);
    }

    if (!hasItem) {
      if (!orderNo) errors.push({ row: rowNo, message: "ไม่มี Order ID" });
      return;
    }
    // Variation ของ TikTok = ขนาด ("4ml"/"10ml") แต่บางแถวใส่ชื่อกลิ่นมาแทน → รวมกับ Seller SKU/ชื่อสินค้าให้ deriveProductSize เดา
    const variation = str(g("Variation"));
    const d = deriveProductSize(title, sku, variation, products, aliases);
    if (!d.matched) unmatchedItems += 1;
    // ราคา 0 = ของแถม (guard: ต้องมีค่าจริง ไม่งั้นเทมเพลตว่าง = แถมทั้งหมด)
    const priceRaw = str(g("SKU Unit Original Price"));
    const isFree = priceRaw !== "" && num(priceRaw) === 0;
    const qty = Math.max(1, num(g("Quantity")) || 1);

    const key = `${d.product}|${d.size}|${isFree ? 1 : 0}`;
    const bucket = agg.get(orderNo)!;
    const ex = bucket.get(key);
    // ไม่เก็บ SKU อัตโนมัติ — user เติมเองตอนตัดสต๊อก (Seller SKU ใช้แค่ช่วยแมตช์กลิ่นด้านบน)
    if (ex) ex.qty += qty;
    else bucket.set(key, { product: d.product, size: d.size, is_free: isFree, label: title || buildProductLabel(d.product, d.size, isFree), qty });
    itemCount += 1;
  });

  for (const [orderNo, ord] of map) {
    let ln = 0;
    for (const it of agg.get(orderNo)!.values()) {
      ord.items.push({ line_no: ++ln, product: it.product, size: it.size, is_free: it.is_free, qty: it.qty, unit: "ขวด", product_label: it.label, sku: null });
    }
  }

  const all = [...map.values()];
  const orders = all.filter((o) => o.items.length > 0);
  return { orders, totalRows: rows.length, itemCount, errors, noItemOrders: all.length - orders.length, orderNos: [...map.keys()], unmatchedItems };
}
