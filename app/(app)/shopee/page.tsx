import Link from "next/link";
import { listOrders, getMonths, countOrders } from "@/lib/queries";
import OrdersTable from "@/components/OrdersTable";
import ShopeeFilters from "@/components/ShopeeFilters";
import { PlusCircle, Upload, ChevronLeft, ChevronRight, FileDown } from "lucide-react";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function ShopeePage({ searchParams }: { searchParams: Promise<{ q?: string; month?: string; page?: string }> }) {
  const { q, month, page } = await searchParams;
  const pageNum = Math.max(1, Number(page) || 1);
  const offset = (pageNum - 1) * PAGE_SIZE;

  const [orders, months, total] = await Promise.all([
    listOrders({ platform: "Shopee", search: q, month, limit: PAGE_SIZE, offset }),
    getMonths("Shopee"),
    countOrders({ platform: "Shopee", search: q, month }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : offset + 1;
  const to = offset + orders.length;
  const qs = (p: number) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (month) sp.set("month", month);
    if (p > 1) sp.set("page", String(p));
    const s = sp.toString();
    return `/shopee${s ? "?" + s : ""}`;
  };
  const exportHref = (() => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (month) sp.set("month", month);
    const s = sp.toString();
    return `/api/export/orders${s ? "?" + s : ""}`;
  })();

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink">ใบเบิกสินค้า Shopee</h1>
          <p className="text-sm text-muted">
            ทั้งหมด {total.toLocaleString()} ออร์เดอร์
            {total > 0 && <span className="text-faint"> · แสดง {from.toLocaleString()}–{to.toLocaleString()}</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <a href={exportHref} className="btn-ghost"><FileDown size={16} /> Export</a>
          <Link href="/shopee/import" className="btn-ghost"><Upload size={16} /> นำเข้า</Link>
          <Link href="/shopee/new" className="btn-primary"><PlusCircle size={16} /> สร้างใบเบิก</Link>
        </div>
      </div>

      <ShopeeFilters q={q} month={month} months={months} />

      <OrdersTable orders={orders} />

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-muted">หน้า {pageNum} / {totalPages.toLocaleString()}</span>
          <div className="flex gap-2">
            {pageNum > 1 ? (
              <Link href={qs(pageNum - 1)} className="btn-ghost"><ChevronLeft size={16} /> ก่อนหน้า</Link>
            ) : (
              <span className="btn-ghost pointer-events-none opacity-40"><ChevronLeft size={16} /> ก่อนหน้า</span>
            )}
            {pageNum < totalPages ? (
              <Link href={qs(pageNum + 1)} className="btn-ghost">ถัดไป <ChevronRight size={16} /></Link>
            ) : (
              <span className="btn-ghost pointer-events-none opacity-40">ถัดไป <ChevronRight size={16} /></span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
