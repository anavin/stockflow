import Link from "next/link";
import { requireUser } from "@/lib/auth/require-user";
import { listStock, getProducts, getSizes, stockSummary } from "@/lib/queries";
import StockManager from "@/components/StockManager";
import { ScanLine, FileDown } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function StockPage({ searchParams }: { searchParams: Promise<{ q?: string; low?: string }> }) {
  const me = await requireUser();
  const isAdmin = me.role === "admin";
  const { q, low } = await searchParams;
  const lowOnly = low === "1";
  const [rows, products, sizes, sum] = await Promise.all([
    listStock({ search: q, lowOnly }),
    getProducts(), getSizes(), stockSummary(),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink">สต๊อกสินค้า</h1>
          <p className="text-sm text-muted">{sum.skus.toLocaleString()} รายการ (SKU) · ใกล้หมด {sum.low.toLocaleString()} · ตัดสต๊อกแล้ว {sum.issuedOrders.toLocaleString()} ใบ</p>
        </div>
        <div className="flex gap-2">
          <a href={`/api/export/stock${q ? `?q=${encodeURIComponent(q)}` : ""}`} className="btn-ghost"><FileDown size={16} /> Export</a>
          <Link href="/stock/issue" className="btn-primary"><ScanLine size={16} /> ตัดสต๊อก (สแกน)</Link>
        </div>
      </div>
      <StockManager rows={rows} products={products} sizes={sizes} q={q} low={lowOnly} isAdmin={isAdmin} />
    </div>
  );
}
