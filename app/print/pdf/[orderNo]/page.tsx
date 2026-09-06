import { requireUser } from "@/lib/auth/require-user";
import { can } from "@/lib/auth/roles";
import { getOrder, getWsData } from "@/lib/queries";
import { isWholesalePlatform } from "@/lib/config";
import { notFound } from "next/navigation";
import PdfClient from "@/components/PdfClient";
import { packingQrMatrix, qrOnSlipEnabled } from "@/lib/packing-link";

export const dynamic = "force-dynamic";

/** สร้าง PDF ใบเบิกฝั่ง client (ดึงข้อมูลฝั่ง server — Workers ทำได้ ส่วนเรนเดอร์ PDF ทำในเบราว์เซอร์) */
export default async function PrintPdfPage({ params }: { params: Promise<{ orderNo: string }> }) {
  const me = await requireUser();
  // ใบเบิกมี PII (ผู้รับ/เบอร์/ที่อยู่) → เฉพาะฝ่ายสร้างใบเบิก/ตัดสต๊อก (เท่ากับ API print route)
  if (!can.createOrders(me.role) && !can.issueStock(me.role)) notFound();
  const { orderNo } = await params;
  const order = await getOrder(decodeURIComponent(orderNo));
  if (!order) notFound();
  const ws = isWholesalePlatform(order.platform) ? await getWsData(order.platform!) : undefined;
  // QR ลิงก์คลิปตอนแพค — ปิดไว้ก่อน (เปิดด้วย env PACKING_CAM_QR_ON_SLIP=1)
  // คำนวณฝั่ง server เสมอ เพื่อไม่ให้กุญแจลับหลุดไปเบราว์เซอร์
  const packingQr = qrOnSlipEnabled() ? await packingQrMatrix(order.order_no) : null;
  return <PdfClient order={order} ws={ws} packingQr={packingQr} filename={`ใบเบิก-${order.doc_no || order.order_no}.pdf`} />;
}
