import Link from "next/link";
import { requireUser } from "@/lib/auth/require-user";
import { listIssuedOrders } from "@/lib/queries";
import { ChevronLeft, Search, Printer, Eye, ListChecks } from "lucide-react";
import ReverseIssueButton from "@/components/ReverseIssueButton";

export const dynamic = "force-dynamic";

export default async function IssuedOrdersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const me = await requireUser();
  const { q } = await searchParams;
  const rows = await listIssuedOrders({ search: q, limit: 200 });

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">
      <Link href="/stock/issue" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink"><ChevronLeft size={16} /> กลับ</Link>
      <h1 className="mb-1 text-xl font-bold text-ink">ใบเบิกที่ตัดสต๊อกแล้ว</h1>
      <p className="mb-6 text-sm text-muted">{rows.length} ใบ — ดูรายการ / พิมพ์ / ดูการตัดสต๊อก{me.role === "admin" ? " · ผิดพลาดกด ↩ ยกเลิก (คืนสต๊อก) แล้วแก้ไข/ตัดใหม่ได้" : ""}</p>

      <form className="mb-4 flex gap-2" action="/stock/issued">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <input name="q" defaultValue={q} className="input pl-9" placeholder="ค้นหา Order No. / เลขที่ / ผู้รับ" />
        </div>
        <button className="btn-ghost">ค้นหา</button>
      </form>

      <div className="overflow-hidden rounded-xl border border-line bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-soft text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-3">เลขที่ใบเบิก</th>
                <th className="px-4 py-3">Order No.</th>
                <th className="px-4 py-3">ผู้รับ</th>
                <th className="px-4 py-3 text-center">รายการ</th>
                <th className="px-4 py-3">ตัดสต๊อกเมื่อ</th>
                <th className="px-4 py-3">โดย</th>
                <th className="px-4 py-3 text-right">ดู</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-muted">ยังไม่มีใบเบิกที่ตัดสต๊อก</td></tr>}
              {rows.map((o) => (
                <tr key={o.order_no} className="border-t border-line hover:bg-soft/40">
                  <td className="px-4 py-2.5 font-mono text-xs font-medium text-ink">{o.doc_no || "—"}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{o.order_no}</td>
                  <td className="px-4 py-2.5">{o.receiver || "—"}</td>
                  <td className="px-4 py-2.5 text-center"><span className="chip bg-brand-50 text-brand-600">{o.item_count}</span></td>
                  <td className="px-4 py-2.5 text-xs text-muted">{new Date(o.stock_issued_at).toLocaleString("th-TH")}</td>
                  <td className="px-4 py-2.5 text-xs text-muted">{o.issued_by || "—"}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/shopee/${encodeURIComponent(o.order_no)}`} className="rounded-md p-1.5 text-muted hover:bg-soft hover:text-ink" title="ดูรายละเอียดใบเบิก"><Eye size={16} /></Link>
                      <Link href={`/stock/moves?order=${encodeURIComponent(o.order_no)}`} className="rounded-md p-1.5 text-muted hover:bg-soft hover:text-ink" title="ดูการตัดสต๊อก"><ListChecks size={16} /></Link>
                      <a href={`/api/print/${encodeURIComponent(o.order_no)}`} target="_blank" rel="noreferrer" className="rounded-md p-1.5 text-muted hover:bg-brand-50 hover:text-brand-600" title="พิมพ์"><Printer size={16} /></a>
                      {me.role === "admin" && <ReverseIssueButton orderNo={o.order_no} />}
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
