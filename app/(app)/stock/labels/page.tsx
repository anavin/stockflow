import Link from "next/link";
import { requireStock } from "@/lib/auth/require-user";
import { can } from "@/lib/auth/roles";
import { listLabelStock } from "@/lib/queries";
import LabelStock from "@/components/LabelStock";
import { History } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function LabelsPage() {
  const me = await requireStock();
  const scents = await listLabelStock();
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink">สต๊อกสติ๊กเกอร์และการ์ด</h1>
          <p className="text-sm text-muted">จำนวนสติ๊กเกอร์/การ์ดคงเหลือ ต่อกลิ่น (แสดงชิ้นส่วนตาม Grade) · รับเข้า/เบิก/ปรับยอด</p>
        </div>
        <Link href="/stock/materials/moves?cat=label" className="btn-ghost"><History size={16} /> ประวัติ</Link>
      </div>
      <LabelStock scents={scents} canEdit={can.manageStock(me.role)} />
    </div>
  );
}
