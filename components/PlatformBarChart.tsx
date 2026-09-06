import type { PlatformOverviewRow } from "@/lib/queries";
import { platformColor, platformName } from "@/lib/config";
import { BarChart3 } from "lucide-react";

/** กราฟแท่งแนวนอนเทียบแพลตฟอร์ม (ยอดสะสม) — ความยาว = ออร์เดอร์ · แถบเข้ม = ตัดสต๊อกแล้ว
 *  กราฟทดลอง วางคู่ตาราง "เทียบแพลตฟอร์ม" · เอาออกได้โดยไม่กระทบตาราง */
export default function PlatformBarChart({ rows, periodActive = false }: { rows: PlatformOverviewRow[]; periodActive?: boolean }) {
  if (rows.length === 0) return null;
  const sorted = [...rows].sort((a, b) => b.orders - a.orders);
  const max = Math.max(1, ...sorted.map((r) => r.orders));
  const grand = sorted.reduce((a, r) => a + r.orders, 0);

  return (
    <section className="card p-5">
      <header className="mb-4 flex flex-wrap items-center gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink"><BarChart3 size={16} className="text-brand" /> เทียบแพลตฟอร์ม · กราฟออร์เดอร์</h2>
        <span className="text-xs font-normal text-muted">{periodActive ? "ยอดสะสม" : "ทั้งหมด"} · แถบเข้ม = ตัดสต๊อกแล้ว</span>
      </header>
      <div className="space-y-2.5">
        {sorted.map((r) => {
          const color = platformColor(r.platform);
          const wOrders = Math.max(2, (r.orders / max) * 100);
          const wIssued = (r.issued / max) * 100;
          const share = grand ? Math.round((r.orders / grand) * 100) : 0;
          return (
            <div key={r.platform} className="flex items-center gap-3">
              <div className="flex w-28 shrink-0 items-center gap-1.5 text-xs">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                <span className="truncate text-ink" title={platformName(r.platform)}>{platformName(r.platform)}</span>
              </div>
              <div className="relative h-5 flex-1 overflow-hidden rounded-md bg-soft" title={`ตัดแล้ว ${r.issued.toLocaleString()} / ${r.orders.toLocaleString()}`}>
                {/* แถบจาง = ออร์เดอร์ทั้งหมด */}
                <div className="absolute inset-y-0 left-0 rounded-md" style={{ width: `${wOrders}%`, backgroundColor: `${color}33` }} />
                {/* แถบเข้ม = ตัดสต๊อกแล้ว */}
                <div className="absolute inset-y-0 left-0 rounded-md" style={{ width: `${wIssued}%`, backgroundColor: color }} />
              </div>
              <div className="flex w-24 shrink-0 items-baseline justify-end gap-1 tabular-nums">
                <span className="text-sm font-semibold text-ink">{r.orders.toLocaleString()}</span>
                <span className="text-[11px] text-faint">{share}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
