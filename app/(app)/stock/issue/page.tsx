import Link from "next/link";
import { requireUser } from "@/lib/auth/require-user";
import { stockSummary } from "@/lib/queries";
import StockIssue from "@/components/StockIssue";
import { Boxes, History, ClipboardList } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function StockIssuePage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const me = await requireUser();
  const { order } = await searchParams;
  const sum = await stockSummary();
  return (
    // หน้าสแกน = ธีมน้ำเงิน (override --brand เฉพาะหน้านี้) ให้ action เด่น;
    // สีผลลัพธ์ เขียว/เหลือง/แดง ไม่เปลี่ยน
    <div
      className="mx-auto max-w-3xl px-4 py-6 md:px-8"
      style={{ ["--brand" as any]: "37 99 235", ["--brand-600" as any]: "29 78 216", ["--brand-50" as any]: "239 246 255" }}
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink">ตัดสต๊อก (สแกนใบเบิก)</h1>
          <p className="text-sm text-muted">สแกน Order No. → ตัดสต๊อกตามรายการอัตโนมัติ · ตัดไปแล้ว {sum.issuedOrders.toLocaleString()} ใบ</p>
        </div>
        <div className="flex gap-2">
          <Link href="/stock/issued" className="btn-ghost"><ClipboardList size={16} /> ใบที่ตัดแล้ว</Link>
          <Link href="/stock" className="btn-ghost"><Boxes size={16} /> สต๊อกคงเหลือ</Link>
          <Link href="/stock/moves" className="btn-ghost"><History size={16} /> ประวัติ</Link>
        </div>
      </div>
      <StockIssue isAdmin={me.role === "admin"} initialOrder={order} />
    </div>
  );
}
