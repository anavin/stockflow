import { requireAdmin } from "@/lib/auth/require-user";
import { scentVelocity, slowMovers } from "@/lib/queries";
import ReportTabs from "@/components/ReportTabs";
import { BarChart3, Gauge, PackageX, AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ProductionReport() {
  await requireAdmin();
  const [velocity, slow] = await Promise.all([scentVelocity(40), slowMovers(40)]);
  const soon = velocity.filter((v) => v.days_left != null && v.stock > 0 && v.days_left <= 30);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">
      <div className="mb-4"><h1 className="flex items-center gap-2 text-xl font-bold text-ink"><BarChart3 size={18} /> รายงาน & วิเคราะห์</h1></div>
      <ReportTabs />

      {/* จะหมดเร็ว */}
      {soon.length > 0 && (
        <section className="card mb-5 overflow-hidden border-amber-200">
          <div className="flex items-center gap-2 border-b border-line bg-amber-50 px-5 py-3.5 text-sm font-semibold text-amber-800"><AlertTriangle size={16} /> ใกล้หมด — ควรผลิต/เติมด่วน (สต๊อกจะหมดใน ≤ 30 วัน)</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-soft text-left text-xs text-muted"><tr><th className="px-5 py-2.5">กลิ่น</th><th className="px-3 py-2.5">ขนาด</th><th className="px-3 py-2.5 text-right">ขาย/90วัน</th><th className="px-3 py-2.5 text-right">คงเหลือ</th><th className="px-3 py-2.5 text-right">หมดใน</th></tr></thead>
              <tbody>
                {soon.map((v) => (
                  <tr key={v.product + v.size} className="border-t border-line">
                    <td className="px-5 py-2 font-medium text-ink">{v.product}</td><td className="px-3 py-2 text-muted">{v.size}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted">{v.sold90.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-ink">{v.stock.toLocaleString()}</td>
                    <td className={`px-3 py-2 text-right font-semibold tabular-nums ${(v.days_left ?? 99) <= 14 ? "text-red-600" : "text-amber-600"}`}>{v.days_left} วัน</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* velocity ขายเร็วสุด */}
        <section className="card overflow-hidden">
          <div className="flex items-center gap-2 border-b border-line px-5 py-3.5 text-sm font-semibold text-ink"><Gauge size={16} className="text-brand" /> อัตราขายสูงสุด (90 วัน · เฉพาะขนาด ml)</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-soft text-left text-xs text-muted"><tr><th className="px-5 py-2.5">กลิ่น</th><th className="px-3 py-2.5">ขนาด</th><th className="px-3 py-2.5 text-right">ขาย/90วัน</th><th className="px-3 py-2.5 text-right">คงเหลือ</th><th className="px-3 py-2.5 text-right">หมดใน</th></tr></thead>
              <tbody>
                {velocity.slice(0, 25).map((v) => (
                  <tr key={v.product + v.size} className="border-t border-line">
                    <td className="px-5 py-2 font-medium text-ink">{v.product}</td><td className="px-3 py-2 text-muted">{v.size}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-ink">{v.sold90.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted">{v.stock.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted">{v.days_left != null ? `${v.days_left} วัน` : "—"}</td>
                  </tr>
                ))}
                {velocity.length === 0 && <tr><td colSpan={5} className="px-5 py-10 text-center text-muted">ยังไม่มีข้อมูล</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        {/* ขายช้า/ค้างสต๊อก */}
        <section className="card overflow-hidden">
          <div className="flex items-center gap-2 border-b border-line px-5 py-3.5 text-sm font-semibold text-ink"><PackageX size={16} className="text-brand" /> ค้างสต๊อก (สต๊อก &gt;10 · ขาย 90วัน &lt;5)</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-soft text-left text-xs text-muted"><tr><th className="px-5 py-2.5">กลิ่น</th><th className="px-3 py-2.5">ขนาด</th><th className="px-3 py-2.5 text-right">คงเหลือ</th><th className="px-3 py-2.5 text-right">ขาย/90วัน</th></tr></thead>
              <tbody>
                {slow.map((s) => (
                  <tr key={s.product + s.size} className="border-t border-line">
                    <td className="px-5 py-2 font-medium text-ink">{s.product}</td><td className="px-3 py-2 text-muted">{s.size}</td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums text-amber-600">{s.stock.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted">{s.sold90.toLocaleString()}</td>
                  </tr>
                ))}
                {slow.length === 0 && <tr><td colSpan={4} className="px-5 py-10 text-center text-muted">ไม่มีของค้างสต๊อก 🎉</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      <p className="mt-3 text-xs text-faint">* "หมดใน" = คงเหลือ ÷ อัตราขายเฉลี่ยต่อวัน (90 วันล่าสุด) · ขนาดตัวอย่าง 1.2ml ไม่ track สต๊อกจึงแสดงคงเหลือ 0</p>
    </div>
  );
}
