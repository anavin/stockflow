import Link from "next/link";
import { requireReturns } from "@/lib/auth/require-user";
import { can } from "@/lib/auth/roles";
import { listReturnsToday } from "@/lib/queries";
import ReturnScanner from "@/components/ReturnScanner";
import { PackageX, History } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ReturnsPage() {
  const me = await requireReturns();
  const todayReturns = await listReturnsToday();
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink">รับคืนสินค้า</h1>
          <p className="text-sm text-muted">สแกน Order No. ที่ตีกลับ → เลือกคืนเข้าสต๊อก หรือ ตีชำรุด รายชิ้น</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/returns/history" className="btn-ghost"><History size={16} /> ประวัติการคืน</Link>
          {can.viewStock(me.role) && <Link href="/stock/damaged" className="btn-ghost"><PackageX size={16} /> สต๊อกของชำรุด</Link>}
        </div>
      </div>
      <ReturnScanner todayReturns={todayReturns} />
    </div>
  );
}
