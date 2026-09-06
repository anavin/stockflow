import Link from "next/link";
import type { PlatformOverviewRow, DailyMatrixRow } from "@/lib/queries";
import { platformColor, platformName } from "@/lib/config";
import { PlatformDot } from "./PlatformBadge";
import { Layers } from "lucide-react";

/** ตารางเทียบทุกแพลตฟอร์ม — ยอดสะสม/เดือนนี้/ตัด/ส่ง/ค้าง/คืน + sparkline 7 วันล่าสุด (รวมมิติรายวัน×แพลตฟอร์ม) */
export default function PlatformCompare({ rows, daily = [], periodActive = false }: {
  rows: PlatformOverviewRow[]; daily?: DailyMatrixRow[]; periodActive?: boolean;
}) {
  if (rows.length === 0) return null;
  const totals = rows.reduce(
    (a, r) => ({ orders: a.orders + r.orders, month: a.month + r.month, issued: a.issued + r.issued, shipped: a.shipped + r.shipped, pending: a.pending + r.pending, returned: a.returned + r.returned }),
    { orders: 0, month: 0, issued: 0, shipped: 0, pending: 0, returned: 0 },
  );
  // sparkline 7 วันล่าสุด: วันเรียงเก่า→ใหม่ · สเกลร่วมทุกแพลตฟอร์มให้เทียบกันได้
  const days = [...new Set(daily.map((d) => d.day))].sort().slice(-7);
  const seriesOf = (code: string) => days.map((day) => daily.find((d) => d.day === day && d.platform === code)?.orders || 0);
  const maxDaily = Math.max(1, ...daily.filter((d) => days.includes(d.day)).map((d) => d.orders));
  const hasDaily = days.length > 0;

  return (
    <section className="card overflow-hidden">
      <div className="flex items-center gap-2 border-b border-line px-5 py-3.5 text-sm font-semibold text-ink">
        <Layers size={16} className="text-brand" /> เทียบแพลตฟอร์ม
        <span className="text-xs font-normal text-muted">
          ออร์เดอร์ = ยอดสะสม · {hasDaily ? `แนวโน้ม ${days.length} วัน · ` : ""}ตัด/ส่ง นับตั้งแต่ 1 ก.ย. 69 (implement)
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-soft text-left text-xs text-muted">
            <tr>
              <th className="px-5 py-2.5">แพลตฟอร์ม</th>
              <th className="px-3 py-2.5">{hasDaily ? "7 วันล่าสุด" : "สัดส่วน"}</th>
              <th className="px-3 py-2.5 text-right">{periodActive ? "สะสม" : "ทั้งหมด"}</th>
              <th className="px-3 py-2.5 text-right">เดือนนี้</th>
              <th className="px-3 py-2.5 text-right">ตัดสต๊อก</th>
              <th className="px-3 py-2.5 text-right">ส่งแล้ว</th>
              <th className="px-3 py-2.5 text-right">ค้างส่ง</th>
              <th className="px-3 py-2.5 text-right">คืน</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const color = platformColor(r.platform);
              const share = totals.orders ? Math.round((r.orders / totals.orders) * 100) : 0;
              return (
                <tr key={r.platform} className="border-t border-line hover:bg-soft/40">
                  <td className="px-5 py-2.5">
                    <Link href={`/?platform=${r.platform}`} className="inline-flex items-center gap-2 font-medium text-ink hover:text-brand-600">
                      <PlatformDot platform={r.platform} /> {platformName(r.platform)}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5">
                    {hasDaily ? (
                      <div className="flex h-6 items-end gap-0.5" title={`ออร์เดอร์ ${days.length} วันล่าสุด`}>
                        {seriesOf(r.platform).map((v, i) => (
                          <div key={i} className="w-1.5 rounded-sm" title={`${days[i]}: ${v}`}
                            style={{ height: `${Math.max(8, (v / maxDaily) * 100)}%`, backgroundColor: v > 0 ? color : `${color}22` }} />
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-soft">
                          <div className="h-full rounded-full" style={{ width: `${share}%`, backgroundColor: color }} />
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-ink">
                    {r.orders.toLocaleString()}<span className="ml-1 text-[11px] font-normal text-faint">{share}%</span>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-muted">{r.month.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-muted">{r.issued.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-muted">{r.shipped.toLocaleString()}</td>
                  <td className={`px-3 py-2.5 text-right tabular-nums ${r.pending > 0 ? "font-medium text-amber-600" : "text-muted"}`}>{r.pending.toLocaleString()}</td>
                  <td className={`px-3 py-2.5 text-right tabular-nums ${r.returned > 0 ? "font-medium text-red-600" : "text-faint"}`}>{r.returned.toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-line bg-soft/50 font-semibold">
              <td className="px-5 py-2.5 text-ink">รวม</td>
              <td className="px-3 py-2.5"></td>
              <td className="px-3 py-2.5 text-right tabular-nums text-ink">{totals.orders.toLocaleString()}</td>
              <td className="px-3 py-2.5 text-right tabular-nums text-muted">{totals.month.toLocaleString()}</td>
              <td className="px-3 py-2.5 text-right tabular-nums text-muted">{totals.issued.toLocaleString()}</td>
              <td className="px-3 py-2.5 text-right tabular-nums text-muted">{totals.shipped.toLocaleString()}</td>
              <td className="px-3 py-2.5 text-right tabular-nums text-amber-600">{totals.pending.toLocaleString()}</td>
              <td className="px-3 py-2.5 text-right tabular-nums text-red-600">{totals.returned.toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
