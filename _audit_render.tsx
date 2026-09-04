import { renderToBuffer } from "@react-pdf/renderer";
import { writeFileSync } from "fs";
import { WithdrawalDocument, DeliveryNoteDocument } from "@/lib/pdf/withdrawal-sp-document";

const order: any = {
  order_no: "SP-TESTGLYPH-001",
  platform: "Shopee",
  doc_no: "SH-2609-0001",
  doc_date: "2026-09-04",
  username: "ทดสอบผู้ใช้",
  receiver: "อนาวินทดสอบนามสกุลไทย",
  phone: "0812341438",
  customer_type: "ลูกค้าเก่า",
  purchase_count: 3,
  address: "288/31 หมู่ที่ 12",
  subdistrict: "ราชาเทวะ",
  district: "บางพลี",
  province: "สมุทรปราการ",
  postcode: "10540",
  campaign: "แคมเปญทดสอบ",
  box_scent: "กลิ่นทดสอบ",
  note: "ส่งด่วน หมายเหตุทดสอบไทย",
  items: [
    { id: 1, line_no: 1, product: "Zeus", size: "50 ml", is_free: false, qty: 2, unit: "ขวด", ptype: "EDP", sku: "Z50-001" },
    { id: 2, line_no: 2, product: "ถุงกระดาษไทย", size: "Size S", is_free: true, qty: 1, unit: "ใบ", ptype: null, sku: "" },
  ],
};

const wholesale: any = {
  ...order,
  order_no: "WPO-TEST-002",
  platform: "Eveandboy",
  branch: "เซ็นทรัลเวิลด์",
  branch_code: "EVB-001",
  stock_issued_at: "2026-09-04T00:00:00Z",
  items: [
    { id: 1, line_no: 1, product: "Zeus", size: "50 ml", is_free: false, qty: 5, unit: "ขวด", ptype: "EDP", barcode: "8857128011027" },
  ],
};

async function main() {
  const b1 = await renderToBuffer(WithdrawalDocument({ order }) as any);
  writeFileSync("_audit_withdrawal.pdf", b1);
  const b2 = await renderToBuffer(DeliveryNoteDocument({ order: wholesale }) as any);
  writeFileSync("_audit_delivery.pdf", b2);
  console.log("done", b1.length, b2.length);
}
main().catch((e) => { console.error(e); process.exit(1); });
