import Link from "next/link";
import { Truck, ArrowRight, PackageCheck } from "lucide-react";
import type { PendingRow } from "@/lib/queries";

/** ค้างส่ง = ตัดสต๊อกแล้วแต่ยังไม่ส่ง (listPendingShipment) — การ์ด "สถิติ" ย่อ วางข้าง Monitor
 *  โชว์ยอดรวม + แยกตามอายุการค้าง (วันนี้ / 1–2 วัน / ≥3 วัน ด่วน) เพื่อจับงานค้างนาน */
export default function PendingShipPanel({ rows = [] }: { rows?: PendingRow[] }) {
  const total = rows.length;
  const bkkToday = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
  const ageDays = (iso: string | null) => {
    if (!iso) return 0;
    const d = new Date(new Date(iso).getTime() + 7 * 3600 * 1000).toISOString().slice(0, 10);
    return Math.max(0, Math.round((Date.parse(bkkToday) - Date.parse(d)) / 86400000));
  };
  let today = 0, d12 = 0, d3 = 0;
  for (const r of rows) { const n = ageDays(r.issued_at); if (n >= 3) d3++; else if (n >= 1) d12++; else today++; }

  return (
    <section className="card flex h-full flex-col p-5">
      <header className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink"><Truck size={15} className="text-amber-600" /> ค้างส่ง</h2>
        <Link href="/ship" className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline">ไปส่ง <ArrowRight size={12} /></Link>
      </header>

      {total === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-4 text-center">
          <PackageCheck size={28} className="text-green-500" />
          <p className="text-sm text-muted">ไม่มีงานค้างส่ง<br />ส่งครบแล้ว</p>
        </div>
      ) : (
        <div className="flex flex-1 flex-col justify-center">
          {/* ยอดรวม */}
          <Link href="/ship" className="group block">
            <div className={`text-[2.5rem] font-bold leading-none ${d3 > 0 ? "text-amber-600" : "text-ink"}`}>{total.toLocaleString()}</div>
            <div className="mt-1 text-xs font-medium text-muted">ตัดสต๊อกแล้ว · รอส่ง</div>
          </Link>

          {/* แยกตามอายุการค้าง */}
          <div className="mt-4 space-y-2 border-t border-line pt-3">
            <AgeRow color="bg-brand" label="วันนี้" n={today} />
            <AgeRow color="bg-amber-400" label="ค้าง 1–2 วัน" n={d12} />
            <AgeRow color="bg-red-500" label="ค้าง ≥3 วัน" n={d3} urgent />
          </div>
        </div>
      )}
    </section>
  );
}

function AgeRow({ color, label, n, urgent }: { color: string; label: string; n: number; urgent?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="inline-flex items-center gap-2 text-muted">
        <span className={`h-2 w-2 rounded-full ${color}`} />
        {label}{urgent && n > 0 && <span className="rounded bg-red-50 px-1 text-[10px] font-semibold text-red-600">ด่วน</span>}
      </span>
      <b className={`tabular-nums ${urgent && n > 0 ? "text-red-600" : "text-ink"}`}>{n.toLocaleString()}</b>
    </div>
  );
}
