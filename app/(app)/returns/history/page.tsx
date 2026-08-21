import { requireReturns } from "@/lib/auth/require-user";
import { can } from "@/lib/auth/roles";
import { listReturns, returnStatsByScent, returnStatsByCustomer, returnStatsByPlatform } from "@/lib/queries";
import { resolvePlatform } from "@/lib/config";
import ReturnsHistory from "@/components/ReturnsHistory";

export const dynamic = "force-dynamic";

export default async function ReturnsHistoryPage({ searchParams }: { searchParams: Promise<{ platform?: string }> }) {
  const me = await requireReturns();
  const pf = resolvePlatform((await searchParams).platform)?.code;
  const [rows, stats, customers, platformStats] = await Promise.all([
    listReturns(200, pf), returnStatsByScent(pf), returnStatsByCustomer(pf), returnStatsByPlatform(),
  ]);
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-ink">ประวัติการคืน & รายงาน</h1>
        <p className="text-sm text-muted">ทุกการรับคืน + อัตราคืนต่อแพลตฟอร์ม/กลิ่น (ดูว่าแพลตฟอร์ม/กลิ่นไหน/ขนส่งมีปัญหา)</p>
      </div>
      <ReturnsHistory rows={rows} stats={stats} customers={customers} platformStats={platformStats} platform={pf} canReverse={can.manageDamaged(me.role)} />
    </div>
  );
}
