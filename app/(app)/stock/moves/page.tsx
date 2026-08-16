import Link from "next/link";
import { requireStock } from "@/lib/auth/require-user";
import { getStockMoves } from "@/lib/queries";
import { ChevronLeft, ArrowDownCircle, ArrowUpCircle, Wrench } from "lucide-react";

export const dynamic = "force-dynamic";

const REASON: Record<string, { label: string; cls: string }> = {
  issue: { label: "ตัดสต๊อก", cls: "bg-red-50 text-red-600" },
  receive: { label: "รับเข้า", cls: "bg-green-50 text-green-700" },
  adjust: { label: "ปรับยอด", cls: "bg-soft text-muted" },
};

export default async function StockMovesPage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  await requireStock();
  const { order } = await searchParams;
  const moves = await getStockMoves({ orderNo: order, limit: 300 });

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-8">
      <Link href="/stock" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink"><ChevronLeft size={16} /> กลับ</Link>
      <h1 className="mb-1 text-xl font-bold text-ink">ประวัติการเคลื่อนไหวสต๊อก</h1>
      <p className="mb-6 text-sm text-muted">{order ? `กรองเฉพาะ Order No. ${order} · ` : ""}{moves.length} รายการล่าสุด</p>

      <div className="overflow-hidden rounded-xl border border-line bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-soft text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-3">เวลา</th>
                <th className="px-4 py-3">ประเภท</th>
                <th className="px-4 py-3">กลิ่น</th>
                <th className="px-4 py-3">ขนาด</th>
                <th className="px-4 py-3 text-right">เปลี่ยน</th>
                <th className="px-4 py-3 text-right">คงเหลือ</th>
                <th className="px-4 py-3">อ้างอิง / หมายเหตุ</th>
                <th className="px-4 py-3">โดย</th>
              </tr>
            </thead>
            <tbody>
              {moves.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-muted">ยังไม่มีการเคลื่อนไหว</td></tr>}
              {moves.map((m) => {
                const r = REASON[m.reason] ?? { label: m.reason, cls: "bg-soft text-muted" };
                const Icon = m.reason === "issue" ? ArrowDownCircle : m.reason === "receive" ? ArrowUpCircle : Wrench;
                return (
                  <tr key={m.id} className="border-t border-line">
                    <td className="px-4 py-2.5 text-xs text-muted">{new Date(m.created_at).toLocaleString("th-TH")}</td>
                    <td className="px-4 py-2.5"><span className={`chip ${r.cls} inline-flex items-center gap-1`}><Icon size={12} /> {r.label}</span></td>
                    <td className="px-4 py-2.5 font-medium">{m.product}</td>
                    <td className="px-4 py-2.5 text-muted">{m.size}</td>
                    <td className={`px-4 py-2.5 text-right font-semibold ${m.qty_change < 0 ? "text-red-600" : "text-green-700"}`}>{m.qty_change > 0 ? "+" : ""}{m.qty_change}</td>
                    <td className="px-4 py-2.5 text-right">{m.balance ?? "-"}</td>
                    <td className="px-4 py-2.5 text-xs text-muted">
                      {m.order_no ? <span className="font-mono">{m.order_no}</span> : null}
                      {m.order_no && m.note ? " · " : null}
                      {m.note}
                      {!m.order_no && !m.note ? "-" : null}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted">{m.by_name || "—"}</td>
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
