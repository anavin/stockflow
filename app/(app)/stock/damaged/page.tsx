import { requireStock } from "@/lib/auth/require-user";
import { can } from "@/lib/auth/roles";
import { listDamaged } from "@/lib/queries";
import DamagedStock from "@/components/DamagedStock";

export const dynamic = "force-dynamic";

export default async function DamagedPage() {
  const me = await requireStock();
  const rows = await listDamaged();
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-ink">สต๊อกของชำรุด</h1>
        <p className="text-sm text-muted">ของที่รับคืนแล้วตีเป็นชำรุด — ซ่อมคืนสต๊อก / เคลม / ทำลาย</p>
      </div>
      <DamagedStock rows={rows} canManage={can.manageDamaged(me.role)} />
    </div>
  );
}
