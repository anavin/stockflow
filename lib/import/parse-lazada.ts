import { buildProductLabel, type OrderWithItems } from "@/lib/types";
import { toDateStr, deriveProductSize, type ParseResult } from "./parse-shopee";

/**
 * แปลงไฟล์ export ของ Lazada (1 แถว = สินค้า 1 ชิ้น) → ออเดอร์จัดกลุ่มด้วย orderNumber.
 * ต่างจาก Shopee: ไม่มีคอลัมน์ Free/จำนวน · itemName เป็นชื่อประกาศเต็ม (แมตช์กลิ่นจาก master)
 * · ที่อยู่แยก 5 ช่อง · ราคา 0 = ของแถม.
 */
const str = (v: any) => (v == null ? "" : String(v).trim());
const num = (v: any) => { const n = Number(String(v ?? "").replace(/[^\d.-]/g, "")); return isNaN(n) ? 0 : n; };

type ItemAgg = { product: string; size: string; is_free: boolean; sku: string | null; label: string; qty: number };

export function rowsToOrders(rows: Record<string, any>[], products: string[] = []): ParseResult {
  const map = new Map<string, OrderWithItems>();
  const agg = new Map<string, Map<string, ItemAgg>>();   // orderNo → key(product|size|free) → รวมจำนวน
  const errors: { row: number; message: string }[] = [];
  let itemCount = 0, unmatchedItems = 0;

  rows.forEach((raw, idx) => {
    const rowNo = idx + 2;
    const g = (k: string) => raw[k];
    const orderNo = str(g("orderNumber"));
    const itemName = str(g("itemName"));
    const sku = str(g("sellerSku"));
    const hasItem = !!(itemName || sku);
    if (!orderNo) { if (hasItem) errors.push({ row: rowNo, message: "ไม่มี orderNumber" }); return; }

    let ord = map.get(orderNo);
    if (!ord) {
      const addr = ["shippingAddress", "shippingAddress2", "shippingAddress3", "shippingAddress4", "shippingAddress5"]
        .map((k) => str(g(k))).filter(Boolean).join(" ");
      ord = {
        order_no: orderNo,
        platform: "Lazada",
        doc_no: null,
        doc_date: toDateStr(g("createTime")),
        month_label: null,
        channel: "Lazada",
        shop_name: null,
        username: str(g("customerName")) || null,
        receiver: str(g("shippingName")) || null,
        phone: str(g("shippingPhone")) || str(g("shippingPhone2")) || null,
        customer_type: null,
        purchase_count: null,
        district: str(g("shippingCity")) || null,
        subdistrict: null,
        province: str(g("shippingRegion")) || null,
        postcode: str(g("shippingPostCode")) || null,
        address: addr || null,
        campaign: null,
        note: str(g("sellerNote")) || null,
        box_scent: null,
        order_date: toDateStr(g("createTime")),
        items: [],
      };
      map.set(orderNo, ord);
      agg.set(orderNo, new Map());
    } else {
      // เติมช่องที่ว่างจากแถวถัดไปของออเดอร์เดียวกัน
      const fill = (k: keyof OrderWithItems, v: string) => { if (!(ord as any)[k] && v) (ord as any)[k] = v; };
      fill("receiver", str(g("shippingName")));
      fill("phone", str(g("shippingPhone")) || str(g("shippingPhone2")));
      fill("province", str(g("shippingRegion")));
      fill("district", str(g("shippingCity")));
      fill("postcode", str(g("shippingPostCode")));
    }

    if (!hasItem) return;
    const variation = str(g("variation"));
    const d = deriveProductSize(itemName, sku, variation, products);
    if (!d.matched) unmatchedItems += 1;
    // ราคา 0 = ของแถม (เฉพาะเมื่อมีข้อมูลราคา ไม่งั้นเทมเพลตว่างจะกลายเป็นแถมทั้งหมด)
    const priced = str(g("unitPrice")) || str(g("paidPrice"));
    const isFree = priced !== "" && num(g("unitPrice")) === 0 && num(g("paidPrice")) === 0;
    // รวมจำนวน: Lazada 1 แถว = 1 ชิ้น → รวมแถวที่ กลิ่น|ขนาด|แถม เหมือนกัน
    const key = `${d.product}|${d.size}|${isFree ? 1 : 0}`;
    const bucket = agg.get(orderNo)!;
    const ex = bucket.get(key);
    if (ex) ex.qty += 1;
    else bucket.set(key, { product: d.product, size: d.size, is_free: isFree, sku: sku || null, label: itemName || buildProductLabel(d.product, d.size, isFree), qty: 1 });
    itemCount += 1;
  });

  // สร้าง items จากที่รวมจำนวนแล้ว
  for (const [orderNo, ord] of map) {
    let ln = 0;
    for (const it of agg.get(orderNo)!.values()) {
      ord.items.push({ line_no: ++ln, product: it.product, size: it.size, is_free: it.is_free, qty: it.qty, unit: "ขวด", product_label: it.label, sku: it.sku });
    }
  }

  const all = [...map.values()];
  const orders = all.filter((o) => o.items.length > 0);
  return { orders, totalRows: rows.length, itemCount, errors, noItemOrders: all.length - orders.length, orderNos: [...map.keys()], unmatchedItems };
}
