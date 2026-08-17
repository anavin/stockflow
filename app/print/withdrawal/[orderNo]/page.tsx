import { notFound, redirect } from "next/navigation";
import { getOrder } from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth/session";
import WithdrawalSheet from "@/components/WithdrawalSheet";
import PrintNow from "@/components/PrintNow";

export const dynamic = "force-dynamic";

/**
 * หน้าพิมพ์ใบเบิกแบบ HTML (พิมพ์ผ่านเบราว์เซอร์ → Save as PDF).
 * เรนเดอร์นอก layout (app) — ไม่มี sidebar/ธีม = หน้าขาวล้วนที่ Safari พิมพ์ได้นิ่ง.
 */
export default async function WithdrawalPrintPage({ params }: { params: Promise<{ orderNo: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { orderNo } = await params;
  const order = await getOrder(decodeURIComponent(orderNo));
  if (!order) notFound();

  return (
    <div className="print-area" style={{ background: "#fff", padding: "10mm", minHeight: "100vh" }}>
      <PrintNow title={`ใบเบิก ${order.doc_no || order.order_no}`} />
      <WithdrawalSheet order={order} />
    </div>
  );
}
