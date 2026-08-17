import Link from "next/link";
import { requireStock } from "@/lib/auth/require-user";
import { can } from "@/lib/auth/roles";
import { shipSummary, listShippedByDay } from "@/lib/queries";
import ShipScanner from "@/components/ShipScanner";
import { ClipboardList } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ShipPage() {
  const me = await requireStock();
  const canUndo = can.manageStock(me.role);
  const [sum, today] = await Promise.all([shipSummary(), listShippedByDay()]);
  return (
    // มือถือเป็นหลัก: กว้างพอดีจอมือถือ · ธีมน้ำเงินให้ปุ่มสแกนเด่น (เหมือนหน้าตัดสต๊อก)
    <div
      className="mx-auto max-w-md px-4 py-5"
      style={{ ["--brand" as any]: "37 99 235", ["--brand-600" as any]: "29 78 216", ["--brand-50" as any]: "239 246 255" }}
    >
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-bold text-ink">จัดส่งสินค้า</h1>
          <p className="text-xs text-muted">สแกนใบปะหน้าก่อนเอาไปส่ง เพื่อบันทึกว่าส่งออเดอร์ไหนบ้าง</p>
        </div>
        <Link href="/ship/daily" className="btn-ghost text-xs"><ClipboardList size={14} /> ย้อนหลัง</Link>
      </div>
      <ShipScanner initialRows={today} shippedToday={sum.shippedToday} pending={sum.pending} canUndo={canUndo} />
    </div>
  );
}
