import Link from "next/link";
import { requireDashboard } from "@/lib/auth/require-user";
import { listOrders, countOrders } from "@/lib/queries";
import { platformColor } from "@/lib/config";
import { ClipboardList, ChevronLeft, ChevronRight, ArrowLeft, PackageCheck, Truck } from "lucide-react";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

// รายการออร์เดอร์ "รวมทุกแพลตฟอร์ม" — ปลายทางของ drill-down การ์ดรายวันบนแดชบอร์ดโหมดรวม
// (หน้า /[platform] ดูได้ทีละแพลตฟอร์ม · หน้านี้กรองด้วย from/to/issued/shipped เหมือนกันแต่ไม่ผูกแพลตฟอร์ม)
export default async function AllOrdersPage({ searchParams }: {
  searchParams: Promise<{ from?: string; to?: string; issued?: string; shipped?: string; q?: string; page?: string }>;
}) {
  await requireDashboard();
  const { from, to, issued, shipped, q, page } = await searchParams;
  const iss = issued === "yes" || issued === "no" ? issued : undefined;
  const shp = shipped === "yes" || shipped === "no" ? shipped : undefined;
  const pageNum = Math.max(1, Number(page) || 1);
  const offset = (pageNum - 1) * PAGE_SIZE;

  const [orders, total] = await Promise.all([
    listOrders({ search: q, from, to, issued: iss, shipped: shp, limit: PAGE_SIZE, offset }),
    countOrders({ search: q, from, to, issued: iss, shipped: shp }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rowFrom = total === 0 ? 0 : offset + 1;
  const rowTo = offset + orders.length;

  const fmtDay = (d?: string | null) => (d ? new Date(d + "T00:00:00").toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" }) : "");
  const dateLabel = from && to ? (from === to ? fmtDay(from) : `${fmtDay(from)}–${fmtDay(to)}`) : from ? `ตั้งแต่ ${fmtDay(from)}` : to ? `ถึง ${fmtDay(to)}` : "";
  const statusLabel = iss === "no" ? "รอตัดสต๊อก" : iss === "yes" ? "ตัดสต๊อกแล้ว" : shp === "no" ? "ค้างส่ง" : shp === "yes" ? "ส่งแล้ว" : "";

  // คง query ปัจจุบันไว้ตอนเปลี่ยนหน้า
  const qs = (p: number) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q); if (from) sp.set("from", from); if (to) sp.set("to", to);
    if (iss) sp.set("issued", iss); if (shp) sp.set("shipped", shp);
    if (p > 1) sp.set("page", String(p));
    const s = sp.toString();
    return `/orders${s ? "?" + s : ""}`;
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-8">
      <Link href="/" className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-brand-600"><ArrowLeft size={13} /> กลับภาพรวม</Link>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-ink"><ClipboardList size={20} className="text-brand" /> ออร์เดอร์ทุกแพลตฟอร์ม</h1>
          <p className="mt-0.5 text-sm text-muted">
            {[dateLabel, statusLabel].filter(Boolean).join(" · ") || "ทั้งหมด"}
            {" · "}<b className="text-ink">{total.toLocaleString()}</b> ออร์เดอร์
            {total > 0 && <span className="text-faint"> · แสดง {rowFrom.toLocaleString()}–{rowTo.toLocaleString()}</span>}
          </p>
        </div>
        {(dateLabel || statusLabel || q) && (
          <Link href="/orders" className="btn-ghost text-xs">ล้างตัวกรอง</Link>
        )}
      </div>

      {orders.length === 0 ? (
        <div className="card p-10 text-center text-sm text-muted">ไม่พบออร์เดอร์ตามตัวกรองนี้</div>
      ) : (
        <section className="card divide-y divide-line/70 p-2">
          {orders.map((o) => (
            <Link key={o.order_no} href={`/${(o.platform || "Shopee").toLowerCase()}/${encodeURIComponent(o.order_no)}`}
              className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 hover:bg-soft">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: platformColor(o.platform) }} title={o.platform || ""} />
                  <span className="truncate font-mono text-xs text-ink">{o.order_no}</span>
                  {o.doc_no && <span className="shrink-0 text-[11px] text-faint">· {o.doc_no}</span>}
                </div>
                <div className="truncate text-xs text-muted">{o.receiver || o.username || "—"}{o.province ? ` · ${o.province}` : ""}</div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {o.stock_issued_at
                  ? <span className="chip inline-flex items-center gap-1 bg-green-50 text-green-700"><PackageCheck size={12} /> ตัดแล้ว</span>
                  : <span className="chip bg-amber-50 text-amber-700">รอตัด</span>}
                {o.shipped_at && <span className="chip inline-flex items-center gap-1 bg-green-50 text-green-700"><Truck size={12} /> ส่งแล้ว</span>}
                <span className="chip bg-brand-50 text-brand-600">{o.item_count} รายการ</span>
              </div>
            </Link>
          ))}
        </section>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-muted">หน้า {pageNum} / {totalPages.toLocaleString()}</span>
          <div className="flex gap-2">
            {pageNum > 1 ? <Link href={qs(pageNum - 1)} className="btn-ghost"><ChevronLeft size={16} /> ก่อนหน้า</Link>
              : <span className="btn-ghost pointer-events-none opacity-40"><ChevronLeft size={16} /> ก่อนหน้า</span>}
            {pageNum < totalPages ? <Link href={qs(pageNum + 1)} className="btn-ghost">ถัดไป <ChevronRight size={16} /></Link>
              : <span className="btn-ghost pointer-events-none opacity-40">ถัดไป <ChevronRight size={16} /></span>}
          </div>
        </div>
      )}
    </div>
  );
}
