import Link from "next/link";
import { requireStock } from "@/lib/auth/require-user";
import { can } from "@/lib/auth/roles";
import { shipSummary, listShippedByDay } from "@/lib/queries";
import ShipScanner from "@/components/ShipScanner";
import { ClipboardList } from "lucide-react";

export const dynamic = "force-dynamic";

const todayBangkok = () => new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);

export default async function ShipPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const me = await requireStock();
  const canUndo = can.manageStock(me.role);
  const { date } = await searchParams;
  const today = todayBangkok();
  const day = /^\d{4}-\d{2}-\d{2}$/.test(date || "") ? date! : today;
  const [sum, rows] = await Promise.all([shipSummary(), listShippedByDay(day)]);
  return (
    // ใช้ได้ทั้งมือถือ (สแกนหน้างาน) และคอม (2 คอลัมน์) · ธีมน้ำเงินให้ปุ่มสแกนเด่น (เหมือนหน้าตัดสต๊อก)
    <div
      className="mx-auto max-w-5xl px-4 py-6 md:px-8"
      style={{ ["--brand" as any]: "37 99 235", ["--brand-600" as any]: "29 78 216", ["--brand-50" as any]: "239 246 255" }}
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink">จัดส่งสินค้า</h1>
          <p className="text-sm text-muted">สแกนใบปะหน้าก่อนเอาไปส่ง เพื่อบันทึกว่าส่งออเดอร์ไหนบ้าง</p>
        </div>
        <Link href="/ship/daily" className="btn-ghost"><ClipboardList size={16} /> ประวัติการส่ง</Link>
      </div>
      <ShipScanner key={day} date={day} isToday={day === today} rows={rows} pending={sum.pending} canUndo={canUndo} />
    </div>
  );
}
