import Link from "next/link";
import { requireStock } from "@/lib/auth/require-user";
import { can } from "@/lib/auth/roles";
import { listStock, getProducts, getSizes, stockSummary, getDiscontinued, getSkuLookup, stockUnitMismatches, getClosedSkus } from "@/lib/queries";
import StockManager from "@/components/StockManager";
import SalesManager from "@/components/SalesManager";
import { ScanLine, FileDown, ScanBarcode, AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function StockPage({ searchParams }: { searchParams: Promise<{ low?: string }> }) {
  const me = await requireStock();
  const isAdmin = can.manageStock(me.role);   // admin + ฝ่ายคลัง = แก้สต๊อกได้
  const { low } = await searchParams;
  const [rows, products, sizes, sum, discontinued, skuMap, mismatches, closedSkus] = await Promise.all([
    listStock({ limit: 5000 }),
    getProducts(), getSizes(), stockSummary(), getDiscontinued(), getSkuLookup(), stockUnitMismatches(), getClosedSkus(),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink">สต๊อกสินค้า</h1>
          <p className="text-sm text-muted">{sum.skus.toLocaleString()} รายการ (SKU) · ใกล้หมด {sum.low.toLocaleString()} · ตัดสต๊อกแล้ว {sum.issuedOrders.toLocaleString()} ใบ</p>
        </div>
        <div className="flex gap-2">
          {isAdmin && <SalesManager rows={rows} closed={closedSkus} />}
          <Link href="/stock/units" className="btn-ghost"><ScanBarcode size={16} /> ติดตาม SKU</Link>
          <a href="/api/export/stock" className="btn-ghost"><FileDown size={16} /> Export</a>
          <Link href="/stock/issue" className="btn-primary"><ScanLine size={16} /> ตัดสต๊อก (สแกน)</Link>
        </div>
      </div>
      {mismatches.length > 0 && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-amber-800">
            <AlertTriangle size={15} /> จำนวน SKU รายชิ้นไม่ตรงยอดรวม ({mismatches.length} รายการ)
          </p>
          <p className="mt-0.5 text-xs text-amber-700">SKU ที่อยู่คลัง (นับรายชิ้น) ไม่เท่ากับยอดคงเหลือ — อาจตัดสต๊อกโดยไม่สแกน SKU หรือปรับยอดมือ</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {mismatches.slice(0, 12).map((m, i) => (
              <Link key={i} href={`/stock/units?product=${encodeURIComponent(m.product)}&size=${encodeURIComponent(m.size)}&status=in_stock`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-white px-2.5 py-1 text-xs hover:border-amber-300"
                title="ดู SKU รายชิ้นของรายการนี้">
                <span className="font-medium text-ink">{m.product}</span>
                <span className="text-muted">{m.size}</span>
                <span className="text-amber-700">SKU {m.units} ≠ ยอด {m.qty}</span>
              </Link>
            ))}
            {mismatches.length > 12 && <span className="self-center text-xs text-amber-700">…อีก {mismatches.length - 12}</span>}
          </div>
        </div>
      )}
      <StockManager rows={rows} products={products} sizes={sizes} initialLow={low === "1"} isAdmin={isAdmin} discontinued={discontinued} skuMap={skuMap} closedSkus={closedSkus} />
    </div>
  );
}
