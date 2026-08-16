import Link from "next/link";
import { requireStock } from "@/lib/auth/require-user";
import { can } from "@/lib/auth/roles";
import { listStock, getProducts, getSizes, stockSummary } from "@/lib/queries";
import StockManager from "@/components/StockManager";
import { ScanLine, FileDown } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function StockPage({ searchParams }: { searchParams: Promise<{ low?: string }> }) {
  const me = await requireStock();
  const isAdmin = can.manageStock(me.role);   // admin + ฝ่ายคลัง = แก้สต๊อกได้
  const { low } = await searchParams;
  const [rows, products, sizes, sum] = await Promise.all([
    listStock({ limit: 5000 }),
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
          <a href="/api/export/stock" className="btn-ghost"><FileDown size={16} /> Export</a>
          <Link href="/stock/issue" className="btn-primary"><ScanLine size={16} /> ตัดสต๊อก (สแกน)</Link>
        </div>
      </div>
      <StockManager rows={rows} products={products} sizes={sizes} initialLow={low === "1"} isAdmin={isAdmin} />
    </div>
  );
}
