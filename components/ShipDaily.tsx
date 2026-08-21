"use client";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import type { ShipRow } from "@/lib/queries";
import { PlatformDot } from "./PlatformBadge";
import { platformName } from "@/lib/config";
import { FileDown, Truck } from "lucide-react";

const timeOf = (v?: string | null) => (v ? new Date(v).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) : "—");

export default function ShipDaily({ rows, date }: { rows: ShipRow[]; date: string }) {
  const router = useRouter();
  const totalItems = rows.reduce((s, r) => s + (r.item_count || 0), 0);
  const byPlatform = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) { const p = r.platform || "Shopee"; m.set(p, (m.get(p) || 0) + 1); }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [rows]);

  function exportCsv() {
    const header = ["เวลา", "Order No.", "ช่องทาง", "เลขที่ใบเบิก", "ผู้รับ", "จังหวัด", "รายการ", "ผู้สแกน"];
    const lines = rows.map((r) => [timeOf(r.shipped_at), r.order_no, platformName(r.platform || undefined), r.doc_no || "", r.receiver || "", r.province || "", r.item_count, r.shipped_by_name || ""]
      .map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","));
    const csv = "﻿" + [header.join(","), ...lines].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = `ส่งของ-${date}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted">วันที่ส่ง</label>
          <input type="date" value={date} onChange={(e) => router.push(`/ship/daily?date=${e.target.value}`)} className="input h-9 w-40" />
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted">ส่ง <b className="text-ink">{rows.length.toLocaleString()}</b> ออเดอร์ · {totalItems.toLocaleString()} รายการ</span>
          <button onClick={exportCsv} disabled={!rows.length} className="btn-ghost text-xs disabled:opacity-50"><FileDown size={14} /> Export</button>
        </div>
      </div>

      {/* สรุปแยกแพลตฟอร์ม */}
      {byPlatform.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {byPlatform.map(([code, n]) => (
            <span key={code} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-2.5 py-1 text-xs">
              <PlatformDot platform={code} /> {platformName(code)} <b className="text-ink">{n}</b>
            </span>
          ))}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-line bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-soft text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-3">เวลา</th>
                <th className="px-4 py-3">Order No.</th>
                <th className="px-4 py-3">ช่องทาง</th>
                <th className="px-4 py-3">เลขที่ใบเบิก</th>
                <th className="px-4 py-3">ผู้รับ</th>
                <th className="px-4 py-3">จังหวัด</th>
                <th className="px-4 py-3 text-center">รายการ</th>
                <th className="px-4 py-3">ผู้สแกน</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={8} className="px-4 py-12 text-center text-muted"><Truck size={20} className="mx-auto mb-2 text-faint" />ไม่มีรายการส่งในวันนี้</td></tr>}
              {rows.map((r) => (
                <tr key={r.order_no} className="border-t border-line hover:bg-soft/40">
                  <td className="px-4 py-2.5 text-xs tabular-nums text-muted">{timeOf(r.shipped_at)}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-ink">{r.order_no}</td>
                  <td className="px-4 py-2.5 text-xs text-muted"><span className="inline-flex items-center gap-1.5"><PlatformDot platform={r.platform} /> {platformName(r.platform || undefined)}</span></td>
                  <td className="px-4 py-2.5 font-mono text-xs text-muted">{r.doc_no || "—"}</td>
                  <td className="px-4 py-2.5">{r.receiver || "—"}</td>
                  <td className="px-4 py-2.5 text-muted">{r.province || "—"}</td>
                  <td className="px-4 py-2.5 text-center"><span className="chip bg-brand-50 text-brand-600">{r.item_count}</span></td>
                  <td className="px-4 py-2.5 text-xs text-muted">{r.shipped_by_name || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
