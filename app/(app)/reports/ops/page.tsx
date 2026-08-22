import { requireAdmin } from "@/lib/auth/require-user";
import { leadTimeStats, returnReasons, returnStatsByPlatform, returnStatsByScent } from "@/lib/queries";
import ReportTabs from "@/components/ReportTabs";
import { PlatformDot } from "@/components/PlatformBadge";
import { platformName } from "@/lib/config";
import { BarChart3, Timer, Undo2, Layers } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function OpsReport() {
  await requireAdmin();
  const [lead, reasons, byPlatform, byScent] = await Promise.all([
    leadTimeStats(), returnReasons(), returnStatsByPlatform(), returnStatsByScent(),
  ]);
  const maxRate = Math.max(1, ...byPlatform.map((p) => p.rate || 0));
  const maxReason = Math.max(1, ...reasons.map((r) => r.n));

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">
      <div className="mb-4"><h1 className="flex items-center gap-2 text-xl font-bold text-ink"><BarChart3 size={18} /> รายงาน & วิเคราะห์</h1></div>
      <ReportTabs />

      {/* lead time */}
      <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="card p-4"><div className="flex items-center gap-1.5 text-xs text-muted"><Timer size={16} /> สั่ง → ส่ง (เฉลี่ย)</div><div className="mt-1 text-2xl font-bold text-ink">{lead.avg_order_to_ship ?? "—"} <span className="text-sm font-normal text-muted">วัน</span></div></div>
        <div className="card p-4"><div className="flex items-center gap-1.5 text-xs text-muted"><Timer size={16} /> ตัดสต๊อก → ส่ง (เฉลี่ย)</div><div className="mt-1 text-2xl font-bold text-ink">{lead.avg_issue_to_ship ?? "—"} <span className="text-sm font-normal text-muted">วัน</span></div></div>
        <div className="card p-4"><div className="flex items-center gap-1.5 text-xs text-muted"><Timer size={16} /> ส่งแต่ยังไม่ตัดสต๊อก</div><div className={`mt-1 text-2xl font-bold ${lead.shipped_not_issued > 0 ? "text-amber-600" : "text-ink"}`}>{lead.shipped_not_issued.toLocaleString()}</div><div className="text-xs text-faint">ควรตามตัดให้ครบ</div></div>
      </div>

      {/* อัตราคืนต่อแพลตฟอร์ม */}
      {byPlatform.length > 0 && (
        <section className="card mb-5 overflow-hidden">
          <div className="flex items-center gap-2 border-b border-line px-5 py-3.5 text-sm font-semibold text-ink"><Layers size={16} className="text-brand" /> อัตราการคืนต่อแพลตฟอร์ม</div>
          <div className="space-y-2.5 p-4">
            {byPlatform.map((p) => (
              <div key={p.platform} className="flex items-center gap-3">
                <span className="flex w-24 shrink-0 items-center gap-1.5 text-xs"><PlatformDot platform={p.platform} /> {platformName(p.platform)}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-soft"><div className="h-full rounded-full bg-red-500" style={{ width: `${Math.round((p.rate || 0) / maxRate * 100)}%` }} /></div>
                <span className="w-12 text-right font-mono text-xs tabular-nums text-ink">{p.rate ? p.rate.toFixed(1) : "0"}%</span>
                <span className="w-28 text-right text-[11px] text-muted">{p.returned_orders}/{p.shipped}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* เหตุผลการคืน */}
        <section className="card overflow-hidden">
          <div className="flex items-center gap-2 border-b border-line px-5 py-3.5 text-sm font-semibold text-ink"><Undo2 size={16} className="text-brand" /> เหตุผลการคืน</div>
          <div className="divide-y divide-line">
            {reasons.length === 0 && <p className="px-5 py-10 text-center text-muted">ยังไม่มีการคืน 🎉</p>}
            {reasons.map((r) => (
              <div key={r.reason} className="flex items-center gap-3 px-5 py-2">
                <span className="w-40 shrink-0 truncate text-sm text-ink">{r.reason}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-soft"><div className="h-full rounded-full bg-red-400" style={{ width: `${Math.round(r.n / maxReason * 100)}%` }} /></div>
                <span className="w-12 text-right text-xs tabular-nums text-muted">{r.n}</span>
              </div>
            ))}
          </div>
        </section>

        {/* กลิ่นที่คืนบ่อย */}
        <section className="card overflow-hidden">
          <div className="flex items-center gap-2 border-b border-line px-5 py-3.5 text-sm font-semibold text-ink"><Undo2 size={16} className="text-brand" /> กลิ่นที่ถูกคืนบ่อย</div>
          {byScent.length === 0 ? <p className="px-5 py-10 text-center text-muted">ยังไม่มีการคืน 🎉</p> : (
            <table className="w-full text-sm">
              <thead className="bg-soft text-left text-xs text-muted"><tr><th className="px-5 py-2.5">กลิ่น</th><th className="px-3 py-2.5 text-right">คืนรวม</th><th className="px-3 py-2.5 text-right">ชำรุด</th></tr></thead>
              <tbody>
                {byScent.slice(0, 15).map((s) => (
                  <tr key={s.product} className="border-t border-line"><td className="px-5 py-2 font-medium text-ink">{s.product}</td><td className="px-3 py-2 text-right tabular-nums text-red-600">{s.returned}</td><td className="px-3 py-2 text-right tabular-nums text-muted">{s.damaged}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}
