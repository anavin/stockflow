import { buildProductLabel, type OrderWithItems } from "@/lib/types";
import { toDateStr, deriveProductSize, type ParseResult } from "./parse-shopee";

/**
 * แปลงไฟล์ export ของ Lazada (1 แถว = สินค้า 1 ชิ้น) → ออเดอร์จัดกลุ่มด้วย orderNumber.
 * ต่างจาก Shopee: ไม่มีคอลัมน์ Free/จำนวน · itemName เป็นชื่อประกาศเต็ม (แมตช์กลิ่นจาก master)
 * · ที่อยู่แยก 5 ช่อง · ราคา 0 = ของแถม.
 */
const str = (v: any) => (v == null ? "" : String(v).trim());
const num = (v: any) => { const n = Number(String(v ?? "").replace(/[^\d.-]/g, "")); return isNaN(n) ? 0 : n; };
// ค่าที่อยู่ Lazada เป็นรูปแบบ "ไทย/ English" (เช่น "กรุงเทพมหานคร/ Bangkok") → เอาเฉพาะภาษาไทยหน้า "/"
const th = (v: any) => str(v).split("/")[0].trim();

type ItemAgg = { product: string; size: string; is_free: boolean; sku: string | null; label: string; qty: number };

export function rowsToOrders(rows: Record<string, any>[], products: string[] = [], aliases: Record<string, string> = {}): ParseResult {
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

    // ที่อยู่ Lazada: shippingAddress=ถนน · Address3=จังหวัด · Address4=อำเภอ/เขต · Address5/PostCode=รหัส
    // (shippingRegion มักว่าง · shippingCity=อำเภอซ้ำ) · ตำบลบางทีต่อท้าย street หลัง "·"
    const street = [str(g("shippingAddress")), str(g("shippingAddress2"))].filter(Boolean).join(" ");
    const province = th(g("shippingAddress3")) || th(g("shippingRegion"));
    const district = th(g("shippingAddress4")) || th(g("shippingCity"));
    const postcode = str(g("shippingPostCode")) || str(g("shippingAddress5"));
    const subdistrict = street.includes("·") ? th(street.split("·").pop()) : "";

    let ord = map.get(orderNo);
    if (!ord) {
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
        district: district || null,
        subdistrict: subdistrict || null,
        province: province || null,
        postcode: postcode || null,
        address: street || null,
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
      fill("province", province);
      fill("district", district);
      fill("postcode", postcode);
      fill("address", street);
    }

    if (!hasItem) return;
    // variation ของ Lazada = "ATTRIBUTE:VALUE" เช่น "กลิ่นหอม:Vivid ดอกไม้ขาว" / "ปริมาตรของสินค้า:10 ml"
    // → ตัด prefix ออก เหลือเฉพาะค่า (ทั้งช่วยแมตช์กลิ่น + fallback ไม่ติดคำว่า "กลิ่นหอม:")
    const rawVar = str(g("variation"));
    const variation = rawVar.includes(":") ? rawVar.slice(rawVar.indexOf(":") + 1).trim() : rawVar;
    const d = deriveProductSize(itemName, sku, variation, products, aliases);
    if (!d.matched) unmatchedItems += 1;
    // ราคาสินค้า (unitPrice) = 0 → ของแถม (เฉพาะเมื่อมีค่า ไม่งั้นเทมเพลตว่างจะกลายเป็นแถมทั้งหมด)
    const isFree = str(g("unitPrice")) !== "" && num(g("unitPrice")) === 0;
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
