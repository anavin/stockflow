import Link from "next/link";
import { Truck, ArrowRight, PackageCheck } from "lucide-react";
import type { PendingRow } from "@/lib/queries";
import { platformColor, platformName } from "@/lib/config";

/** ค้างส่ง = ตัดสต๊อกแล้วแต่ยังไม่ส่ง · เรียงค้างนานสุดก่อน (จาก listPendingShipment)
 *  โชว์งานที่ควรส่งก่อน + อายุการค้าง (ตัดมากี่วัน) เพื่อจับงานที่ค้างนานเกิน */
export default function PendingShipPanel({ rows = [], showPlatform = true, limit = 8 }: { rows?: PendingRow[]; showPlatform?: boolean; limit?: number }) {
  const total = rows.length;
  const shown = rows.slice(0, limit);
  const bkkToday = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
  const ageDays = (iso: string | null) => {
    if (!iso) return 0;
    const d = new Date(new Date(iso).getTime() + 7 * 3600 * 1000).toISOString().slice(0, 10);
    return Math.max(0, Math.round((Date.parse(bkkToday) - Date.parse(d)) / 86400000));
  };
  const ageTone = (n: number) =>
    n >= 3 ? "bg-red-50 text-red-600 font-semibold" : n === 2 ? "bg-amber-50 text-amber-700" : n === 1 ? "bg-soft text-muted" : "text-faint";

  return (
    <section className="card p-5">
      <header className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Truck size={15} className="text-amber-600" /> ค้างส่ง <span className="text-xs font-normal text-faint">(ตัดสต๊อกแล้ว · รอส่ง)</span>
          {total > 0 && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">{total.toLocaleString()}</span>}
        </h2>
        <Link href="/ship" className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline">ไปหน้าส่ง <ArrowRight size={12} /></Link>
      </header>

      {total === 0 ? (
        <p className="flex items-center justify-center gap-2 py-6 text-center text-sm text-muted">
          <PackageCheck size={16} className="text-green-600" /> ไม่มีงานค้างส่ง — ส่งครบแล้ว
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-x-6 gap-y-0.5 lg:grid-cols-2">
            {shown.map((r) => {
              const n = ageDays(r.issued_at);
              return (
                <Link key={r.order_no} href={`/${(r.platform || "Shopee").toLowerCase()}/${encodeURIComponent(r.order_no)}`}
                  className="flex items-center gap-2 rounded-md px-1.5 py-1.5 text-sm hover:bg-soft">
                  {showPlatform && <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: platformColor(r.platform ?? undefined) }} title={platformName(r.platform ?? undefined)} />}
                  <span className="w-24 shrink-0 truncate font-medium text-ink" title={r.order_no}>{r.order_no}</span>
                  <span className="min-w-0 flex-1 truncate text-muted">{r.receiver || "—"}{r.province ? ` · ${r.province}` : ""}</span>
                  <span className="shrink-0 text-xs text-faint">{r.item_count} ชิ้น</span>
                  <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-xs tabular-nums ${ageTone(n)}`}>
                    {n === 0 ? "วันนี้" : `${n} วัน`}
                  </span>
                </Link>
              );
            })}
          </div>
          {total > shown.length && (
            <div className="mt-2 border-t border-line pt-2 text-center">
              <Link href="/ship" className="text-xs font-medium text-muted hover:text-brand-600">+ อีก {(total - shown.length).toLocaleString()} รายการ · ดูทั้งหมด</Link>
            </div>
          )}
        </>
      )}
    </section>
  );
}
