import { requireReturns } from "@/lib/auth/require-user";
import { can } from "@/lib/auth/roles";
import { listReturns, returnStatsByScent, returnStatsByCustomer } from "@/lib/queries";
import ReturnsHistory from "@/components/ReturnsHistory";

export const dynamic = "force-dynamic";

export default async function ReturnsHistoryPage() {
  const me = await requireReturns();
  const [rows, stats, customers] = await Promise.all([listReturns(), returnStatsByScent(), returnStatsByCustomer()]);
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-ink">ประวัติการคืน & รายงาน</h1>
        <p className="text-sm text-muted">ทุกการรับคืน + อัตราคืนต่อกลิ่น (ดูว่ากลิ่นไหน/ขนส่งมีปัญหา)</p>
      </div>
      <ReturnsHistory rows={rows} stats={stats} customers={customers} canReverse={can.manageDamaged(me.role)} />
    </div>
  );
}
