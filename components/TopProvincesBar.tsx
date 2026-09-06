import type { ProvinceRow } from "@/lib/queries";
import { MapPin } from "lucide-react";

/** Top จังหวัดปลายทาง (ตามจำนวนออร์เดอร์) — ลูกค้าอยู่ไหนมาก (ยิงแอด/ขนส่ง) */
export default function TopProvincesBar({ rows }: { rows: ProvinceRow[] }) {
  if (rows.length === 0) return null;
  const data = rows.slice(0, 10);
  const max = Math.max(1, ...data.map((r) => r.orders));

  return (
    <section className="card h-full p-5">
      <header className="mb-3 flex items-center gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink"><MapPin size={16} className="text-brand" /> จังหวัดปลายทางยอดนิยม</h2>
        <span className="text-xs text-muted">Top {data.length}</span>
      </header>
      <div className="space-y-2">
        {data.map((r, i) => (
          <div key={r.province} className="flex items-center gap-3">
            <span className="w-4 shrink-0 text-right text-xs font-medium text-faint">{i + 1}</span>
            <span className="w-24 shrink-0 truncate text-sm text-ink" title={r.province}>{r.province}</span>
            <div className="h-4 flex-1 overflow-hidden rounded-full bg-soft">
              <div className="flex h-full items-center justify-end rounded-full bg-brand pr-2" style={{ width: `${Math.max(6, (r.orders / max) * 100)}%` }} />
            </div>
            <span className="w-12 shrink-0 text-right text-xs font-semibold tabular-nums text-ink">{r.orders.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
