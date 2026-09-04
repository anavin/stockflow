import { renderToBuffer } from "@react-pdf/renderer";
import { writeFileSync } from "fs";
import { WithdrawalDocument } from "@/lib/pdf/withdrawal-sp-document";

const order: any = {
  order_no: "SP-NOTE-OVERFLOW", platform: "Shopee", doc_no: "SH-2609-9", doc_date: "2026-09-04",
  username: "ทดสอบ", receiver: "อนาวิน", customer_type: "ลูกค้าเก่า", purchase_count: 2,
  address: "288/31", subdistrict: "ราชาเทวะ", district: "บางพลี", province: "สมุทรปราการ", postcode: "10540",
  note: "ลูกค้าขอให้ห่อของขวัญและแนบการ์ดอวยพรวันเกิดพร้อมฉีดน้ำหอมกล่องกลิ่นซากุระด้วยนะคะขอบคุณมากค่ะจัดส่งด่วนพิเศษ",
  items: [{ id: 1, line_no: 1, product: "Zeus", size: "50 ml", is_free: false, qty: 1, unit: "ขวด", ptype: "EDP", sku: "Z1" }],
};
async function main(){ writeFileSync("_audit_note.pdf", await renderToBuffer(WithdrawalDocument({ order }) as any)); console.log("done"); }
main().catch((e)=>{console.error(e);process.exit(1);});
