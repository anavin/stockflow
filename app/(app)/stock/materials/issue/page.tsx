import Link from "next/link";
import { requireStock } from "@/lib/auth/require-user";
import { can } from "@/lib/auth/roles";
import { listAllMaterials } from "@/lib/queries";
import MaterialIssue from "@/components/MaterialIssue";
import { ChevronLeft, PackageOpen, History } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function MaterialIssuePage({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const me = await requireStock();
  const canIssue = can.manageStock(me.role);
  const { mode } = await searchParams;
  const initialMode = mode === "receive" ? "receive" : "issue";
  const items = await listAllMaterials();
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">
      <Link href="/stock/bulk" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ChevronLeft size={16} /> กลับหน้าวัตถุดิบ
      </Link>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-ink"><PackageOpen size={18} /> รับเข้า / เบิก วัตถุดิบ (รวมหลายรายการ)</h1>
          <p className="mt-0.5 text-sm text-muted">เลือกโหมด → ค้นหา/เลือกหมวด → เพิ่มลงรายการ → ใส่จำนวน → ทำทีเดียว · ครบทุกหมวด (น้ำหอม/สติ๊กเกอร์/แพ็คเกจ)</p>
        </div>
        <Link href="/stock/materials/moves" className="btn-ghost text-sm"><History size={15} /> ประวัติ</Link>
      </div>
      <MaterialIssue items={items} canIssue={canIssue} initialMode={initialMode} />
    </div>
  );
}
