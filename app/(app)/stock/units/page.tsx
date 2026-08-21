import Link from "next/link";
import { requireStock } from "@/lib/auth/require-user";
import { can } from "@/lib/auth/roles";
import { listUnits, unitCounts, stockGapFor, getOrderBrief } from "@/lib/queries";
import { resolvePlatform, enabledPlatforms } from "@/lib/config";
import { PlatformDot, PlatformBadge } from "@/components/PlatformBadge";
import UnitsManager from "@/components/UnitsManager";
import { ChevronLeft, ScanBarcode, Search, FileDown } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function UnitsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; product?: string; size?: string; platform?: string }> }) {
  const me = await requireStock();
  const canEdit = can.manageStock(me.role);
  const { q, status, product, size, platform } = await searchParams;
  const pf = resolvePlatform(platform)?.code;
  const [units, counts] = await Promise.all([listUnits({ search: q, status, product, size, platform: pf, limit: 1000 }), unitCounts()]);
  // ค้นด้วย Order No. ที่ยังไม่มี SKU รายชิ้น → ดึงสรุปออเดอร์มาโชว์ (ตัดสต๊อก/ส่งแล้ว)
  const orderBrief = q && units.length === 0 ? await getOrderBrief(q) : null;
  const exportQs = new URLSearchParams(Object.entries({ q, status, product, size, platform: pf }).filter(([, v]) => v) as [string, string][]).toString();
  const filterQs = (code?: string) => new URLSearchParams(Object.entries({ q, status, product, size, platform: code }).filter(([, v]) => v) as [string, string][]).toString();
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
      <form action="/stock/units" className="mb-3 flex flex-wrap gap-2">
        {pf && <input type="hidden" name="platform" value={pf} />}
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

      {/* ตัวกรองแพลตฟอร์ม (ตาม order ของ SKU) */}
      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        <Link href={`/stock/units${filterQs() ? `?${filterQs()}` : ""}`}
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${!pf ? "bg-ink text-white" : "bg-soft text-muted hover:text-ink"}`}>ทั้งหมด</Link>
        {enabledPlatforms().map((p) => (
          <Link key={p.code} href={`/stock/units?${filterQs(p.code)}`}
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${pf === p.code ? "bg-ink text-white" : "bg-soft text-ink hover:opacity-80"}`}>
            <PlatformDot platform={p.code} /> {p.name}
          </Link>
        ))}
      </div>

      {orderBrief && (
        <div className="mb-4 rounded-xl border border-brand-200 bg-brand-50/50 p-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
            <span className="flex items-center gap-1.5 font-semibold text-ink"><Search size={15} /> ออเดอร์ <span className="font-mono">{orderBrief.order_no}</span></span>
            <PlatformBadge platform={orderBrief.platform} />
            {orderBrief.doc_no && <span className="text-muted">ใบเบิก {orderBrief.doc_no}</span>}
            <span className="text-muted">ผู้รับ {orderBrief.receiver || "—"}{orderBrief.province ? ` · ${orderBrief.province}` : ""}</span>
            <span className="text-muted">{orderBrief.item_count} รายการ</span>
            {orderBrief.stock_issued_at
              ? <span className="chip bg-green-50 text-green-700">ตัดสต๊อกแล้ว</span>
              : <span className="chip bg-amber-50 text-amber-700">ยังไม่ตัดสต๊อก</span>}
            {orderBrief.shipped_at
              ? <span className="chip bg-green-600 text-white">ส่งแล้ว {orderBrief.shipped_at}</span>
              : <span className="chip bg-slate-100 text-slate-600">ยังไม่ส่ง</span>}
            <Link href={`/${(orderBrief.platform || "Shopee").toLowerCase()}/${encodeURIComponent(orderBrief.order_no)}`} className="ml-auto text-xs font-medium text-brand-600 hover:underline">ดูใบเบิก →</Link>
          </div>
          <p className="mt-2 text-xs text-faint">ออเดอร์นี้ไม่มี SKU รายชิ้น (ตัดสต๊อกแบบไม่สแกน SKU หรือยังไม่ตัด) — สถานะจัดส่งดูได้จากตรงนี้</p>
        </div>
      )}
      <UnitsManager units={units} canEdit={canEdit} reconcile={reconcile} />
    </div>
  );
}
