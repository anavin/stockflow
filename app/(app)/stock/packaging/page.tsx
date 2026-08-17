import Link from "next/link";
import { requireStock } from "@/lib/auth/require-user";
import { can } from "@/lib/auth/roles";
import { listPackagingStock } from "@/lib/queries";
import PackagingStock from "@/components/PackagingStock";
import { History } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PackagingPage() {
  const me = await requireStock();
  const rows = await listPackagingStock();
  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink">สต๊อกขวดและแพ็คเกจ</h1>
          <p className="text-sm text-muted">ขวด / ฝา / หัวสเปรย์ / กล่อง / ถุง คงเหลือ · รับเข้า/เบิก/ปรับยอด</p>
        </div>
        <Link href="/stock/materials/moves?cat=packaging" className="btn-ghost"><History size={16} /> ประวัติ</Link>
      </div>
      <PackagingStock rows={rows} canEdit={can.manageStock(me.role)} />
    </div>
  );
}
