import Link from "next/link";
import type { MonitorRow } from "@/lib/queries";
import { platformColor, platformName } from "@/lib/config";
import { Radar, PackageCheck, Clock3, ClipboardList } from "lucide-react";

const STAT_TONE = {
  brand: { bg: "bg-brand-50", ring: "", chip: "bg-brand/10 text-brand", num: "text-brand", label: "text-brand/80" },
  green: { bg: "bg-green-50", ring: "", chip: "bg-green-600/10 text-green-700", num: "text-green-700", label: "text-green-700/80" },
  amber: { bg: "bg-amber-50", ring: "ring-1 ring-amber-200", chip: "bg-amber-600/10 text-amber-700", num: "text-amber-700", label: "text-amber-700/80" },
  faint: { bg: "bg-soft", ring: "", chip: "bg-ink/5 text-faint", num: "text-faint", label: "text-faint" },
} as const;

/** ไทล์สรุป · compact = อยู่คอลัมน์ซ้าย (ชิปเล็ก เลข+ป้ายบรรทัดเดียว) · ปกติ = ใหญ่ เลขบนป้ายล่าง */
function StatTile({ href, tone, icon, value, label, compact }: {
  href: string; tone: keyof typeof STAT_TONE; icon: React.ReactNode; value: number; label: string; compact: boolean;
}) {
  const t = STAT_TONE[tone];
  return (
    <Link href={href} className={`flex items-center gap-2.5 rounded-xl transition hover:brightness-95 ${t.bg} ${t.ring} ${compact ? "px-3 py-1.5" : "p-4"}`}>
      <span className={`grid shrink-0 place-items-center rounded-lg ${t.chip} ${compact ? "h-8 w-8" : "h-12 w-12"}`}>{icon}</span>
      {compact ? (
        <div className="flex min-w-0 items-baseline gap-2">
          <span className={`text-2xl font-bold leading-none ${t.num}`}>{value.toLocaleString()}</span>
          <span className={`truncate text-xs font-medium ${t.label}`}>{label}</span>
        </div>
      ) : (
        <div className="min-w-0 leading-tight">
          <div className={`text-[2rem] font-bold leading-none ${t.num}`}>{value.toLocaleString()}</div>
          <div className={`mt-1 text-xs font-medium ${t.label}`}>{label}</div>
        </div>
      )}
    </Link>
  );
}

/** Monitor "วันนี้" — ออร์เดอร์วันนี้ / ตัดแล้ว / ค้างตัด + แยกแพลตฟอร์ม · คลิกตัวเลขไป /orders (วันนี้)
 *  ไว้เฝ้าดูงานระหว่างวัน · "วันนี้" = order_date วันนี้ หรือ นำเข้าระบบวันนี้ · ตรงกับ /orders?today=today
 *  layout: มีตารางแพลตฟอร์ม → 2 คอลัมน์ (สรุปซ้าย·ตารางขวา, ไทล์ย่อให้สูง≈ตาราง) · ไม่มี → สรุปเต็มกว้าง */
export default function TodayMonitor({ rows, showPlatforms = true }: { rows: MonitorRow[]; showPlatforms?: boolean }) {
  const today = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10); // วันนี้ (เวลาไทย)
  const dateLabel = new Date(today + "T00:00:00").toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long" });
  const orders = rows.reduce((a, r) => a + r.orders, 0);
  const issued = rows.reduce((a, r) => a + r.issued, 0);
  const pending = orders - issued;
  const pct = orders > 0 ? Math.round((issued / orders) * 100) : 0;
  const href = (extra = "") => `/orders?today=${today}${extra}`;
  const platforms = [...rows].filter((r) => r.orders > 0).sort((a, b) => b.orders - a.orders);
  const hasTable = showPlatforms && platforms.length > 1;

  // ── ซ้าย: สรุป 3 ตัว + progress ──
  const summary = (
    <div className="flex flex-col">
      <div className={hasTable ? "flex flex-col gap-1.5" : "grid grid-cols-3 gap-3"}>
        <StatTile href={href()} tone="brand" icon={<ClipboardList size={hasTable ? 16 : 24} />} value={orders} label="ออร์เดอร์วันนี้" compact={hasTable} />
        <StatTile href={href("&issued=yes")} tone="green" icon={<PackageCheck size={hasTable ? 16 : 24} />} value={issued} label="ตัดสต๊อกแล้ว" compact={hasTable} />
        <StatTile href={href("&issued=no")} tone={pending > 0 ? "amber" : "faint"} icon={<Clock3 size={hasTable ? 16 : 24} />} value={pending} label="ค้างตัดสต๊อก" compact={hasTable} />
      </div>
      <div className="mt-2 flex items-center gap-3">
        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-soft">
          <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
        <span className="shrink-0 text-xs font-semibold text-ink">{pct}%</span>
      </div>
    </div>
  );

  // ── ขวา: ตารางแยกแพลตฟอร์ม + แถบสัดส่วน (เทียบแพลตฟอร์มสูงสุด) ──
  const maxOrders = Math.max(...platforms.map((r) => r.orders), 1);
  const COLS = "grid grid-cols-[minmax(80px,140px)_1fr_repeat(3,2.75rem)] items-center gap-x-3";
  const table = (
    <div className="flex h-full flex-col lg:border-l lg:border-line lg:pl-5">
      <div className={`mb-1.5 ${COLS} px-1 text-[11px] font-medium text-muted`}>
        <span>แพลตฟอร์ม</span><span /><span className="text-right">ออร์เดอร์</span><span className="text-right">ตัดแล้ว</span><span className="text-right">ค้าง</span>
      </div>
      {/* แถวยืดเต็มความสูง (flex-1) — น้อยแพลตฟอร์มก็เต็มกรอบ มากก็หดลงถึง min */}
      <div className="flex flex-1 flex-col gap-1">
        {platforms.map((r) => {
          const p = r.orders - r.issued;
          return (
            <Link key={r.platform} href={`/orders?platform=${r.platform}&today=${today}`}
              className={`${COLS} min-h-[2.25rem] flex-1 rounded-lg border border-line px-1.5 text-sm transition-colors hover:bg-soft`}>
              <span className="flex items-center gap-1.5 truncate">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: platformColor(r.platform) }} />
                <span className="truncate text-ink">{platformName(r.platform)}</span>
              </span>
              <span className="h-1.5 w-full overflow-hidden rounded-full bg-soft">
                <span className="block h-full rounded-full" style={{ width: `${Math.round((r.orders / maxOrders) * 100)}%`, backgroundColor: platformColor(r.platform) }} />
              </span>
              <span className="text-right font-medium tabular-nums text-ink">{r.orders.toLocaleString()}</span>
              <span className="text-right tabular-nums text-green-600">{r.issued.toLocaleString()}</span>
              <span className={`text-right tabular-nums ${p > 0 ? "font-semibold text-amber-600" : "text-faint"}`}>{p > 0 ? p.toLocaleString() : "—"}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );

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
      ) : hasTable ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(240px,1fr)_1.5fr]">
          {summary}
          {table}
        </div>
      ) : (
        summary
      )}
    </section>
  );
}
