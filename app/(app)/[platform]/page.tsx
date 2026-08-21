import Link from "next/link";
import { notFound } from "next/navigation";
import { listOrders, getMonths, countOrders } from "@/lib/queries";
import { resolvePlatform, platformBase, canImportPlatform } from "@/lib/config";
import OrdersTable from "@/components/OrdersTable";
import ShopeeFilters from "@/components/ShopeeFilters";
import { PlusCircle, Upload, ChevronLeft, ChevronRight, FileDown, FileBarChart, Trash2 } from "lucide-react";
import { requireCreator } from "@/lib/auth/require-user";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function OrdersPage({ params, searchParams }: {
  params: Promise<{ platform: string }>;
  searchParams: Promise<{ q?: string; month?: string; from?: string; to?: string; issued?: string; shipped?: string; page?: string }>;
}) {
  await requireCreator();
  const pf = resolvePlatform((await params).platform);
  if (!pf) notFound();
  const base = platformBase(pf.code);
  const { q, month, from, to, issued, shipped, page } = await searchParams;
  const iss = issued === "yes" || issued === "no" ? issued : undefined;
  const shp = shipped === "yes" || shipped === "no" ? shipped : undefined;
  const pageNum = Math.max(1, Number(page) || 1);
  const offset = (pageNum - 1) * PAGE_SIZE;

  const [orders, months, total] = await Promise.all([
    listOrders({ platform: pf.code, search: q, month, from, to, issued: iss, shipped: shp, limit: PAGE_SIZE, offset }),
    getMonths(pf.code),
    countOrders({ platform: pf.code, search: q, month, from, to, issued: iss, shipped: shp }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rowFrom = total === 0 ? 0 : offset + 1;
  const rowTo = offset + orders.length;
  const buildQs = (extra?: Record<string, string>) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (month) sp.set("month", month);
    if (from) sp.set("from", from);
    if (to) sp.set("to", to);
    if (iss) sp.set("issued", iss);
    if (shp) sp.set("shipped", shp);
    for (const [k, v] of Object.entries(extra ?? {})) if (v) sp.set(k, v);
    return sp.toString();
  };
  const qs = (p: number) => { const s = buildQs(p > 1 ? { page: String(p) } : {}); return `${base}${s ? "?" + s : ""}`; };
  const exportHref = (() => { const s = buildQs({ platform: pf.code }); return `/api/export/orders?${s}`; })();
  const reportHref = (() => { const s = buildQs({ platform: pf.code }); return `/print/daily-report?${s}`; })();

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink">ใบเบิกสินค้า {pf.name}</h1>
          <p className="text-sm text-muted">
            ทั้งหมด {total.toLocaleString()} ออร์เดอร์
            {total > 0 && <span className="text-faint"> · แสดง {rowFrom.toLocaleString()}–{rowTo.toLocaleString()}</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <a href={reportHref} target="_blank" rel="noopener" className="btn-ghost" title="สรุปกลิ่น×ขนาด ตามตัวกรอง (พิมพ์/PDF)"><FileBarChart size={16} /> สรุป</a>
          <a href={exportHref} className="btn-ghost"><FileDown size={16} /> Export</a>
          <Link href={`${base}/trash`} className="btn-ghost" title="ถังขยะ"><Trash2 size={16} /></Link>
          {canImportPlatform(pf.code) && <Link href={`${base}/import`} className="btn-ghost"><Upload size={16} /> นำเข้า</Link>}
          <Link href={`${base}/new`} className="btn-primary"><PlusCircle size={16} /> สร้างใบเบิก</Link>
        </div>
      </div>

      <ShopeeFilters platform={pf.code} q={q} month={month} from={from} to={to} issued={iss} shipped={shp} months={months} />

      <OrdersTable orders={orders} platform={pf.code} />

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
