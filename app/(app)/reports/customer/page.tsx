import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-user";
import { customerOrders } from "@/lib/queries";
import { platformBase } from "@/lib/config";
import { PlatformDot } from "@/components/PlatformBadge";
import { ReportHeader } from "@/components/ReportUI";
import { ShoppingBag, PackageCheck, Truck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CustomerHistoryPage({ searchParams }: { searchParams: Promise<{ u?: string }> }) {
  await requireAdmin();
  const username = (await searchParams).u || "";
  if (!username.trim()) notFound();
  const orders = await customerOrders(username);
  const totalOrders = orders.length;
  const totalQty = orders.reduce((a, o) => a + o.items.reduce((s, it) => s + Number(it.qty || 0), 0), 0);
  const receiver = orders.find((o) => o.receiver)?.receiver || "";
  const platforms = [...new Set(orders.map((o) => o.platform || "Shopee"))];

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-8">
      <ReportHeader
        icon={<ShoppingBag size={22} />}
        title={username}
        subtitle={<>{receiver ? <>ผู้รับล่าสุด: {receiver} · </> : null}ซื้อ <b className="text-ink">{totalOrders.toLocaleString()}</b> ครั้ง · <b className="text-ink">{totalQty.toLocaleString()}</b> ชิ้น · {platforms.join(", ")}</>}
        back={{ href: "/reports", label: "กลับรายงาน" }}
      />

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-soft text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-2.5">วันที่</th>
                <th className="px-3 py-2.5">Order No.</th>
                <th className="px-3 py-2.5">ช่องทาง</th>
                <th className="px-3 py-2.5">รายการ</th>
                <th className="px-3 py-2.5">จังหวัด</th>
                <th className="px-3 py-2.5 text-center">สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 && <tr><td colSpan={6} className="px-4 py-12 text-center text-muted">ไม่พบประวัติของลูกค้ารายนี้</td></tr>}
              {orders.map((o) => (
                <tr key={o.order_no} className="border-t border-line align-top hover:bg-soft/40">
                  <td className="px-4 py-2.5 whitespace-nowrap text-xs text-muted">{o.date || "—"}</td>
                  <td className="px-3 py-2.5">
                    <Link href={`${platformBase(o.platform || "Shopee")}/${encodeURIComponent(o.order_no)}`} className="font-mono text-xs text-brand-600 hover:underline">{o.order_no}</Link>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted"><span className="inline-flex items-center gap-1.5"><PlatformDot platform={o.platform} /> {o.platform || "Shopee"}</span></td>
                  <td className="px-3 py-2.5 text-xs text-ink">{o.items.map((it, k) => <span key={k} className="mr-1 inline-block">{it.product} {it.size}{it.is_free ? " (Free)" : ""} ×{it.qty}{k < o.items.length - 1 ? "," : ""}</span>)}</td>
                  <td className="px-3 py-2.5 text-xs text-muted">{o.province || "—"}</td>
                  <td className="px-3 py-2.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {o.issued && <PackageCheck size={14} className="text-green-600" />}
                      {o.shipped && <Truck size={14} className="text-green-600" />}
                      {o.return_status && o.return_status !== "none" && <span className="chip-danger">คืน</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
