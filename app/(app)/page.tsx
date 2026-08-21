import Link from "next/link";
import { requireDashboard } from "@/lib/auth/require-user";
import { dashboardStats, listStock, listOrders, topProducts, ordersTrend, dailyIssueStatus, fdaExpirySummary, shipSummary } from "@/lib/queries";
import {
  PlusCircle, ScanLine, Boxes, AlertTriangle, PackageCheck, ClipboardList,
  ArrowRight, ShoppingBag, TrendingUp, Sparkles, Clock, CalendarCheck, ShieldAlert, Truck,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const user = await requireDashboard();
  // ยิงขนานผ่าน pool (เร็ว) — บน Vercel/Node connection pool รองรับ concurrent query ปกติ
  const [s, lowStock, recent, top, trend, daily, fda, ship] = await Promise.all([
    dashboardStats(),
    listStock({ lowOnly: true, limit: 6 }),
    listOrders({ platform: "Shopee", limit: 20 }),
    topProducts(10),
    ordersTrend(6),
    dailyIssueStatus("Shopee", 5),
    fdaExpirySummary(),
    shipSummary(),
  ]);
  const fdaAlert = fda.expired + fda.d10 + fda.d15 + fda.d30;

  const fulfill = s.ordersTotal > 0 ? s.issuedTotal / s.ordersTotal : 0;
  const normal = Math.max(0, s.skus - s.low - s.negative);
  const name = (user.full_name || user.username || "").trim();

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">
      {/* ── header ── */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink">ภาพรวม</h1>
          <p className="mt-0.5 text-sm text-muted">
            {name ? <>สวัสดี <span className="font-medium text-ink">{name}</span> · </> : null}
            ระบบเบิกสินค้าหลายแพลตฟอร์ม + สต๊อกกลาง
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/shopee/new" className="btn-primary"><PlusCircle size={16} /> สร้างใบเบิก</Link>
          <Link href="/stock/issue" className="btn-ghost"><ScanLine size={16} /> ตัดสต๊อก</Link>
        </div>
      </div>

      {/* ── alert: สต๊อกติดลบ / ใกล้หมด / อย.ใกล้หมดอายุ ── */}
      {(s.negative > 0 || s.low > 0 || fdaAlert > 0) && (
        <div className="mb-5 flex flex-wrap gap-3">
          {(fda.expired > 0 || fda.d10 > 0) && (
            <Link href="/fda" className="flex flex-1 min-w-[240px] items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 hover:bg-red-100">
              <ShieldAlert size={20} className="shrink-0 text-red-600" />
              <div className="text-sm"><b className="text-red-700">อย. {fda.expired > 0 ? `หมดอายุ ${fda.expired}` : `ใกล้หมด ${fda.d10}`} รายการ</b><div className="text-xs text-red-600/80">{fda.expired > 0 ? "เกินวันสิ้นสุด — ต่ออายุด่วน" : "เหลือ ≤ 10 วัน — เตรียมต่ออายุ"}</div></div>
            </Link>
          )}
          {fda.expired === 0 && fda.d10 === 0 && (fda.d15 > 0 || fda.d30 > 0) && (
            <Link href="/fda" className="flex flex-1 min-w-[240px] items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 hover:bg-amber-100">
              <ShieldAlert size={20} className="shrink-0 text-amber-600" />
              <div className="text-sm"><b className="text-amber-700">อย. ใกล้หมดอายุ {fda.d15 + fda.d30} รายการ</b><div className="text-xs text-amber-600/80">เหลือ ≤ 30 วัน — เตรียมต่ออายุ</div></div>
            </Link>
          )}
          {s.negative > 0 && (
            <Link href="/stock" className="flex flex-1 min-w-[240px] items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 hover:bg-red-100">
              <AlertTriangle size={20} className="shrink-0 text-red-600" />
              <div className="text-sm"><b className="text-red-700">สต๊อกติดลบ {s.negative.toLocaleString()} รายการ</b><div className="text-xs text-red-600/80">สต๊อกไม่พอ — ควรรับเข้า/ตรวจสอบด่วน</div></div>
            </Link>
          )}
          {s.low > 0 && (
            <Link href="/stock?low=1" className="flex flex-1 min-w-[240px] items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 hover:bg-amber-100">
              <AlertTriangle size={20} className="shrink-0 text-amber-600" />
              <div className="text-sm"><b className="text-amber-700">ใกล้หมด {s.low.toLocaleString()} รายการ</b><div className="text-xs text-amber-600/80">คงเหลือ ≤ 10 — เตรียมเติมสต๊อก</div></div>
            </Link>
          )}
        </div>
      )}

      {/* ── KPI tiles ── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
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
        <Kpi
          label="ส่งวันนี้" value={ship.shippedToday} href="/ship"
          icon={<Truck size={18} />} tone="green"
          sub={<>ค้างส่ง <b className="text-ink">{ship.pending.toLocaleString()}</b></>}
        />
      </div>

      {/* ── highlights: fulfillment · stock health · trend ── */}
      <div className="mt-4 grid grid-cols-1 items-stretch gap-4 md:grid-cols-3">
        {/* fulfillment ring */}
        <section className="card flex h-full flex-col p-5">
          <header className="flex h-6 items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-ink"><ScanLine size={15} /> อัตราการตัดสต๊อก</h2>
          </header>
          <div className="mt-4 flex flex-1 items-center gap-5">
            <Ring value={fulfill} />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "rgb(var(--brand))" }} /> ตัดแล้ว
                </span>
                <b className="text-sm text-ink">{s.issuedTotal.toLocaleString()}</b>
              </div>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                  <span className="h-2 w-2 rounded-full bg-amber-400" /> รอตัด
                </span>
                <b className="text-sm text-amber-600">{s.pendingIssue.toLocaleString()}</b>
              </div>
              <div className="flex items-center justify-between border-t border-line pt-2">
                <span className="text-xs text-faint">ทั้งหมด</span>
                <b className="text-sm text-ink">{s.ordersTotal.toLocaleString()} ใบ</b>
              </div>
            </div>
          </div>
          <Link href="/stock/issue" className="btn-primary mt-4 text-xs">
            <ScanLine size={13} /> ไปตัดสต๊อก
          </Link>
        </section>

        {/* stock health */}
        <section className="card flex h-full flex-col p-5">
          <header className="flex h-6 items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-ink"><Boxes size={15} /> สุขภาพสต๊อก</h2>
            <span className="text-xs text-muted">{s.skus.toLocaleString()} SKU</span>
          </header>
          <div className="mt-4 flex flex-1 flex-col justify-center">
            <div className="grid grid-cols-3 gap-2">
              <StockStat label="ปกติ" n={normal} total={s.skus} tone="green" />
              <StockStat label="ใกล้หมด" n={s.low} total={s.skus} tone="amber" href="/stock?low=1" />
              <StockStat label="ติดลบ" n={s.negative} total={s.skus} tone="red" href="/stock?low=1" />
            </div>
            <HealthBar normal={normal} low={s.low} negative={s.negative} />
          </div>
          <Link href="/stock"
            className="mt-4 inline-flex items-center justify-center gap-1 rounded-lg border border-line px-3 py-2 text-xs font-medium text-ink transition-colors hover:bg-soft">
            <Boxes size={13} /> ดูสต๊อกทั้งหมด
          </Link>
        </section>

        {/* orders trend */}
        <section className="card flex h-full flex-col p-5">
          <header className="flex h-6 items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-ink"><TrendingUp size={15} /> ใบเบิกรายเดือน</h2>
            <span className="text-xs text-muted">6 เดือนล่าสุด</span>
          </header>
          <div className="flex flex-1 flex-col justify-center">
            <TrendBars data={trend} />
          </div>
          <Link href="/shopee"
            className="mt-4 inline-flex items-center justify-center gap-1 rounded-lg border border-line px-3 py-2 text-xs font-medium text-ink transition-colors hover:bg-soft">
            <ClipboardList size={13} /> ดูใบเบิกทั้งหมด
          </Link>
        </section>
      </div>

      {/* ── รายวัน + สต๊อกที่ต้องเติม (วางข้างกัน) ── */}
      <div className="mt-4 grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
        {/* daily */}
        <section className="card flex flex-col p-4">
          <div className="mb-2 flex shrink-0 flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-xs font-semibold text-ink"><CalendarCheck size={14} className="text-brand" /> ออร์เดอร์รายวัน · ตัดสต๊อกแล้วกี่ใบ</h2>
            <span className="text-[11px] text-muted">5 วันล่าสุด (ตามวันที่สั่งซื้อ)</span>
          </div>
          <DailyIssueTable data={daily} />
        </section>

        {/* low stock (ย่อเล็ก) */}
        <section className="card p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-xs font-semibold text-ink"><AlertTriangle size={14} className="text-amber-500" /> สต๊อกที่ต้องเติม (≤10)</h2>
            <Link href="/stock?low=1" className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-600">ทั้งหมด <ArrowRight size={11} /></Link>
          </div>
          {lowStock.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted">สต๊อกเพียงพอทั้งหมด 👍</p>
          ) : (
            <div className="space-y-1.5">
              {lowStock.map((r) => {
                const pct = Math.max(0, Math.min(100, (Number(r.qty) / 10) * 100));
                const neg = Number(r.qty) < 0;
                return (
                  <div key={`${r.product}|${r.size}`} className="group">
                    <div className="flex items-center justify-between text-xs">
                      <span className="truncate"><span className="font-medium text-ink">{r.product}</span> <span className="text-faint">{r.size}</span></span>
                      <span className={`chip shrink-0 ${neg ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-700"}`}>{r.qty}</span>
                    </div>
                    <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-soft">
                      <div className={`h-full rounded-full ${neg ? "bg-red-500" : "bg-amber-400"}`} style={{ width: `${neg ? 100 : pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* ── recent orders (full width) ── */}
      <div className="mt-4">
        {/* recent orders */}
        <section className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-ink"><Clock size={15} /> ออร์เดอร์ล่าสุด</h2>
            <Link href="/shopee" className="inline-flex items-center gap-1 text-xs font-medium text-brand-600">ทั้งหมด <ArrowRight size={12} /></Link>
          </div>
          {recent.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">ยังไม่มีออร์เดอร์</p>
          ) : (
            <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2 xl:grid-cols-3">
              {recent.map((o) => (
                <Link key={o.order_no} href={`/shopee/${encodeURIComponent(o.order_no)}`} className="-mx-2 flex items-center justify-between gap-2 rounded-lg border-b border-line/70 px-2 py-2 hover:bg-soft">
                  <div className="min-w-0">
                    <div className="font-mono text-xs text-ink">{o.order_no}</div>
                    <div className="truncate text-xs text-muted">{o.receiver || o.username || "—"}{o.province ? ` · ${o.province}` : ""}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {o.stock_issued_at
                      ? <span className="chip bg-green-50 text-green-700">ตัดแล้ว</span>
                      : <span className="chip bg-amber-50 text-amber-700">รอตัด</span>}
                    <span className="chip bg-brand-50 text-brand-600">{o.item_count} รายการ</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ── top products ── */}
      <section className="card mt-4 p-5">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-ink"><Sparkles size={15} className="text-brand" /> กลิ่นที่เบิกมากที่สุด</h2>
          <Link href="/scents" className="inline-flex items-center gap-1 text-xs font-medium text-brand-600">ดูทั้งหมด <ArrowRight size={12} /></Link>
        </div>
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
                    <div className="flex h-full items-center justify-end rounded-full bg-brand pr-2" style={{ width: `${pct}%` }} />
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
  green: "bg-green-50 text-green-600",
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
function StockStat({ label, n, total, tone, href }: { label: string; n: number; total: number; tone: "green" | "amber" | "red"; href?: string }) {
  const t = {
    green: { bg: "bg-green-50", text: "text-green-700", dot: "bg-green-500", ring: "" },
    amber: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400", ring: "" },
    red: { bg: "bg-red-50", text: "text-red-600", dot: "bg-red-500", ring: n > 0 ? "ring-1 ring-red-200" : "" },
  }[tone];
  const pct = total > 0 ? Math.round((n / total) * 100) : 0;
  const inner = (
    <div className={`rounded-xl px-2 py-2.5 text-center ${t.bg} ${t.ring} ${href ? "transition hover:brightness-95" : ""}`}>
      <div className={`text-2xl font-bold leading-none ${t.text}`}>{n.toLocaleString()}</div>
      <div className="mt-1.5 flex items-center justify-center gap-1 text-[11px] text-muted">
        <span className={`inline-block h-1.5 w-1.5 rounded-full ${t.dot}`} /> {label}
      </div>
      <div className="text-[10px] text-faint">{pct}%</div>
    </div>
  );
  return href ? <Link href={href} className="block">{inner}</Link> : inner;
}

function DailyIssueTable({ data }: { data: { day: string; orders: number; issued: number; pending: number }[] }) {
  if (data.length === 0) return <p className="text-sm text-muted">ยังไม่มีข้อมูล</p>;
  const fmt = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("th-TH", { day: "numeric", month: "short" });
  return (
    <div className="flex-1 overflow-x-auto">
      <table className="h-full w-full text-xs">
        <thead className="text-left text-[11px] text-muted">
          <tr>
            <th className="pb-2 pr-3 font-medium">วันที่</th>
            <th className="pb-2 pr-3 text-right font-medium">ออร์เดอร์</th>
            <th className="pb-2 pr-3 text-right font-medium">ตัดแล้ว</th>
            <th className="pb-2 pr-3 text-right font-medium">รอตัด</th>
            <th className="hidden pb-2 font-medium sm:table-cell">ความคืบหน้า</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => {
            const pct = d.orders > 0 ? Math.round((d.issued / d.orders) * 100) : 0;
            return (
              <tr key={d.day} className={`border-t border-line ${d.pending > 0 ? "bg-amber-50/40" : ""}`}>
                <td className="whitespace-nowrap py-1.5 pr-3">
                  <Link href={`/shopee?from=${d.day}&to=${d.day}`} className="font-medium text-ink hover:text-brand-600 hover:underline">{fmt(d.day)}</Link>
                </td>
                <td className="py-1.5 pr-3 text-right font-medium text-ink">
                  <Link href={`/shopee?from=${d.day}&to=${d.day}`} className="hover:underline">{d.orders.toLocaleString()}</Link>
                </td>
                <td className="py-1.5 pr-3 text-right text-green-600">
                  <Link href={`/shopee?from=${d.day}&to=${d.day}&issued=yes`} className="hover:underline">{d.issued.toLocaleString()}</Link>
                </td>
                <td className={`py-1.5 pr-3 text-right ${d.pending > 0 ? "font-semibold text-amber-600" : "text-faint"}`}>
                  {d.pending > 0
                    ? <Link href={`/shopee?from=${d.day}&to=${d.day}&issued=no`} className="hover:underline">{d.pending.toLocaleString()}</Link>
                    : "—"}
                </td>
                <td className="hidden py-1.5 sm:table-cell">
                  <div className="flex items-center gap-2">
                    <div className="h-2 min-w-[80px] flex-1 overflow-hidden rounded-full bg-soft">
                      <div className="h-full rounded-full bg-green-500" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-9 text-right text-xs text-muted">{pct}%</span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Ring({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const r = 34, c = 2 * Math.PI * r;
  const off = c * (1 - Math.max(0, Math.min(1, value)));
  return (
    <svg width="94" height="94" viewBox="0 0 94 94" className="shrink-0 -rotate-90">
      <circle cx="47" cy="47" r={r} fill="none" stroke="#eef1f6" strokeWidth="9" />
      <circle cx="47" cy="47" r={r} fill="none" style={{ stroke: "rgb(var(--brand))" }} strokeWidth="9" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={off} />
      <text x="47" y="43" transform="rotate(90 47 47)" textAnchor="middle" dominantBaseline="central"
        className="fill-ink" style={{ fontSize: 21, fontWeight: 700 }}>{pct}%</text>
      <text x="47" y="60" transform="rotate(90 47 47)" textAnchor="middle" dominantBaseline="central"
        className="fill-faint" style={{ fontSize: 8 }}>ตัดแล้ว</text>
    </svg>
  );
}

/** Stacked proportion bar for stock health. */
function HealthBar({ normal, low, negative }: { normal: number; low: number; negative: number }) {
  const total = Math.max(1, normal + low + negative);
  const seg = (n: number) => `${(n / total) * 100}%`;
  return (
    <div className="mt-3 flex h-3 w-full gap-1">
      {normal > 0 && <div className="h-full rounded-full bg-green-500" style={{ width: seg(normal) }} />}
      {low > 0 && <div className="h-full rounded-full bg-amber-400" style={{ width: seg(low) }} />}
      {negative > 0 && <div className="h-full rounded-full bg-red-500" style={{ width: seg(negative) }} />}
      {normal + low + negative === 0 && <div className="h-full w-full rounded-full bg-soft" />}
    </div>
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
            <div className="w-full max-w-[26px] rounded-t-md bg-brand transition-all"
              style={{ height: `${Math.max(6, (d.n / max) * 56)}px` }} title={`${d.label}: ${d.n}`} />
          </div>
          <span className="text-[10px] text-faint">{d.label}</span>
        </div>
      ))}
    </div>
  );
}
