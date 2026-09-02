import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrder, getProducts, getSizes, getProvinces, getPostcodes, getProductCodes, getProductTypes, getBlockedSizesForOrder } from "@/lib/queries";
import { resolvePlatform, platformBase, platformColor, platformTint } from "@/lib/config";
import OrderForm from "@/components/OrderForm";
import CtwPushButton from "@/components/CtwPushButton";
import { ChevronLeft, Printer, ScanLine, PackageCheck } from "lucide-react";
import { requireCreator } from "@/lib/auth/require-user";
import { can } from "@/lib/auth/roles";

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
          {pf.code === "CTW" && <CtwPushButton orderNo={decoded} issued={!!order.stock_issued_at} pushedAt={order.ctw_received_at ?? null} />}
          <a href={`/print/pdf/${encodeURIComponent(decoded)}`} target="_blank" rel="noreferrer" className="btn-ghost">
            <Printer size={16} /> พิมพ์ใบเบิก (PDF)
          </a>
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

      {/* read-only picking checklist — staff verify on screen without printing the PDF */}
      {order.items.length > 0 && (() => {
        const totalQty = order.items.reduce((s, it) => s + (Number(it.qty) || 0), 0);
        return (
          <div className="mb-6 overflow-hidden rounded-xl border border-line bg-surface">
            <div className="flex items-center justify-between gap-2 border-b border-line bg-soft px-4 py-2.5">
              <h2 className="text-sm font-semibold text-ink">📋 รายการสินค้า (ตรวจเช็ค)</h2>
              <span className="text-xs text-muted">{order.items.length} รายการ · รวม {totalQty.toLocaleString()} ชิ้น</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-line text-left text-xs text-muted">
                  <th className="px-4 py-2 w-10">#</th>
                  <th className="px-4 py-2">สินค้า</th>
                  <th className="px-4 py-2">ขนาด</th>
                  <th className="px-4 py-2 text-right">จำนวน</th>
                </tr></thead>
                <tbody>
                  {order.items.map((it, i) => (
                    <tr key={it.id ?? i} className="border-b border-line/60">
                      <td className="px-4 py-2 text-muted tabular-nums">{i + 1}</td>
                      <td className="px-4 py-2 text-ink">{it.product}{it.is_free && <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">แถม</span>}</td>
                      <td className="px-4 py-2 text-muted">{it.size || "—"}</td>
                      <td className="px-4 py-2 text-right font-semibold tabular-nums text-ink">{(Number(it.qty) || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      <OrderForm platform={pf.code} products={products} sizes={sizes} provinces={provinces} postcodes={postcodes} initial={order} productCodes={productCodes} productTypes={productTypes} discontinued={discontinued} />
    </div>
  );
}
