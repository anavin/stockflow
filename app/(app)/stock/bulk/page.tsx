import Link from "next/link";
import { requireStock } from "@/lib/auth/require-user";
import { can } from "@/lib/auth/roles";
import { listBulkStock } from "@/lib/queries";
import BulkStock from "@/components/BulkStock";
import { History } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function BulkPage() {
  const me = await requireStock();
  const rows = await listBulkStock();
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink">สต๊อกปริมาตรน้ำหอม (ยังไม่บรรจุ)</h1>
          <p className="text-sm text-muted">ปริมาตรน้ำหอมคงเหลือ (ml) ต่อกลิ่น — Lab Parfumo + OEM · รับเข้า/เบิก/ปรับยอด</p>
        </div>
        <Link href="/stock/materials/moves?cat=bulk" className="btn-ghost"><History size={16} /> ประวัติ</Link>
      </div>
      <BulkStock rows={rows} canEdit={can.manageStock(me.role)} />
    </div>
  );
}
