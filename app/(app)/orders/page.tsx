import Link from "next/link";
import { requireDashboard } from "@/lib/auth/require-user";
import { listOrders, countOrders } from "@/lib/queries";
import { platformColor, platformName, resolvePlatform } from "@/lib/config";
import AllOrdersFilters from "@/components/AllOrdersFilters";
import { ClipboardList, ChevronLeft, ChevronRight, ArrowLeft, PackageCheck, Truck } from "lucide-react";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

// รายการออร์เดอร์ "รวมทุกแพลตฟอร์ม" — ปลายทางของ drill-down การ์ดรายวันบนแดชบอร์ดโหมดรวม + มีฟิลเตอร์ของตัวเอง
// (หน้า /[platform] ดูได้ทีละแพลตฟอร์ม · หน้านี้กรองแพลตฟอร์ม/ค้นหา/สถานะ/ช่วงวันที่ ได้ในที่เดียว)
export default async function AllOrdersPage({ searchParams }: {
  searchParams: Promise<{ platform?: string; from?: string; to?: string; issued?: string; shipped?: string; q?: string; page?: string }>;
}) {
  await requireDashboard();
  const { platform, from, to, issued, shipped, q, page } = await searchParams;
  const pf = resolvePlatform(platform)?.code;   // undefined = ทุกแพลตฟอร์ม
  const iss = issued === "yes" || issued === "no" ? issued : undefined;
  const shp = shipped === "yes" || shipped === "no" ? shipped : undefined;
  const pageNum = Math.max(1, Number(page) || 1);
  const offset = (pageNum - 1) * PAGE_SIZE;

  const [orders, total] = await Promise.all([
    listOrders({ platform: pf, search: q, from, to, issued: iss, shipped: shp, limit: PAGE_SIZE, offset }),
    countOrders({ platform: pf, search: q, from, to, issued: iss, shipped: shp }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rowFrom = total === 0 ? 0 : offset + 1;
  const rowTo = offset + orders.length;

  const fmtDay = (d?: string | null) => (d ? new Date(d + "T00:00:00").toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" }) : "");
  const dateLabel = from && to ? (from === to ? fmtDay(from) : `${fmtDay(from)}–${fmtDay(to)}`) : from ? `ตั้งแต่ ${fmtDay(from)}` : to ? `ถึง ${fmtDay(to)}` : "";
  const statusLabel = iss === "no" ? "รอตัดสต๊อก" : iss === "yes" ? "ตัดสต๊อกแล้ว" : shp === "no" ? "ค้างส่ง" : shp === "yes" ? "ส่งแล้ว" : "";
  const summary = [pf ? platformName(pf) : "", dateLabel, statusLabel].filter(Boolean).join(" · ") || "ทั้งหมด";

  // คง query ปัจจุบันไว้ตอนเปลี่ยนหน้า
  const qs = (p: number) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q); if (pf) sp.set("platform", pf); if (from) sp.set("from", from); if (to) sp.set("to", to);
    if (iss) sp.set("issued", iss); if (shp) sp.set("shipped", shp);
    if (p > 1) sp.set("page", String(p));
    const s = sp.toString();
    return `/orders${s ? "?" + s : ""}`;
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-8">
      <Link href="/" className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-brand-600"><ArrowLeft size={13} /> กลับภาพรวม</Link>
      <div className="mb-4">
        <h1 className="flex items-center gap-2 text-xl font-bold text-ink"><ClipboardList size={20} className="text-brand" /> ออร์เดอร์ทุกแพลตฟอร์ม</h1>
        <p className="mt-0.5 text-sm text-muted">
          {summary}{" · "}<b className="text-ink">{total.toLocaleString()}</b> ออร์เดอร์
          {total > 0 && <span className="text-faint"> · แสดง {rowFrom.toLocaleString()}–{rowTo.toLocaleString()}</span>}
        </p>
      </div>

      <AllOrdersFilters q={q} platform={pf} issued={iss} shipped={shp} from={from} to={to} />

      {orders.length === 0 ? (
        <div className="card p-10 text-center text-sm text-muted">ไม่พบออร์เดอร์ตามตัวกรองนี้</div>
      ) : (
        <section className="card overflow-hidden">
          {/* หัวคอลัมน์ (เดสก์ท็อป) — ใช้ template คอลัมน์เดียวกับแถวข้อมูล เป๊ะ เพื่อให้ตรงกัน */}
          <div className="hidden grid-cols-[minmax(9rem,1.4fr)_minmax(6rem,2fr)_9rem_3.5rem] items-center gap-x-4 border-b border-line bg-soft/60 px-4 py-2 text-[11px] font-medium text-muted sm:grid">
            <span>เลขที่ / ใบเบิก</span>
            <span>ผู้รับ · จังหวัด</span>
            <span className="text-right">สถานะ</span>
            <span className="text-right">รายการ</span>
          </div>
          <div className="divide-y divide-line/70">
            {orders.map((o) => (
              <Link key={o.order_no} href={`/${(o.platform || "Shopee").toLowerCase()}/${encodeURIComponent(o.order_no)}`}
                className="flex flex-col gap-0.5 px-4 py-2.5 hover:bg-soft sm:grid sm:grid-cols-[minmax(9rem,1.4fr)_minmax(6rem,2fr)_9rem_3.5rem] sm:items-center sm:gap-x-4">
                {/* คอลัมน์ 1: จุดสี + เลขที่ + ใบเบิก */}
                <div className="flex min-w-0 items-center gap-2">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: platformColor(o.platform) }} title={o.platform || ""} />
                  <span className="truncate font-mono text-xs text-ink">{o.order_no}</span>
                  {o.doc_no && <span className="hidden shrink-0 text-[11px] text-faint lg:inline">{o.doc_no}</span>}
                </div>
                {/* คอลัมน์ 2: ผู้รับ · จังหวัด */}
                <div className="truncate text-xs text-muted">{o.receiver || o.username || "—"}{o.province ? ` · ${o.province}` : ""}</div>
                {/* คอลัมน์ 3: สถานะ (ชิดขวา) */}
                <div className="flex items-center justify-start gap-1.5 sm:justify-end">
                  {o.stock_issued_at
                    ? <span className="chip inline-flex items-center gap-1 bg-green-50 text-green-700"><PackageCheck size={12} /> ตัดแล้ว</span>
                    : <span className="chip bg-amber-50 text-amber-700">รอตัด</span>}
                  {o.shipped_at && <span className="chip inline-flex items-center gap-1 bg-green-50 text-green-700"><Truck size={12} /> ส่งแล้ว</span>}
                </div>
                {/* คอลัมน์ 4: จำนวนรายการ (ชิดขวา) */}
                <div className="flex items-center justify-start sm:justify-end">
                  <span className="chip bg-brand-50 text-brand-600">{o.item_count}</span>
                </div>
              </Link>
            ))}
          </div>
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
