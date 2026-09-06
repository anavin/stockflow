import Link from "next/link";
import type { MonitorRow } from "@/lib/queries";
import { platformColor, platformName } from "@/lib/config";
import { Radar, PackageCheck, Clock3 } from "lucide-react";

/** Monitor "วันนี้" — ออร์เดอร์วันนี้ / ตัดแล้ว / ค้างตัด + แยกแพลตฟอร์ม · คลิกตัวเลขไป /orders (วันนี้)
 *  ไว้เฝ้าดูงานระหว่างวัน · ตัวเลขตรงกับ /orders?from=today&to=today */
export default function TodayMonitor({ rows, showPlatforms = true }: { rows: MonitorRow[]; showPlatforms?: boolean }) {
  const today = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10); // วันนี้ (เวลาไทย)
  const dateLabel = new Date(today + "T00:00:00").toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long" });
  const orders = rows.reduce((a, r) => a + r.orders, 0);
  const issued = rows.reduce((a, r) => a + r.issued, 0);
  const pending = orders - issued;
  const pct = orders > 0 ? Math.round((issued / orders) * 100) : 0;
  const href = (extra = "") => `/orders?from=${today}&to=${today}${extra}`;
  const platforms = [...rows].filter((r) => r.orders > 0).sort((a, b) => b.orders - a.orders);

  return (
    <section className="card p-5">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand" />
          </span>
          <Radar size={16} className="text-brand" /> Monitor วันนี้
        </h2>
        <span className="text-xs text-muted">{dateLabel}</span>
      </header>

      {orders === 0 ? (
        <p className="py-8 text-center text-sm text-muted">ยังไม่มีออร์เดอร์ของวันนี้</p>
      ) : (
        <>
          {/* สถิติใหญ่ 3 ตัว */}
          <div className="grid grid-cols-3 gap-3">
            <Link href={href()} className="rounded-xl bg-brand-50 p-4 text-center transition hover:brightness-95">
              <div className="text-3xl font-bold leading-none text-brand">{orders.toLocaleString()}</div>
              <div className="mt-1.5 text-xs font-medium text-brand/80">ออร์เดอร์วันนี้</div>
            </Link>
            <Link href={href("&issued=yes")} className="rounded-xl bg-green-50 p-4 text-center transition hover:brightness-95">
              <div className="inline-flex items-baseline gap-1 text-3xl font-bold leading-none text-green-700">
                <PackageCheck size={20} className="translate-y-0.5" />{issued.toLocaleString()}
              </div>
              <div className="mt-1.5 text-xs font-medium text-green-700/80">ตัดสต๊อกแล้ว</div>
            </Link>
            <Link href={href("&issued=no")} className={`rounded-xl p-4 text-center transition hover:brightness-95 ${pending > 0 ? "bg-amber-50 ring-1 ring-amber-200" : "bg-soft"}`}>
              <div className={`inline-flex items-baseline gap-1 text-3xl font-bold leading-none ${pending > 0 ? "text-amber-700" : "text-faint"}`}>
                <Clock3 size={20} className="translate-y-0.5" />{pending.toLocaleString()}
              </div>
              <div className={`mt-1.5 text-xs font-medium ${pending > 0 ? "text-amber-700/80" : "text-faint"}`}>ค้างตัดสต๊อก</div>
            </Link>
          </div>

          {/* progress */}
          <div className="mt-4 flex items-center gap-3">
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-soft">
              <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${pct}%` }} />
            </div>
            <span className="shrink-0 text-xs font-semibold text-ink">{pct}%</span>
          </div>

          {/* แยกแพลตฟอร์ม */}
          {showPlatforms && platforms.length > 1 && (
            <div className="mt-4 border-t border-line pt-3">
              <div className="mb-1.5 grid grid-cols-[1fr_auto_auto_auto] gap-x-4 px-1 text-[11px] font-medium text-muted">
                <span>แพลตฟอร์ม</span><span className="w-12 text-right">ออร์เดอร์</span><span className="w-12 text-right">ตัดแล้ว</span><span className="w-12 text-right">ค้าง</span>
              </div>
              <div className="space-y-0.5">
                {platforms.map((r) => {
                  const p = r.orders - r.issued;
                  return (
                    <Link key={r.platform} href={`/orders?platform=${r.platform}&from=${today}&to=${today}`}
                      className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-4 rounded-md px-1 py-1.5 text-sm hover:bg-soft">
                      <span className="flex items-center gap-1.5 truncate">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: platformColor(r.platform) }} />
                        <span className="truncate text-ink">{platformName(r.platform)}</span>
                      </span>
                      <span className="w-12 text-right font-medium tabular-nums text-ink">{r.orders.toLocaleString()}</span>
                      <span className="w-12 text-right tabular-nums text-green-600">{r.issued.toLocaleString()}</span>
                      <span className={`w-12 text-right tabular-nums ${p > 0 ? "font-semibold text-amber-600" : "text-faint"}`}>{p > 0 ? p.toLocaleString() : "—"}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
