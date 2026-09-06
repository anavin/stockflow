import Link from "next/link";
import { unstable_cache } from "next/cache";
import { requireDashboard } from "@/lib/auth/require-user";
import { resolvePlatform, platformBase, enabledPlatforms, platformColor } from "@/lib/config";
import { dashboardStats, listOrders, topProducts, ordersTrend, dailyIssueStatus, monitorToday, sizeMix, newVsReturningByMonth, topProvinces, fdaExpirySummary, shipSummary, platformOverview } from "@/lib/queries";
import CreateOrderMenu from "@/components/CreateOrderMenu";
import PlatformCompare from "@/components/PlatformCompare";
import TodayMonitor from "@/components/TodayMonitor";
import SizeMixDonut from "@/components/SizeMixDonut";
import NewVsReturningBars from "@/components/NewVsReturningBars";
import TopProvincesBar from "@/components/TopProvincesBar";
import {
  ScanLine, Boxes, AlertTriangle, PackageCheck, ClipboardList,
  ArrowRight, ShoppingBag, TrendingUp, Sparkles, Clock, CalendarCheck, ShieldAlert, Truck,
} from "lucide-react";

export const dynamic = "force-dynamic";

// รวม query aggregate ของแดชบอร์ดทั้งหมดเป็นก้อนเดียว cache 30 วิ (tag "dashboard")
// — เดิมยิง ~12 query เต็มตารางทุกครั้งที่โหลด (เสี่ยง egress) · การเขียนออเดอร์/สต๊อก bump tag ให้สดทันที
const getDashboardData = unstable_cache(
  async (pf: string | undefined) => {
    const multi = !pf && enabledPlatforms().length > 1;
    const [s, recent, top, trend, daily, fda, ship, overview, monitor, sizes, nvr, provinces] = await Promise.all([
      dashboardStats(pf),
      listOrders({ platform: pf, limit: 20 }),
      topProducts(10),
      ordersTrend(6, pf),
      dailyIssueStatus(pf, 10),
      fdaExpirySummary(),
      shipSummary(pf),
      multi ? platformOverview() : Promise.resolve([] as Awaited<ReturnType<typeof platformOverview>>),
      monitorToday(pf),
      sizeMix(pf),
      newVsReturningByMonth(12),
      topProvinces(10, pf),
    ]);
    return { s, recent, top, trend, daily, fda, ship, overview, monitor, sizes, nvr, provinces };
  },
  ["dashboard-data"],
  { revalidate: 30, tags: ["dashboard"] },
);

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ platform?: string }> }) {
  const user = await requireDashboard();
  const pf = resolvePlatform((await searchParams).platform)?.code;   // undefined = ทุกแพลตฟอร์ม
  const base = pf ? platformBase(pf) : "/shopee";                    // ลิงก์ "ดูทั้งหมด"/สร้างใบเบิก
  const { s, recent, top, trend, daily, fda, ship, overview, monitor, sizes, nvr, provinces } = await getDashboardData(pf);
  const platforms = enabledPlatforms();
  // หน้าหลักโชว์เฉพาะที่ "ใกล้จะหมดอายุ/ต้องต่ออายุ" (≤10/≤30 วัน) — ไม่โชว์ที่หมดอายุแล้ว (ดูที่หน้า /fda)
  const fdaAlert = fda.d10 + fda.d15 + fda.d30;

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
          <CreateOrderMenu platforms={platforms.filter((p) => p.canCreate)} />
          <Link href="/stock/issue" className="btn-ghost"><ScanLine size={16} /> ตัดสต๊อก</Link>
        </div>
      </div>

      {/* ── ตัวสลับแพลตฟอร์ม (ภาพรวมรวม/แยกแพลตฟอร์ม) ── */}
      {platforms.length > 1 && (
        <div className="mb-5 flex w-fit items-center overflow-hidden rounded-lg border border-line text-sm">
          <Link href="/" className={`px-3 py-1.5 font-medium transition-colors ${!pf ? "bg-brand text-white" : "bg-white text-muted hover:bg-soft"}`}>ทั้งหมด</Link>
          {platforms.map((p) => (
            <Link key={p.code} href={`/?platform=${p.code}`}
              className={`flex items-center gap-1.5 border-l border-line px-3 py-1.5 font-medium transition-colors ${pf === p.code ? "text-white" : "bg-white text-muted hover:bg-soft"}`}
              style={pf === p.code ? { backgroundColor: platformColor(p.code) } : undefined}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: pf === p.code ? "#ffffff" : platformColor(p.code) }} /> {p.name}
            </Link>
          ))}
        </div>
      )}

      {/* ── alert: สต๊อกติดลบ / อย.ใกล้หมดอายุ (สต๊อกใกล้หมดดูที่การ์ดสถิติ/หน้า stock) ── */}
      {(s.negative > 0 || fdaAlert > 0) && (
        <div className="mb-5 flex flex-wrap gap-3">
          {fda.d10 > 0 && (
            <Link href="/fda" className="flex flex-1 min-w-[240px] items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 hover:bg-red-100">
              <ShieldAlert size={20} className="shrink-0 text-red-600" />
              <div className="text-sm"><b className="text-red-700">อย. ใกล้หมดอายุ {fda.d10} รายการ</b><div className="text-xs text-red-600/80">เหลือ ≤ 10 วัน — ต่ออายุด่วน</div></div>
            </Link>
          )}
          {fda.d10 === 0 && (fda.d15 > 0 || fda.d30 > 0) && (
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
        </div>
      )}

      {/* ── KPI tiles ── */}
      {s.periodActive && (
        <p className="mb-2 flex items-center gap-1.5 text-xs text-muted">
          <CalendarCheck size={13} className="text-brand" />
          รอบปัจจุบัน: นับตั้งแต่ <b className="text-ink">1 ก.ย. 2026</b> — ตัดสต๊อก/รอตัด/ออร์เดอร์ เริ่มนับใหม่ (ข้อมูลก่อนหน้าดูได้ในรายงาน)
        </p>
      )}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Kpi
          label={s.periodActive ? "ออร์เดอร์ (รอบนี้)" : "ออร์เดอร์ทั้งหมด"} value={s.ordersTotal} href={base}
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

      {/* ── Monitor วันนี้ (เฝ้าดูงานระหว่างวัน) ── */}
      <div className="mt-4">
        <TodayMonitor rows={monitor} showPlatforms={!pf} />
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
            <div className="grid grid-cols-2 gap-2">
              <StockStat label="ปกติ" n={normal} total={s.skus} tone="green" />
              <StockStat label="ใกล้หมด" n={s.low} total={s.skus} tone="amber" href="/stock?low=1" />
            </div>
            <HealthBar normal={normal} low={s.low} negative={0} />
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
          <Link href={base}
            className="mt-4 inline-flex items-center justify-center gap-1 rounded-lg border border-line px-3 py-2 text-xs font-medium text-ink transition-colors hover:bg-soft">
            <ClipboardList size={13} /> ดูใบเบิกทั้งหมด
          </Link>
        </section>
      </div>

      {/* ── ออร์เดอร์รายวัน + เทียบแพลตฟอร์ม (วางข้างกันเมื่อมีทั้งคู่) ── */}
      {(() => {
        const dailyCard = (
          <section className="card flex h-full flex-col p-4">
            <div className="mb-2 flex shrink-0 flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-xs font-semibold text-ink"><CalendarCheck size={14} className="text-brand" /> ออร์เดอร์รายวัน · ตัดสต๊อกแล้วกี่ใบ</h2>
              <span className="text-[11px] text-muted">10 วันล่าสุด{pf ? " (ตามวันที่สั่งซื้อ)" : " · ทุกแพลตฟอร์ม"}</span>
            </div>
            <DailyIssueTable data={daily} base={pf ? base : "/orders"} linkable />
          </section>
        );
        return overview.length > 0 ? (
          <div className="mt-4 grid grid-cols-1 items-stretch gap-4 lg:grid-cols-[2fr_3fr]">
            {dailyCard}
            <PlatformCompare rows={overview} periodActive={s.periodActive} />
          </div>
        ) : (
          <div className="mt-4">{dailyCard}</div>
        );
      })()}

      {/* ── recent orders (full width) — ต่อจากเทียบแพลตฟอร์ม ── */}
      <section className="card mt-4 p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-ink"><Clock size={15} /> ออร์เดอร์ล่าสุด</h2>
          <Link href={base} className="inline-flex items-center gap-1 text-xs font-medium text-brand-600">ทั้งหมด <ArrowRight size={12} /></Link>
        </div>
        {recent.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">ยังไม่มีออร์เดอร์</p>
        ) : (
          <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2 xl:grid-cols-3">
            {recent.map((o) => (
              <Link key={o.order_no} href={`/${(o.platform || "Shopee").toLowerCase()}/${encodeURIComponent(o.order_no)}`} className="-mx-2 flex items-center justify-between gap-2 rounded-lg border-b border-line/70 px-2 py-2 hover:bg-soft">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: platformColor(o.platform) }} title={o.platform || ""} />
                    <span className="font-mono text-xs text-ink">{o.order_no}</span>
                  </div>
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

      {/* ── top products — ย้ายมาไว้ล่างสุด ── */}
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

      {/* ── กราฟธุรกิจ (ล่างสุด): ลูกค้าใหม่/กลับมา · สัดส่วนขนาด · จังหวัด ── */}
      <div className="mt-4">
        <NewVsReturningBars rows={nvr} />
      </div>
      <div className="mt-4 grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
        <SizeMixDonut rows={sizes} />
        <TopProvincesBar rows={provinces} />
      </div>
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

function DailyIssueTable({ data, base, linkable }: { data: { day: string; orders: number; issued: number; pending: number }[]; base: string; linkable: boolean }) {
  if (data.length === 0) return <p className="text-sm text-muted">ยังไม่มีข้อมูล</p>;
  const fmt = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("th-TH", { day: "numeric", month: "short" });
  // combined (ทุกแพลตฟอร์ม) ยังไม่มีหน้า list รวมตามวันที่ → โชว์ตัวเลขเฉยๆ กันคลิกแล้วเห็นรายการไม่ครบ (ตัวเลขนับรวมทุกแพลตฟอร์ม)
  const A = ({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) =>
    linkable ? <Link href={href} className={className}>{children}</Link> : <span className={className}>{children}</span>;
  return (
    <div className="flex-1 overflow-x-auto">
      <table className="w-full text-xs">
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
                <td className="whitespace-nowrap py-1 pr-3">
                  <A href={`${base}?from=${d.day}&to=${d.day}`} className={linkable ? "font-medium text-ink hover:text-brand-600 hover:underline" : "font-medium text-ink"}>{fmt(d.day)}</A>
                </td>
                <td className="py-1 pr-3 text-right font-medium text-ink">
                  <A href={`${base}?from=${d.day}&to=${d.day}`} className={linkable ? "hover:underline" : ""}>{d.orders.toLocaleString()}</A>
                </td>
                <td className="py-1 pr-3 text-right text-green-600">
                  <A href={`${base}?from=${d.day}&to=${d.day}&issued=yes`} className={linkable ? "hover:underline" : ""}>{d.issued.toLocaleString()}</A>
                </td>
                <td className={`py-1 pr-3 text-right ${d.pending > 0 ? "font-semibold text-amber-600" : "text-faint"}`}>
                  {d.pending > 0
                    ? <A href={`${base}?from=${d.day}&to=${d.day}&issued=no`} className={linkable ? "hover:underline" : ""}>{d.pending.toLocaleString()}</A>
                    : "—"}
                </td>
                <td className="hidden py-1 sm:table-cell">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 min-w-[56px] flex-1 overflow-hidden rounded-full bg-soft">
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
