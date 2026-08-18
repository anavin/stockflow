import Link from "next/link";
import { requireStock } from "@/lib/auth/require-user";
import { can } from "@/lib/auth/roles";
import { listAllMaterials } from "@/lib/queries";
import MaterialIssue from "@/components/MaterialIssue";
import { ChevronLeft, PackageMinus, History } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function MaterialIssuePage() {
  const me = await requireStock();
  const canIssue = can.manageStock(me.role);
  const items = await listAllMaterials();
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">
      <Link href="/stock/bulk" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ChevronLeft size={16} /> กลับหน้าวัตถุดิบ
      </Link>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-ink"><PackageMinus size={18} /> เบิกวัตถุดิบ (รวมหลายรายการ)</h1>
          <p className="mt-0.5 text-sm text-muted">ค้นหา → เพิ่มลงรายการ → ใส่จำนวน → เบิกทีเดียว · ตัดสต๊อกทุกหมวด (ปริมาตร/สติ๊กเกอร์/แพ็คเกจ)</p>
        </div>
        <Link href="/stock/materials/moves" className="btn-ghost text-sm"><History size={15} /> ประวัติการเบิก</Link>
      </div>
      <MaterialIssue items={items} canIssue={canIssue} />
    </div>
  );
}
