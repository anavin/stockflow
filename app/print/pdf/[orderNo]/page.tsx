import { requireUser } from "@/lib/auth/require-user";
import { getOrder } from "@/lib/queries";
import { notFound } from "next/navigation";
import PdfClient from "@/components/PdfClient";

export const dynamic = "force-dynamic";

/** สร้าง PDF ใบเบิกฝั่ง client (ดึงข้อมูลฝั่ง server — Workers ทำได้ ส่วนเรนเดอร์ PDF ทำในเบราว์เซอร์) */
export default async function PrintPdfPage({ params }: { params: Promise<{ orderNo: string }> }) {
  await requireUser();
  const { orderNo } = await params;
  const order = await getOrder(decodeURIComponent(orderNo));
  if (!order) notFound();
  return <PdfClient order={order} filename={`ใบเบิก-${order.doc_no || order.order_no}.pdf`} />;
}
