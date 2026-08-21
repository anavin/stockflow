"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ReturnRow, ReturnStat, ReturnCustomerStat, ReturnPlatformStat } from "@/lib/queries";
import { reverseReturn } from "@/lib/actions/returns";
import { PlatformDot } from "./PlatformBadge";
import { enabledPlatforms, platformName, platformColor } from "@/lib/config";
import { RotateCcw, Trash2, Undo2, BarChart3, UserRound, Layers } from "lucide-react";

const dt = (s: string) => new Date(s).toLocaleString("th-TH", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export default function ReturnsHistory({ rows, stats, customers = [], platformStats = [], platform, canReverse }: { rows: ReturnRow[]; stats: ReturnStat[]; customers?: ReturnCustomerStat[]; platformStats?: ReturnPlatformStat[]; platform?: string; canReverse: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(0);
  const maxRate = Math.max(1, ...platformStats.map((p) => p.rate || 0));

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
      {/* ตัวกรองแพลตฟอร์ม (มีผลทั้งหน้า) */}
      <div className="flex flex-wrap items-center gap-1.5">
        <Link href="/returns/history"
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${!platform ? "bg-ink text-white" : "bg-soft text-muted hover:text-ink"}`}>ทั้งหมด</Link>
        {enabledPlatforms().map((p) => (
          <Link key={p.code} href={`/returns/history?platform=${p.code}`}
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${platform === p.code ? "text-white" : "bg-soft text-ink hover:opacity-80"}`}
            style={platform === p.code ? { backgroundColor: platformColor(p.code) } : undefined}>
            {platform === p.code ? <span className="h-2 w-2 rounded-full bg-white" /> : <PlatformDot platform={p.code} />} {p.name}
          </Link>
        ))}
      </div>

      {/* อัตราคืนต่อแพลตฟอร์ม (คืน ÷ ส่งแล้ว) */}
      {platformStats.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-line bg-white">
          <div className="flex items-center gap-2 border-b border-line px-4 py-3 text-sm font-semibold text-ink"><Layers size={16} className="text-brand" /> อัตราการคืนต่อแพลตฟอร์ม <span className="text-xs font-normal text-muted">(ออเดอร์ที่คืน ÷ ออเดอร์ที่ส่งแล้ว)</span></div>
          <div className="space-y-2.5 p-4">
            {platformStats.map((p) => (
              <div key={p.platform} className="flex items-center gap-3">
                <span className="flex w-24 shrink-0 items-center gap-1.5 text-xs"><PlatformDot platform={p.platform} /> {platformName(p.platform)}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-soft">
                  <div className="h-full rounded-full" style={{ width: `${Math.round((p.rate || 0) / maxRate * 100)}%`, backgroundColor: platformColor(p.platform) }} />
                </div>
                <span className="w-12 shrink-0 text-right font-mono text-xs tabular-nums text-ink">{p.rate ? p.rate.toFixed(1) : "0"}%</span>
                <span className="w-28 shrink-0 text-right text-[11px] text-muted">{p.returned_orders}/{p.shipped} ออเดอร์</span>
              </div>
            ))}
          </div>
        </div>
      )}

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

      {/* รายงานลูกค้าที่คืนบ่อย */}
      {customers.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-line bg-white">
          <div className="flex items-center gap-2 border-b border-line px-4 py-3 text-sm font-semibold text-ink"><UserRound size={16} className="text-brand" /> ลูกค้าที่คืนบ่อย (ตามชื่อผู้ใช้)</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-soft text-left text-xs text-muted"><tr><th className="px-4 py-2">ชื่อผู้ใช้</th><th className="px-4 py-2">ผู้รับ</th><th className="px-4 py-2 text-right">จำนวนครั้งที่คืน</th><th className="px-4 py-2 text-right">ชิ้นรวม</th><th className="px-4 py-2 text-right">ชำรุด</th><th className="px-4 py-2 text-right">คืนล่าสุด</th></tr></thead>
              <tbody>
                {customers.map((c) => {
                  const hot = c.times >= 3, warn = c.times === 2;
                  return (
                    <tr key={c.username} className="border-t border-line">
                      <td className="px-4 py-2 font-medium text-ink">{c.username}{hot && <span className="chip-danger ml-1.5">คืนบ่อย</span>}{warn && <span className="chip-warn ml-1.5">เฝ้าดู</span>}</td>
                      <td className="px-4 py-2 text-xs text-muted">{c.receiver || "-"}</td>
                      <td className={`px-4 py-2 text-right font-mono font-semibold ${hot ? "text-red-700" : warn ? "text-amber-700" : "text-ink"}`}>{c.times}</td>
                      <td className="px-4 py-2 text-right font-mono text-muted">{c.qty}</td>
                      <td className="px-4 py-2 text-right font-mono text-red-700">{c.damaged}</td>
                      <td className="whitespace-nowrap px-4 py-2 text-right text-xs text-muted">{dt(c.last_at)}</td>
                    </tr>
                  );
                })}
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
                <tr><th className="px-4 py-2">เวลา</th><th className="px-4 py-2">Order No.</th><th className="px-4 py-2">ช่องทาง</th><th className="px-4 py-2">ชื่อผู้ใช้</th><th className="px-4 py-2">รายการ</th><th className="px-4 py-2 text-right">จำนวน</th><th className="px-4 py-2">ปลายทาง</th><th className="px-4 py-2">เหตุผล</th><th className="px-4 py-2">โดย</th>{canReverse && <th className="px-4 py-2"></th>}</tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const voided = !!r.voided_at;
                  return (
                    <tr key={r.id} className={`border-t border-line ${voided ? "opacity-45" : ""}`}>
                      <td className="whitespace-nowrap px-4 py-2 text-xs text-muted">{dt(r.created_at)}</td>
                      <td className="px-4 py-2 font-mono text-xs text-ink">{r.order_no}</td>
                      <td className="px-4 py-2 text-xs text-muted"><span className="inline-flex items-center gap-1.5"><PlatformDot platform={r.platform} /> {platformName(r.platform || undefined)}</span></td>
                      <td className="px-4 py-2 text-xs text-ink">{r.username || "-"}{r.receiver ? <span className="block text-faint">{r.receiver}</span> : null}</td>
                      <td className="px-4 py-2">{r.product} <span className="text-muted">{r.size}</span></td>
                      <td className="px-4 py-2 text-right font-mono">{r.qty}</td>
                      <td className="px-4 py-2">{r.disposition === "restock" ? <span className="chip-ok"><RotateCcw size={11} /> คืนสต๊อก</span> : r.disposition === "damaged" ? <span className="chip-danger"><Trash2 size={11} /> ชำรุด</span> : <span className="chip-muted">∅ ไม่นับ</span>}{voided && <span className="chip-muted ml-1">ยกเลิกแล้ว</span>}</td>
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
