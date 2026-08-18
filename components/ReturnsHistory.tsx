"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ReturnRow, ReturnStat } from "@/lib/queries";
import { reverseReturn } from "@/lib/actions/returns";
import { RotateCcw, Trash2, Undo2, BarChart3 } from "lucide-react";

const dt = (s: string) => new Date(s).toLocaleString("th-TH", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export default function ReturnsHistory({ rows, stats, canReverse }: { rows: ReturnRow[]; stats: ReturnStat[]; canReverse: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(0);

  async function undo(id: number) {
    if (!confirm("ยกเลิกการคืนรายการนี้? — จะย้อนสต๊อก/ของชำรุดกลับ")) return;
    setBusy(id);
    const res = await reverseReturn(id);
    setBusy(0);
    if (!res.ok) { alert(res.error); return; }
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* รายงานอัตราคืนต่อกลิ่น */}
      {stats.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-line bg-white">
          <div className="flex items-center gap-2 border-b border-line px-4 py-3 text-sm font-semibold text-ink"><BarChart3 size={16} className="text-brand" /> กลิ่นที่ถูกคืนบ่อย (Top {stats.length})</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-soft text-left text-xs text-muted"><tr><th className="px-4 py-2">กลิ่น</th><th className="px-4 py-2 text-right">คืนรวม</th><th className="px-4 py-2 text-right">ชำรุด</th><th className="px-4 py-2 text-right">จำนวนออเดอร์</th></tr></thead>
              <tbody>
                {stats.map((s) => (
                  <tr key={s.product} className="border-t border-line">
                    <td className="px-4 py-2 font-medium text-ink">{s.product}</td>
                    <td className="px-4 py-2 text-right font-mono">{s.returned}</td>
                    <td className="px-4 py-2 text-right font-mono text-red-700">{s.damaged}</td>
                    <td className="px-4 py-2 text-right font-mono text-muted">{s.times}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ประวัติการคืน */}
      <div className="overflow-hidden rounded-xl border border-line bg-white">
        <div className="flex items-center gap-2 border-b border-line px-4 py-3 text-sm font-semibold text-ink"><Undo2 size={16} className="text-brand" /> ประวัติการคืน ({rows.length})</div>
        {rows.length === 0 ? <p className="px-4 py-12 text-center text-sm text-muted">ยังไม่มีประวัติการคืน</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-soft text-left text-xs text-muted">
                <tr><th className="px-4 py-2">เวลา</th><th className="px-4 py-2">Order No.</th><th className="px-4 py-2">รายการ</th><th className="px-4 py-2 text-right">จำนวน</th><th className="px-4 py-2">ปลายทาง</th><th className="px-4 py-2">เหตุผล</th><th className="px-4 py-2">โดย</th>{canReverse && <th className="px-4 py-2"></th>}</tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const voided = !!r.voided_at;
                  return (
                    <tr key={r.id} className={`border-t border-line ${voided ? "opacity-45" : ""}`}>
                      <td className="whitespace-nowrap px-4 py-2 text-xs text-muted">{dt(r.created_at)}</td>
                      <td className="px-4 py-2 font-mono text-xs text-ink">{r.order_no}</td>
                      <td className="px-4 py-2">{r.product} <span className="text-muted">{r.size}</span></td>
                      <td className="px-4 py-2 text-right font-mono">{r.qty}</td>
                      <td className="px-4 py-2">{r.disposition === "restock" ? <span className="chip-ok"><RotateCcw size={11} /> คืนสต๊อก</span> : <span className="chip-danger"><Trash2 size={11} /> ชำรุด</span>}{voided && <span className="chip-muted ml-1">ยกเลิกแล้ว</span>}</td>
                      <td className="px-4 py-2 text-xs text-muted">{r.reason || "-"}{r.note ? ` · ${r.note}` : ""}</td>
                      <td className="px-4 py-2 text-xs text-muted">{r.by_name || "-"}</td>
                      {canReverse && <td className="px-4 py-2 text-right">{!voided && <button disabled={busy === r.id} onClick={() => undo(r.id)} className="btn-ghost px-2 py-1 text-xs">ยกเลิก</button>}</td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
