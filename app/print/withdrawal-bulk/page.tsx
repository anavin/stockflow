import { notFound, redirect } from "next/navigation";
import { getOrder } from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth/session";
import type { OrderWithItems } from "@/lib/types";
import WithdrawalSheet from "@/components/WithdrawalSheet";
import PrintNow from "@/components/PrintNow";

export const dynamic = "force-dynamic";

/** ใบเบิกหลายใบในหน้าเดียว (1 ออร์เดอร์ = 1 หน้า A4) — สำหรับ Puppeteer เก็บเป็น PDF เดียว */
export default async function WithdrawalBulkPrintPage({ searchParams }: { searchParams: Promise<{ orders?: string; pdf?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { orders: raw, pdf } = await searchParams;
  const nos = (raw || "").split(",").map((s) => decodeURIComponent(s.trim())).filter(Boolean).slice(0, 200);
  if (!nos.length) notFound();
  const fetched = await Promise.all(nos.map((n) => getOrder(n)));
  const orders = fetched.filter((o): o is OrderWithItems => !!o);
  if (!orders.length) notFound();

  return (
    <div className="print-area" style={{ background: "#fff", padding: "10mm" }}>
      <PrintNow title={`ใบเบิก ${orders.length} ใบ`} auto={pdf !== "1"} />
      {orders.map((order, i) => (
        <div key={order.order_no} style={{ breakAfter: i < orders.length - 1 ? "page" : "auto" }}>
          <WithdrawalSheet order={order} />
        </div>
      ))}
    </div>
  );
}
