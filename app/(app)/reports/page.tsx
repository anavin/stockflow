import { requireAdmin } from "@/lib/auth/require-user";
import { salesByMonth, topScents, returnsByMonth, customerRepeat, topRepeatCustomers, platformOverview } from "@/lib/queries";
import { enabledPlatforms, platformName, resolvePlatform } from "@/lib/config";
import { PlatformDot } from "@/components/PlatformBadge";
import PlatformCompare from "@/components/PlatformCompare";
import ReportTabs from "@/components/ReportTabs";
import { ReportHeader, Kpi, Bar, SectionCard } from "@/components/ReportUI";
import Link from "next/link";
import { BarChart3, TrendingUp, FlaskConical, Undo2, Users, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

const monthLabel = (ym: string) => { const [y, m] = ym.split("-"); return `${["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."][+m - 1] || m} ${y.slice(2)}`; };

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ platform?: string }> }) {
  await requireAdmin();
  const pf = resolvePlatform((await searchParams).platform)?.code;
  const [sales, scents, returns, repeat, repeatList, overview] = await Promise.all([
    salesByMonth(12), topScents(20, pf), returnsByMonth(12), customerRepeat(), topRepeatCustomers(50), platformOverview(),
  ]);
  const maxCust = Math.max(1, ...repeatList.map((c) => c.orders));

  const platforms = enabledPlatforms().map((p) => p.code).filter((code) => sales.some((s) => s.platform === code));
  const months = [...new Set(sales.map((s) => s.ym))].sort().reverse();
  const cell = (ym: string, code: string) => sales.find((s) => s.ym === ym && s.platform === code);
  const monthTotal = (ym: string) => sales.filter((s) => s.ym === ym).reduce((a, s) => a + s.orders, 0);
  const maxMonth = Math.max(1, ...months.map(monthTotal));
  const maxScent = Math.max(1, ...scents.map((s) => s.qty));
  const totalOrders = overview.reduce((a, r) => a + r.orders, 0);
  const monthOrders = overview.reduce((a, r) => a + r.month, 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">
      <ReportHeader
        icon={<BarChart3 size={22} />}
        title="รายงาน & วิเคราะห์"
        subtitle="ยอดขาย · กลิ่นขายดี · การคืน · ลูกค้า — จากข้อมูลจริงทุกแพลตฟอร์ม"
      />
      <ReportTabs />

      {/* KPI */}
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="ออร์เดอร์ทั้งหมด" value={totalOrders.toLocaleString()} icon={<TrendingUp size={17} />} tone="brand" />
        <Kpi label="เดือนนี้" value={monthOrders.toLocaleString()} icon={<TrendingUp size={17} />} tone="green" />
        <Kpi label="ลูกค้าทั้งหมด" value={repeat.customers.toLocaleString()} icon={<Users size={17} />} tone="slate" />
        <Kpi label="ลูกค้าซื้อซ้ำ" value={`${repeat.repeat_pct}%`} sub={`${repeat.repeat_customers.toLocaleString()} คน`} icon={<Users size={17} />} tone="amber" />
      </div>

      {/* เทียบแพลตฟอร์ม (reuse) */}
      {overview.length > 1 && <div className="mb-5"><PlatformCompare rows={overview} /></div>}

      {/* ยอดออเดอร์รายเดือน × แพลตฟอร์ม */}
      <SectionCard title="ยอดออเดอร์รายเดือน (12 เดือนล่าสุด)" icon={<TrendingUp size={16} />} className="mb-5">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-soft text-left text-xs text-muted">
              <tr>
                <th className="px-5 py-2.5">เดือน</th>
                {platforms.map((c) => <th key={c} className="px-3 py-2.5 text-right"><span className="inline-flex items-center gap-1"><PlatformDot platform={c} /> {platformName(c)}</span></th>)}
                <th className="px-3 py-2.5 text-right">รวม</th>
                <th className="px-3 py-2.5" style={{ width: 160 }}>สัดส่วน</th>
              </tr>
            </thead>
            <tbody>
              {months.length === 0 && <tr><td colSpan={platforms.length + 3} className="px-5 py-10 text-center text-muted">ยังไม่มีข้อมูล</td></tr>}
              {months.map((ym) => {
                const tot = monthTotal(ym);
                return (
                  <tr key={ym} className="border-t border-line hover:bg-soft/40">
                    <td className="px-5 py-2 font-medium text-ink">{monthLabel(ym)}</td>
                    {platforms.map((c) => <td key={c} className="px-3 py-2 text-right tabular-nums text-muted">{cell(ym, c)?.orders?.toLocaleString() || "—"}</td>)}
                    <td className="px-3 py-2 text-right font-semibold tabular-nums text-ink">{tot.toLocaleString()}</td>
                    <td className="px-3 py-2"><Bar pct={tot / maxMonth * 100} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* กลิ่นขายดี */}
        <SectionCard
          title={`กลิ่นขายดี Top ${scents.length}`}
          icon={<FlaskConical size={16} />}
          action={
            <div className="flex flex-wrap gap-1">
              <Link href="/reports" className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${!pf ? "bg-ink text-white" : "bg-soft text-muted hover:text-ink"}`}>ทั้งหมด</Link>
              {enabledPlatforms().map((p) => <Link key={p.code} href={`/reports?platform=${p.code}`} className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${pf === p.code ? "bg-ink text-white" : "bg-soft text-muted hover:text-ink"}`}>{p.name}</Link>)}
            </div>
          }
        >
          <div className="divide-y divide-line">
            {scents.length === 0 && <p className="px-5 py-10 text-center text-muted">ยังไม่มีข้อมูล</p>}
            {scents.map((s, i) => (
              <div key={s.product} className="flex items-center gap-3 px-5 py-2">
                <span className="w-5 text-right text-xs font-semibold text-faint">{i + 1}</span>
                <span className="w-36 shrink-0 truncate text-sm font-medium text-ink">{s.product}</span>
                <div className="flex-1"><Bar pct={s.qty / maxScent * 100} /></div>
                <span className="w-16 text-right text-xs tabular-nums text-ink">{s.qty.toLocaleString()} ชิ้น</span>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* การคืนรายเดือน */}
        <SectionCard title="การคืนรายเดือน" icon={<Undo2 size={16} />} tone="red">
          {returns.length === 0 ? <p className="px-5 py-10 text-center text-muted">ยังไม่มีการคืนในช่วง 12 เดือน 🎉</p> : (
            <table className="w-full text-sm">
              <thead className="bg-soft text-left text-xs text-muted"><tr><th className="px-5 py-2.5">เดือน</th><th className="px-3 py-2.5 text-right">ออเดอร์ที่คืน</th><th className="px-3 py-2.5 text-right">ชิ้น</th></tr></thead>
              <tbody>
                {[...returns].reverse().map((r) => (
                  <tr key={r.ym} className="border-t border-line"><td className="px-5 py-2 font-medium text-ink">{monthLabel(r.ym)}</td><td className="px-3 py-2 text-right tabular-nums text-red-600">{r.returned.toLocaleString()}</td><td className="px-3 py-2 text-right tabular-nums text-muted">{r.qty.toLocaleString()}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </SectionCard>
      </div>

      {/* รายชื่อลูกค้าซื้อซ้ำ */}
      <SectionCard
        title={<>ลูกค้าซื้อซ้ำ (Top {repeatList.length}) <span className="text-xs font-normal text-muted">ซื้อ ≥ 2 ครั้ง</span></>}
        icon={<Users size={16} />}
        className="mt-5"
        action={<Link href="/reports/repeat" className="inline-flex items-center gap-1 rounded-full bg-soft px-3 py-1 text-xs font-medium text-brand-600 transition-colors hover:bg-brand/10">ดูทั้งหมด <ArrowRight size={13} /></Link>}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-soft text-left text-xs text-muted">
              <tr>
                <th className="px-5 py-2.5">#</th>
                <th className="px-3 py-2.5">ชื่อผู้ใช้ / ผู้รับ</th>
                <th className="px-3 py-2.5">แพลตฟอร์ม</th>
                <th className="px-3 py-2.5 text-right">จำนวนครั้ง</th>
                <th className="px-3 py-2.5 text-right">ชิ้นรวม</th>
                <th className="px-3 py-2.5">ซื้อล่าสุด</th>
                <th className="px-3 py-2.5" style={{ width: 120 }}></th>
              </tr>
            </thead>
            <tbody>
              {repeatList.length === 0 && <tr><td colSpan={7} className="px-5 py-10 text-center text-muted">ยังไม่มีลูกค้าซื้อซ้ำ</td></tr>}
              {repeatList.map((c, i) => (
                <tr key={c.username} className="border-t border-line hover:bg-soft/40">
                  <td className="px-5 py-2 text-xs font-semibold text-faint">{i + 1}</td>
                  <td className="px-3 py-2">
                    <Link href={`/reports/customer?u=${encodeURIComponent(c.username)}`} className="font-medium text-brand-600 hover:underline">{c.username}</Link>
                    {c.receiver ? <span className="block text-xs text-muted">{c.receiver}</span> : null}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted">{c.platforms}</td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums text-ink">{c.orders}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted">{c.qty.toLocaleString()}</td>
                  <td className="px-3 py-2 text-xs text-muted">{c.last_at || "—"}</td>
                  <td className="px-3 py-2"><Bar pct={c.orders / maxCust * 100} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
