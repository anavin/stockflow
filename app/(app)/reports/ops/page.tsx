import { requireAdmin } from "@/lib/auth/require-user";
import { leadTimeStats, returnReasons, returnStatsByPlatform, returnStatsByScent } from "@/lib/queries";
import ReportTabs from "@/components/ReportTabs";
import { ReportHeader, Kpi, Bar, SectionCard } from "@/components/ReportUI";
import { PlatformDot } from "@/components/PlatformBadge";
import { platformName } from "@/lib/config";
import { Wrench, Timer, Undo2, Layers } from "lucide-react";

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
      <ReportHeader icon={<Wrench size={22} />} title="Operations & คุณภาพ" subtitle="เวลานำจ่าย · อัตราการคืน · เหตุผล/กลิ่นที่คืนบ่อย" />
      <ReportTabs />

      {/* lead time */}
      <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-3">
        <Kpi label="สั่ง → ส่ง (เฉลี่ย)" value={`${lead.avg_order_to_ship ?? "—"} วัน`} icon={<Timer size={17} />} tone="brand" />
        <Kpi label="ตัดสต๊อก → ส่ง (เฉลี่ย)" value={`${lead.avg_issue_to_ship ?? "—"} วัน`} icon={<Timer size={17} />} tone="green" />
        <Kpi label="ส่งแต่ยังไม่ตัดสต๊อก" value={lead.shipped_not_issued.toLocaleString()} sub="ควรตามตัดให้ครบ" icon={<Timer size={17} />} tone={lead.shipped_not_issued > 0 ? "amber" : "slate"} />
      </div>

      {/* อัตราคืนต่อแพลตฟอร์ม */}
      {byPlatform.length > 0 && (
        <SectionCard title="อัตราการคืนต่อแพลตฟอร์ม" icon={<Layers size={16} />} className="mb-5" tone="red">
          <div className="space-y-2.5 p-4">
            {byPlatform.map((p) => (
              <div key={p.platform} className="flex items-center gap-3">
                <span className="flex w-24 shrink-0 items-center gap-1.5 text-xs"><PlatformDot platform={p.platform} /> {platformName(p.platform)}</span>
                <div className="flex-1"><Bar pct={(p.rate || 0) / maxRate * 100} tone="red" /></div>
                <span className="w-12 text-right font-mono text-xs tabular-nums text-ink">{p.rate ? p.rate.toFixed(1) : "0"}%</span>
                <span className="w-28 text-right text-[11px] text-muted">{p.returned_orders}/{p.shipped}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* เหตุผลการคืน */}
        <SectionCard title="เหตุผลการคืน" icon={<Undo2 size={16} />} tone="red">
          <div className="divide-y divide-line">
            {reasons.length === 0 && <p className="px-5 py-10 text-center text-muted">ยังไม่มีการคืน 🎉</p>}
            {reasons.map((r) => (
              <div key={r.reason} className="flex items-center gap-3 px-5 py-2">
                <span className="w-40 shrink-0 truncate text-sm text-ink">{r.reason}</span>
                <div className="flex-1"><Bar pct={r.n / maxReason * 100} tone="red" /></div>
                <span className="w-12 text-right text-xs tabular-nums text-muted">{r.n}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* กลิ่นที่คืนบ่อย */}
        <SectionCard title="กลิ่นที่ถูกคืนบ่อย" icon={<Undo2 size={16} />} tone="red">
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
        </SectionCard>
      </div>
    </div>
  );
}
