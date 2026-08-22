import { requireDashboard } from "@/lib/auth/require-user";
import { sizeMix, newVsReturningByMonth, topProvinces } from "@/lib/queries";
import ReportTabs from "@/components/ReportTabs";
import { BarChart3, Ruler, UserPlus, MapPin } from "lucide-react";

export const dynamic = "force-dynamic";
const ML = (ym: string) => { const [y, m] = ym.split("-"); return `${["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."][+m - 1] || m} ${y.slice(2)}`; };

export default async function MarketingReport() {
  await requireDashboard();
  const [sizes, nvr, provinces] = await Promise.all([sizeMix(), newVsReturningByMonth(12), topProvinces(15)]);
  const maxSize = Math.max(1, ...sizes.map((s) => s.qty));
  const maxProv = Math.max(1, ...provinces.map((p) => p.orders));

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">
      <div className="mb-4"><h1 className="flex items-center gap-2 text-xl font-bold text-ink"><BarChart3 size={18} /> รายงาน & วิเคราะห์</h1></div>
      <ReportTabs />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* สัดส่วนขนาด */}
        <section className="card overflow-hidden">
          <div className="flex items-center gap-2 border-b border-line px-5 py-3.5 text-sm font-semibold text-ink"><Ruler size={16} className="text-brand" /> สัดส่วนขนาดที่ขาย (ชิ้น)</div>
          <div className="divide-y divide-line">
            {sizes.map((s) => (
              <div key={s.size} className="flex items-center gap-3 px-5 py-2">
                <span className="w-20 shrink-0 text-sm font-medium text-ink">{s.size}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-soft"><div className="h-full rounded-full bg-brand" style={{ width: `${Math.round(s.qty / maxSize * 100)}%` }} /></div>
                <span className="w-24 text-right text-xs tabular-nums text-ink">{s.qty.toLocaleString()} ชิ้น</span>
              </div>
            ))}
            {sizes.length === 0 && <p className="px-5 py-10 text-center text-muted">ยังไม่มีข้อมูล</p>}
          </div>
        </section>

        {/* ลูกค้าใหม่ vs เก่า */}
        <section className="card overflow-hidden">
          <div className="flex items-center gap-2 border-b border-line px-5 py-3.5 text-sm font-semibold text-ink"><UserPlus size={16} className="text-brand" /> ลูกค้าใหม่ vs เก่า (รายเดือน)</div>
          <table className="w-full text-sm">
            <thead className="bg-soft text-left text-xs text-muted"><tr><th className="px-5 py-2.5">เดือน</th><th className="px-3 py-2.5 text-right">ใหม่</th><th className="px-3 py-2.5 text-right">เก่า</th><th className="px-3 py-2.5">สัดส่วนใหม่</th></tr></thead>
            <tbody>
              {[...nvr].reverse().map((r) => { const tot = r.new_c + r.repeat_c; const pct = tot ? Math.round(r.new_c / tot * 100) : 0; return (
                <tr key={r.ym} className="border-t border-line">
                  <td className="px-5 py-2 font-medium text-ink">{ML(r.ym)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-green-700">{r.new_c}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted">{r.repeat_c}</td>
                  <td className="px-3 py-2"><div className="flex items-center gap-2"><div className="h-2 w-20 overflow-hidden rounded-full bg-soft"><div className="h-full bg-green-500" style={{ width: `${pct}%` }} /></div><span className="text-xs text-muted">{pct}%</span></div></td>
                </tr>
              ); })}
              {nvr.length === 0 && <tr><td colSpan={4} className="px-5 py-10 text-center text-muted">ยังไม่มีข้อมูล</td></tr>}
            </tbody>
          </table>
        </section>
      </div>

      {/* Top จังหวัด */}
      <section className="card mt-5 overflow-hidden">
        <div className="flex items-center gap-2 border-b border-line px-5 py-3.5 text-sm font-semibold text-ink"><MapPin size={16} className="text-brand" /> ยอดขายตามจังหวัด (Top {provinces.length})</div>
        <div className="grid grid-cols-1 md:grid-cols-2">
          {provinces.map((p, i) => (
            <div key={p.province} className="flex items-center gap-3 border-b border-line px-5 py-2">
              <span className="w-5 text-right text-xs text-faint">{i + 1}</span>
              <span className="w-32 shrink-0 truncate text-sm text-ink">{p.province}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-soft"><div className="h-full rounded-full bg-brand" style={{ width: `${Math.round(p.orders / maxProv * 100)}%` }} /></div>
              <span className="w-20 text-right text-xs tabular-nums text-muted">{p.orders.toLocaleString()} ใบ</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
