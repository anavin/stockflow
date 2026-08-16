import Link from "next/link";
import { requireStock } from "@/lib/auth/require-user";
import { can } from "@/lib/auth/roles";
import { listUnits, unitCounts, stockGapFor } from "@/lib/queries";
import UnitsManager from "@/components/UnitsManager";
import { ChevronLeft, ScanBarcode, Search, FileDown } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function UnitsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; product?: string; size?: string }> }) {
  const me = await requireStock();
  const canEdit = can.manageStock(me.role);
  const { q, status, product, size } = await searchParams;
  const [units, counts] = await Promise.all([listUnits({ search: q, status, product, size, limit: 1000 }), unitCounts()]);
  const exportQs = new URLSearchParams(Object.entries({ q, status, product, size }).filter(([, v]) => v) as [string, string][]).toString();
  // ผูก SKU ให้ตรงยอด — เฉพาะเมื่อกรองสินค้าเดียว (กลิ่น+ขนาด) และแก้ไขได้
  const reconcile = canEdit && product && size ? { product, size, ...(await stockGapFor(product, size)) } : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">
      <Link href="/stock" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ChevronLeft size={16} /> กลับหน้าสต๊อก
      </Link>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-ink"><ScanBarcode size={18} /> ติดตาม SKU (รายชิ้น)</h1>
          <p className="mt-0.5 text-sm text-muted">อยู่คลัง <b className="text-green-700">{counts.in_stock.toLocaleString()}</b> · ตัดออกแล้ว <b className="text-ink">{counts.issued.toLocaleString()}</b> ชิ้น — ค้น SKU เพื่อดูว่าไปออเดอร์ไหน ใครซื้อ</p>
        </div>
        <a href={`/api/stock/units-export${exportQs ? `?${exportQs}` : ""}`} className="btn-ghost text-sm"><FileDown size={15} /> Export Excel</a>
      </div>

      {(product || size) && (
        <div className="mb-3 flex items-center gap-2 text-sm">
          <span className="text-muted">กรองเฉพาะ:</span>
          <span className="chip bg-brand-50 text-brand-600">{product}{size ? ` · ${size}` : ""}</span>
          <Link href="/stock/units" className="text-xs text-muted hover:text-ink">ล้าง</Link>
        </div>
      )}
      <form action="/stock/units" className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-[240px] flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <input name="q" defaultValue={q} className="input pl-9 font-mono" placeholder="สแกน/พิมพ์ SKU · กลิ่น · Order No." />
        </div>
        <select name="status" defaultValue={status ?? ""} className="input w-40">
          <option value="">สถานะ: ทั้งหมด</option>
          <option value="in_stock">อยู่คลัง</option>
          <option value="issued">ตัดออกแล้ว</option>
        </select>
        <button className="btn-primary">ค้นหา</button>
      </form>

      <UnitsManager units={units} canEdit={canEdit} reconcile={reconcile} />
    </div>
  );
}
