import Link from "next/link";
import { requireStock } from "@/lib/auth/require-user";
import { listShippedByDay } from "@/lib/queries";
import ShipDaily from "@/components/ShipDaily";
import { ScanLine, ChevronLeft } from "lucide-react";

export const dynamic = "force-dynamic";

function todayBangkok(): string {
  // YYYY-MM-DD ตามเวลาไทย
  return new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
}

export default async function ShipDailyPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  await requireStock();
  const { date } = await searchParams;
  const day = /^\d{4}-\d{2}-\d{2}$/.test(date || "") ? date! : todayBangkok();
  const rows = await listShippedByDay(day);
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-8">
      <Link href="/ship" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink"><ChevronLeft size={16} /> กลับหน้าสแกน</Link>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink">รายการส่งแต่ละวัน</h1>
          <p className="text-sm text-muted">ประวัติออเดอร์ที่สแกนส่งในแต่ละวัน</p>
        </div>
        <Link href="/ship" className="btn-primary"><ScanLine size={16} /> ไปหน้าสแกน</Link>
      </div>
      <ShipDaily rows={rows} date={day} />
    </div>
  );
}
