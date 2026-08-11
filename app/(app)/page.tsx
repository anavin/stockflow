import Link from "next/link";
import { requireUser } from "@/lib/auth/require-user";
import { dashboardStats, listStock, listOrders } from "@/lib/queries";
import { PlusCircle, ScanLine, Boxes, AlertTriangle, PackageCheck, ClipboardList, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  await requireUser();
  const [s, lowStock, recent] = await Promise.all([
    dashboardStats(),
    listStock({ lowOnly: true, limit: 8 }),
    listOrders({ platform: "Shopee", limit: 6 }),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink">ภาพรวม</h1>
          <p className="text-sm text-muted">ระบบเบิกสินค้า Shopee + สต๊อกกลาง</p>
        </div>
        <div className="flex gap-2">
          <Link href="/shopee/new" className="btn-primary"><PlusCircle size={16} /> สร้างใบเบิก</Link>
          <Link href="/stock/issue" className="btn-ghost"><ScanLine size={16} /> ตัดสต๊อก</Link>
        </div>
      </div>

      {/* stat tiles */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="ออร์เดอร์ทั้งหมด" value={s.ordersTotal} sub={`เดือนนี้ ${s.ordersMonth.toLocaleString()} · วันนี้ ${s.ordersToday.toLocaleString()}`} href="/shopee" />
        <Stat label="ตัดสต๊อกแล้ว" value={s.issuedTotal} sub={`วันนี้ ${s.issuedToday.toLocaleString()} ใบ`} icon={<PackageCheck size={16} />} href="/stock/issued" tone="green" />
        <Stat label="รอตัดสต๊อก" value={s.pendingIssue} sub="ยังไม่สแกน" icon={<ClipboardList size={16} />} href="/stock/issue" tone="amber" />
        <Stat label="สต๊อกใกล้หมด / ติดลบ" value={s.low} sub={s.negative > 0 ? `ติดลบ ${s.negative} รายการ` : "ปกติ"} icon={<AlertTriangle size={16} />} href="/stock?low=1" tone={s.negative > 0 ? "red" : "amber"} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* low stock */}
        <section className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-ink"><AlertTriangle size={15} className="text-amber-500" /> สต๊อกที่ต้องเติม (≤10)</h2>
            <Link href="/stock?low=1" className="inline-flex items-center gap-1 text-xs text-brand-600">ดูทั้งหมด <ArrowRight size={12} /></Link>
          </div>
          {lowStock.length === 0 ? <p className="py-6 text-center text-sm text-muted">สต๊อกเพียงพอ 👍</p> : (
            <div className="space-y-1.5">
              {lowStock.map((r) => (
                <div key={`${r.product}|${r.size}`} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-soft">
                  <span><span className="font-medium text-ink">{r.product}</span> <span className="text-muted">{r.size}</span></span>
                  <span className={`chip ${r.qty < 0 ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-700"}`}>คงเหลือ {r.qty}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* recent orders */}
        <section className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-ink"><Boxes size={15} /> ออร์เดอร์ล่าสุด</h2>
            <Link href="/shopee" className="inline-flex items-center gap-1 text-xs text-brand-600">ดูทั้งหมด <ArrowRight size={12} /></Link>
          </div>
          <div className="space-y-1.5">
            {recent.map((o) => (
              <Link key={o.order_no} href={`/shopee/${encodeURIComponent(o.order_no)}`} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-soft">
                <span><span className="font-mono text-xs text-ink">{o.order_no}</span> <span className="text-muted">· {o.receiver || o.username || "—"}</span></span>
                <span className="chip bg-brand-50 text-brand-600">{o.item_count} รายการ</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, sub, icon, href, tone = "ink" }: { label: string; value: number; sub?: string; icon?: React.ReactNode; href: string; tone?: "ink" | "green" | "amber" | "red" }) {
  const toneCls = tone === "green" ? "text-green-700" : tone === "amber" ? "text-amber-600" : tone === "red" ? "text-red-600" : "text-ink";
  return (
    <Link href={href} className="card p-4 transition-shadow hover:shadow-card">
      <div className="flex items-center justify-between text-muted">
        <span className="text-xs">{label}</span>
        {icon}
      </div>
      <div className={`mt-1 text-2xl font-bold ${toneCls}`}>{value.toLocaleString()}</div>
      {sub && <div className="mt-0.5 text-[11px] text-faint">{sub}</div>}
    </Link>
  );
}
