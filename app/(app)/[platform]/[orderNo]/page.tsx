import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrder, getProducts, getSizes, getProvinces, getPostcodes, getProductCodes, getProductTypes, getBlockedSizesForOrder } from "@/lib/queries";
import { resolvePlatform, platformBase, platformColor, platformTint, isWholesalePlatform } from "@/lib/config";
import OrderForm from "@/components/OrderForm";
import CtwPushButton from "@/components/CtwPushButton";
import ReverseIssueButton from "@/components/ReverseIssueButton";
import ResetIssueButton from "@/components/ResetIssueButton";
import { ChevronLeft, Printer, ScanLine, PackageCheck } from "lucide-react";
import { requireCreator } from "@/lib/auth/require-user";
import { can, isAdmin } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

export default async function EditOrderPage({ params }: { params: Promise<{ platform: string; orderNo: string }> }) {
  const me = await requireCreator();
  const { platform, orderNo } = await params;
  const pf = resolvePlatform(platform);
  if (!pf) notFound();
  const base = platformBase(pf.code);
  const decoded = decodeURIComponent(orderNo);
  const [order, products, sizes, provinces, postcodes, productCodes, productTypes, discontinued] = await Promise.all([
    getOrder(decoded), getProducts(), getSizes(), getProvinces(), getPostcodes(), getProductCodes(), getProductTypes(), getBlockedSizesForOrder(),
  ]);
  if (!order) notFound();

  const pfColor = platformColor(pf.code);
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">
      <div className="mb-5 h-1 w-full rounded-full" style={{ backgroundColor: pfColor }} />
      <div className="mb-4 flex items-center justify-between">
        <Link href={base} className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
          <ChevronLeft size={16} /> กลับ
        </Link>
        <div className="flex items-center gap-2">
          {order.stock_issued_at ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-green-50 px-2.5 py-1.5 text-sm font-medium text-green-700">
              <PackageCheck size={16} /> ตัดสต๊อกแล้ว
            </span>
          ) : can.issueStock(me.role) ? (
            <Link href={`/stock/issue?order=${encodeURIComponent(decoded)}`}
              className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm font-medium text-white"
              style={{ backgroundColor: "rgb(37 99 235)" }}>
              <ScanLine size={16} /> ตัดสต๊อก
            </Link>
          ) : null}
          {/* ยกเลิกการตัดสต๊อก — เฉพาะที่ตัดแล้วแต่ยังไม่ส่ง + ไม่มีการคืน (คืนสต๊อก+serial → แก้/ตัดใหม่) */}
          {order.stock_issued_at && !order.shipped_at && (!order.return_status || order.return_status === "none") && can.issueStock(me.role) && (
            <ReverseIssueButton orderNo={decoded} platform={pf.code} />
          )}
          {/* รีเซ็ตใบเบิก (แอดมิน) — สำหรับใบที่ตัน: ตัดแล้ว + ส่งแล้ว หรือมีการคืน → ตัดใหม่ไม่ได้ */}
          {order.stock_issued_at && (order.shipped_at || (order.return_status && order.return_status !== "none")) && isAdmin(me.role) && (
            <ResetIssueButton orderNo={decoded} platform={pf.code} />
          )}
          {pf.code === "CTW" && <CtwPushButton orderNo={decoded} issued={!!order.stock_issued_at} pushedAt={order.ctw_received_at ?? null} />}
          <a href={`/print/pdf/${encodeURIComponent(decoded)}`} target="_blank" rel="noreferrer" className="btn-ghost">
            <Printer size={16} /> พิมพ์ใบเบิก (PDF)
          </a>
          {isWholesalePlatform(pf.code) && (
            <a href={`/api/delivery/${encodeURIComponent(decoded)}`} target="_blank" rel="noreferrer" className="btn-ghost">
              <Printer size={16} /> ใบส่งของ (PDF)
            </a>
          )}
        </div>
      </div>
      <div className="mb-1 flex items-center gap-2">
        <h1 className="text-xl font-bold text-ink">แก้ไขใบเบิก</h1>
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold"
          style={{ color: pfColor, backgroundColor: platformTint(pf.code) }}>
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: pfColor }} /> {pf.name}
        </span>
      </div>
      <p className="mb-6 font-mono text-sm text-muted">{order.doc_no} · {order.order_no}</p>

      <OrderForm platform={pf.code} products={products} sizes={sizes} provinces={provinces} postcodes={postcodes} initial={order} productCodes={productCodes} productTypes={productTypes} discontinued={discontinued} />
    </div>
  );
}
