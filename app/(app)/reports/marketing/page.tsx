import { requireReports } from "@/lib/auth/require-user";
import { sizeMix, newVsReturningByMonth, topProvinces, sizeByCustomerType, customerTypeSummary, customerIdCoverage } from "@/lib/queries";
import { enabledPlatforms, platformName, platformColor, resolvePlatform } from "@/lib/config";
import ReportTabs from "@/components/ReportTabs";
import { ReportHeader, Bar, SectionCard } from "@/components/ReportUI";
import SizeByGroup from "@/components/SizeByGroup";
import CustomerDataQuality from "@/components/CustomerDataQuality";
import Link from "next/link";
import { Megaphone, Ruler, UserPlus, MapPin, Layers, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";
const ML = (ym: string) => { const [y, m] = ym.split("-"); return `${["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."][+m - 1] || m} ${y.slice(2)}`; };

export default async function MarketingReport({ searchParams }: { searchParams: Promise<{ platform?: string }> }) {
  await requireReports();
  const pf = resolvePlatform((await searchParams).platform)?.code;   // undefined = ภาพรวมทุกแพลตฟอร์ม
  const [sizes, nvr, provinces, sizeGrp, custSum, idCov] = await Promise.all([sizeMix(pf), newVsReturningByMonth(12, pf), topProvinces(15, pf), sizeByCustomerType(pf), customerTypeSummary(pf), customerIdCoverage()]);
  const maxSize = Math.max(1, ...sizes.map((s) => s.qty));
  const maxProv = Math.max(1, ...provinces.map((p) => p.orders));

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">
      <ReportHeader icon={<Megaphone size={22} />} title="การตลาด" subtitle={`ขนาดที่ขาย · ลูกค้าใหม่/เก่า · ยอดตามจังหวัด · ${pf ? platformName(pf) : "ทุกแพลตฟอร์ม (ภาพรวม)"}`} />
      <ReportTabs />

      {/* ตัวกรองแพลตฟอร์ม — ภาพรวม / แยกรายแพลตฟอร์ม */}
      {enabledPlatforms().length > 1 && (
        <div className="mb-5 flex max-w-full items-center overflow-x-auto rounded-lg border border-line text-sm">
          <Link href="/reports/marketing" className={`shrink-0 whitespace-nowrap px-3 py-1.5 font-medium transition-colors ${!pf ? "bg-brand text-white" : "bg-white text-muted hover:bg-soft"}`}>ทั้งหมด</Link>
          {enabledPlatforms().map((p) => (
            <Link key={p.code} href={`/reports/marketing?platform=${p.code}`}
              className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap border-l border-line px-3 py-1.5 font-medium transition-colors ${pf === p.code ? "text-white" : "bg-white text-muted hover:bg-soft"}`}
              style={pf === p.code ? { backgroundColor: platformColor(p.code) } : undefined}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: pf === p.code ? "#ffffff" : platformColor(p.code) }} /> {p.name}
            </Link>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* สัดส่วนขนาด */}
        <SectionCard title="สัดส่วนขนาดที่ขาย (ชิ้น)" icon={<Ruler size={16} />}>
          <div className="divide-y divide-line">
            {sizes.map((s) => (
              <div key={s.size} className="flex items-center gap-3 px-5 py-2">
                <span className="w-20 shrink-0 text-sm font-medium text-ink">{s.size}</span>
                <div className="flex-1"><Bar pct={s.qty / maxSize * 100} /></div>
                <span className="w-24 text-right text-xs tabular-nums text-ink">{s.qty.toLocaleString()} ชิ้น</span>
              </div>
            ))}
            {sizes.length === 0 && <p className="px-5 py-10 text-center text-muted">ยังไม่มีข้อมูล</p>}
          </div>
        </SectionCard>

        {/* ลูกค้าใหม่ vs เก่า */}
        <SectionCard title="ลูกค้าใหม่ vs เก่า (รายเดือน)" icon={<UserPlus size={16} />} tone="green">
          <table className="w-full text-sm">
            <thead className="bg-soft text-left text-xs text-muted"><tr><th className="px-5 py-2.5">เดือน</th><th className="px-3 py-2.5 text-right">ใหม่</th><th className="px-3 py-2.5 text-right">เก่า</th><th className="px-3 py-2.5 text-right">ไม่ระบุ</th><th className="px-3 py-2.5">สัดส่วนใหม่</th></tr></thead>
            <tbody>
              {[...nvr].reverse().map((r) => { const tot = r.new_c + r.repeat_c; const pct = tot ? Math.round(r.new_c / tot * 100) : 0; return (
                <tr key={r.ym} className="border-t border-line">
                  <td className="px-5 py-2 font-medium text-ink">{ML(r.ym)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-green-700">{r.new_c}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted">{r.repeat_c}</td>
                  <td className={`px-3 py-2 text-right tabular-nums ${r.unknown_c > 0 ? "text-amber-600" : "text-faint"}`} title="มีออร์เดอร์แต่ไม่ได้ระบุ/จับคู่ลูกค้า (มักไม่มี username ตอนนำเข้า)">{r.unknown_c}</td>
                  <td className="px-3 py-2"><div className="flex items-center gap-2"><div className="w-20"><Bar pct={pct} tone="green" /></div><span className="text-xs text-muted">{pct}%</span></div></td>
                </tr>
              ); })}
              {nvr.length === 0 && <tr><td colSpan={5} className="px-5 py-10 text-center text-muted">ยังไม่มีข้อมูล</td></tr>}
            </tbody>
          </table>
        </SectionCard>
      </div>

      {/* ความครบของข้อมูลลูกค้า (ทำไมบางแพลตฟอร์มจัดใหม่/เก่าไม่ได้) — โชว์ทุกแพลตฟอร์ม ไม่ขึ้นกับตัวกรอง */}
      <SectionCard title="ความครบของข้อมูลลูกค้า (แยกแพลตฟอร์ม)" icon={<ShieldCheck size={16} />} tone="amber" className="mt-5">
        <CustomerDataQuality rows={idCov} />
      </SectionCard>

      {/* ลูกค้าแต่ละกลุ่มซื้อขนาดไหน */}
      <SectionCard title="ขนาดที่ซื้อ: ลูกค้าใหม่ vs เก่า" icon={<Layers size={16} />} tone="green" className="mt-5">
        <SizeByGroup rows={sizeGrp} summary={custSum} />
      </SectionCard>

      {/* Top จังหวัด */}
      <SectionCard title={`ยอดขายตามจังหวัด (Top ${provinces.length})`} icon={<MapPin size={16} />} className="mt-5">
        <div className="grid grid-cols-1 md:grid-cols-2">
          {provinces.map((p, i) => (
            <div key={p.province} className="flex items-center gap-3 border-b border-line px-5 py-2">
              <span className="w-5 text-right text-xs font-semibold text-faint">{i + 1}</span>
              <span className="w-32 shrink-0 truncate text-sm text-ink">{p.province}</span>
              <div className="flex-1"><Bar pct={p.orders / maxProv * 100} /></div>
              <span className="w-20 text-right text-xs tabular-nums text-muted">{p.orders.toLocaleString()} ใบ</span>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
