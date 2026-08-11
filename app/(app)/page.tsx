import Link from "next/link";
import { requireUser } from "@/lib/auth/require-user";
import { dashboardStats, listStock, listOrders, topProducts, ordersTrend } from "@/lib/queries";
import {
  PlusCircle, ScanLine, Boxes, AlertTriangle, PackageCheck, ClipboardList,
  ArrowRight, ShoppingBag, TrendingUp, Sparkles, Clock,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const user = await requireUser();
  // ยิงขนานผ่าน pool (เร็ว) — บน Vercel/Node connection pool รองรับ concurrent query ปกติ
  const [s, lowStock, recent, top, trend] = await Promise.all([
    dashboardStats(),
    listStock({ lowOnly: true, limit: 6 }),
    listOrders({ platform: "Shopee", limit: 6 }),
    topProducts(6),
    ordersTrend(6),
  ]);

  const fulfill = s.ordersTotal > 0 ? s.issuedTotal / s.ordersTotal : 0;
  const normal = Math.max(0, s.skus - s.low - s.negative);
  const name = (user.full_name || user.username || "").trim();

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">
      {/* ── header ── */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">ภาพรวม</h1>
          <p className="mt-0.5 text-sm text-muted">
            {name ? <>สวัสดี <span className="font-medium text-ink">{name}</span> · </> : null}
            ระบบเบิกสินค้า Shopee + สต๊อกกลาง
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/shopee/new" className="btn-primary"><PlusCircle size={16} /> สร้างใบเบิก</Link>
          <Link href="/stock/issue" className="btn-ghost"><ScanLine size={16} /> ตัดสต๊อก</Link>
        </div>
      </div>

      {/* ── KPI tiles ── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi
          label="ออร์เดอร์ทั้งหมด" value={s.ordersTotal} href="/shopee"
          icon={<ShoppingBag size={18} />} tone="brand"
          sub={<><b className="text-ink">{s.ordersMonth.toLocaleString()}</b> เดือนนี้ · {s.ordersToday.toLocaleString()} วันนี้</>}
        />
        <Kpi
          label="ตัดสต๊อกแล้ว" value={s.issuedTotal} href="/stock/issued"
          icon={<PackageCheck size={18} />} tone="green"
          sub={<>วันนี้ {s.issuedToday.toLocaleString()} ใบ</>}
        />
        <Kpi
          label="รอตัดสต๊อก" value={s.pendingIssue} href="/stock/issue"
          icon={<ClipboardList size={18} />} tone="amber"
          sub="ยังไม่สแกนตัดสต๊อก"
        />
        <Kpi
          label="ต้องเติม / ติดลบ" value={s.low + s.negative} href="/stock?low=1"
          icon={<AlertTriangle size={18} />} tone={s.negative > 0 ? "red" : "amber"}
          sub={s.negative > 0 ? <span className="font-medium text-red-600">ติดลบ {s.negative} รายการ</span> : `ใกล้หมด ${s.low} รายการ`}
        />
      </div>

      {/* ── highlights: fulfillment · stock health · trend ── */}
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* fulfillment ring */}
        <section className="card flex items-center gap-4 p-5">
          <Ring value={fulfill} />
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-ink">อัตราการตัดสต๊อก</h2>
            <p className="mt-0.5 text-xs text-muted">ตัดแล้ว {s.issuedTotal.toLocaleString()} จาก {s.ordersTotal.toLocaleString()} ใบ</p>
            <Link href="/stock/issue" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand-600">
              ไปตัดสต๊อก <ArrowRight size={12} />
            </Link>
          </div>
        </section>

        {/* stock health */}
        <section className="card p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-ink"><Boxes size={15} /> สุขภาพสต๊อก</h2>
          <p className="mt-0.5 text-xs text-muted">{s.skus.toLocaleString()} SKU ทั้งหมด</p>
          <HealthBar normal={normal} low={s.low} negative={s.negative} />
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
            <Legend color="bg-emerald-500" label="ปกติ" n={normal} />
            <Legend color="bg-amber-400" label="ใกล้หมด" n={s.low} />
            <Legend color="bg-red-500" label="ติดลบ" n={s.negative} />
          </div>
        </section>

        {/* orders trend */}
        <section className="card p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-ink"><TrendingUp size={15} /> ใบเบิกรายเดือน</h2>
          <p className="mt-0.5 text-xs text-muted">6 เดือนล่าสุด</p>
          <TrendBars data={trend} />
        </section>
      </div>

      {/* ── lists: low stock · recent orders ── */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* low stock */}
        <section className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-ink"><AlertTriangle size={15} className="text-amber-500" /> สต๊อกที่ต้องเติม (≤10)</h2>
            <Link href="/stock?low=1" className="inline-flex items-center gap-1 text-xs font-medium text-brand-600">ทั้งหมด <ArrowRight size={12} /></Link>
          </div>
          {lowStock.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">สต๊อกเพียงพอทั้งหมด 👍</p>
          ) : (
            <div className="space-y-2">
              {lowStock.map((r) => {
                const pct = Math.max(0, Math.min(100, (Number(r.qty) / 10) * 100));
                const neg = Number(r.qty) < 0;
                return (
                  <div key={`${r.product}|${r.size}`} className="group">
                    <div className="flex items-center justify-between text-sm">
                      <span className="truncate"><span className="font-medium text-ink">{r.product}</span> <span className="text-faint">{r.size}</span></span>
                      <span className={`chip shrink-0 ${neg ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-700"}`}>{r.qty}</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-soft">
                      <div className={`h-full rounded-full ${neg ? "bg-red-500" : "bg-amber-400"}`} style={{ width: `${neg ? 100 : pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* recent orders */}
        <section className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-ink"><Clock size={15} /> ออร์เดอร์ล่าสุด</h2>
            <Link href="/shopee" className="inline-flex items-center gap-1 text-xs font-medium text-brand-600">ทั้งหมด <ArrowRight size={12} /></Link>
          </div>
          {recent.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">ยังไม่มีออร์เดอร์</p>
          ) : (
            <div className="divide-y divide-line/70">
              {recent.map((o) => (
                <Link key={o.order_no} href={`/shopee/${encodeURIComponent(o.order_no)}`} className="-mx-2 flex items-center justify-between rounded-lg px-2 py-2 hover:bg-soft">
                  <div className="min-w-0">
                    <div className="font-mono text-xs text-ink">{o.order_no}</div>
                    <div className="truncate text-xs text-muted">{o.receiver || o.username || "—"}{o.province ? ` · ${o.province}` : ""}</div>
                  </div>
                  <span className="chip shrink-0 bg-brand-50 text-brand-600">{o.item_count} รายการ</span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ── top products ── */}
      <section className="card mt-4 p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink"><Sparkles size={15} className="text-brand" /> กลิ่นที่เบิกมากที่สุด</h2>
        {top.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">ยังไม่มีข้อมูล</p>
        ) : (
          <div className="mt-3 space-y-2.5">
            {top.map((p, i) => {
              const max = top[0]?.qty || 1;
              const pct = Math.max(4, (Number(p.qty) / max) * 100);
              return (
                <div key={p.product} className="flex items-center gap-3">
                  <span className="w-4 text-right text-xs font-medium text-faint">{i + 1}</span>
                  <span className="w-40 shrink-0 truncate text-sm text-ink" title={p.product}>{p.product}</span>
                  <div className="h-4 flex-1 overflow-hidden rounded-full bg-soft">
                    <div className="flex h-full items-center justify-end rounded-full bg-gradient-to-r from-brand-50 to-brand pr-2" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-14 shrink-0 text-right text-xs font-semibold text-ink">{Number(p.qty).toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

/* ── small server components ── */

const TONES = {
  brand: "bg-brand-50 text-brand",
  green: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
  red: "bg-red-50 text-red-600",
} as const;

function Kpi({ label, value, sub, icon, href, tone }: {
  label: string; value: number; sub?: React.ReactNode; icon: React.ReactNode; href: string; tone: keyof typeof TONES;
}) {
  return (
    <Link href={href} className="card group p-4 transition-shadow hover:shadow-card">
      <div className="flex items-start justify-between">
        <span className="text-xs text-muted">{label}</span>
        <span className={`grid h-8 w-8 place-items-center rounded-lg ${TONES[tone]}`}>{icon}</span>
      </div>
      <div className="mt-2 text-2xl font-bold tracking-tight text-ink">{value.toLocaleString()}</div>
      {sub && <div className="mt-1 text-[11px] leading-tight text-faint">{sub}</div>}
    </Link>
  );
}

/** SVG donut ring showing a 0..1 ratio. */
function Ring({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const r = 26, c = 2 * Math.PI * r;
  const off = c * (1 - Math.max(0, Math.min(1, value)));
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" className="shrink-0 -rotate-90">
      <circle cx="36" cy="36" r={r} fill="none" stroke="#f5f3ef" strokeWidth="8" />
      <circle cx="36" cy="36" r={r} fill="none" stroke="#ee4d2d" strokeWidth="8" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={off} />
      <text x="36" y="36" transform="rotate(90 36 36)" textAnchor="middle" dominantBaseline="central"
        className="fill-ink" style={{ fontSize: 15, fontWeight: 700 }}>{pct}%</text>
    </svg>
  );
}

/** Stacked proportion bar for stock health. */
function HealthBar({ normal, low, negative }: { normal: number; low: number; negative: number }) {
  const total = Math.max(1, normal + low + negative);
  const seg = (n: number) => `${(n / total) * 100}%`;
  return (
    <div className="mt-3 flex h-2.5 w-full overflow-hidden rounded-full bg-soft">
      {normal > 0 && <div className="h-full bg-emerald-500" style={{ width: seg(normal) }} />}
      {low > 0 && <div className="h-full bg-amber-400" style={{ width: seg(low) }} />}
      {negative > 0 && <div className="h-full bg-red-500" style={{ width: seg(negative) }} />}
    </div>
  );
}

function Legend({ color, label, n }: { color: string; label: string; n: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-muted">
      <span className={`inline-block h-2 w-2 rounded-full ${color}`} />
      {label} <b className="font-semibold text-ink">{n.toLocaleString()}</b>
    </span>
  );
}

/** Mini vertical bar chart for the monthly trend. */
function TrendBars({ data }: { data: { ym: string; label: string; n: number }[] }) {
  if (data.length === 0) return <p className="py-6 text-center text-sm text-muted">ยังไม่มีข้อมูล</p>;
  const max = Math.max(...data.map((d) => d.n), 1);
  return (
    <div className="mt-3 flex h-24 items-end justify-between gap-2">
      {data.map((d) => (
        <div key={d.ym} className="flex flex-1 flex-col items-center gap-1">
          <span className="text-[10px] font-medium text-muted">{d.n}</span>
          <div className="flex w-full items-end justify-center" style={{ height: 56 }}>
            <div className="w-full max-w-[26px] rounded-t-md bg-gradient-to-t from-brand-50 to-brand transition-all"
              style={{ height: `${Math.max(6, (d.n / max) * 56)}px` }} title={`${d.label}: ${d.n}`} />
          </div>
          <span className="text-[10px] text-faint">{d.label}</span>
        </div>
      ))}
    </div>
  );
}
