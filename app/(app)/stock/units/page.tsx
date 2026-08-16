import Link from "next/link";
import { requireStock } from "@/lib/auth/require-user";
import { listUnits, unitCounts } from "@/lib/queries";
import { ChevronLeft, ScanBarcode, Search } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function UnitsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; product?: string; size?: string }> }) {
  await requireStock();
  const { q, status, product, size } = await searchParams;
  const [units, counts] = await Promise.all([listUnits({ search: q, status, product, size, limit: 1000 }), unitCounts()]);

  const statusChip = (s: string) => s === "issued"
    ? { label: "ตัดออกแล้ว", cls: "bg-soft text-muted" }
    : s === "void" ? { label: "ยกเลิก", cls: "bg-red-50 text-red-600" }
    : { label: "อยู่คลัง", cls: "bg-green-50 text-green-700" };

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

      <div className="overflow-hidden rounded-xl border border-line bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-soft text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-3">Barcode</th>
                <th className="px-3 py-3">SKU</th>
                <th className="px-3 py-3">รายชื่อ</th>
                <th className="px-3 py-3">Type</th>
                <th className="px-3 py-3">วันที่รับเข้า</th>
                <th className="px-3 py-3">สถานะ</th>
                <th className="px-3 py-3">ออเดอร์ / ผู้ซื้อ</th>
              </tr>
            </thead>
            <tbody>
              {units.length === 0 && <tr><td colSpan={7} className="px-4 py-12 text-center text-muted">ไม่พบ SKU — ลองรับเข้าสต๊อกเพื่อบันทึก SKU หรือรัน SQL ตาราง stock_unit</td></tr>}
              {units.map((u) => {
                const st = statusChip(u.status);
                return (
                  <tr key={u.sku} className="border-t border-line hover:bg-soft/40">
                    <td className="px-4 py-2.5 font-mono text-xs text-muted">{u.barcode || "—"}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-ink">{u.sku}</td>
                    <td className="px-3 py-2.5"><span className="font-medium text-ink">{u.product}</span> <span className="text-muted">{u.size}</span></td>
                    <td className="px-3 py-2.5">{u.grade ? <span className="chip bg-brand-50 text-brand-600">{u.grade}</span> : <span className="text-faint">—</span>}</td>
                    <td className="px-3 py-2.5 text-xs text-muted">{u.received_at ? String(u.received_at).slice(0, 10) : "—"}</td>
                    <td className="px-3 py-2.5"><span className={`chip ${st.cls}`}>{st.label}</span></td>
                    <td className="px-3 py-2.5">
                      {u.order_no ? (
                        <Link href={`/shopee/${encodeURIComponent(u.order_no)}`} className="text-brand-600 hover:underline">
                          <span className="font-mono text-xs">{u.order_no}</span>
                          {(u.buyer || u.receiver) && <span className="text-muted"> · {u.buyer || u.receiver}</span>}
                        </Link>
                      ) : <span className="text-faint">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
