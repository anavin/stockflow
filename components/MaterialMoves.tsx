"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import type { MaterialMoveRow } from "@/lib/queries";

const CATS: { key: string; label: string }[] = [
  { key: "", label: "ทั้งหมด" }, { key: "bulk", label: "ปริมาตรน้ำหอม" }, { key: "label", label: "สติ๊กเกอร์/การ์ด" }, { key: "packaging", label: "ขวด/แพ็คเกจ" },
];
const CAT_TH: Record<string, string> = { bulk: "ปริมาตร", label: "สติ๊กเกอร์", packaging: "แพ็คเกจ" };
const dt = (v: string) => new Date(v).toLocaleString("th-TH", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export default function MaterialMoves({ rows, cat, date, ref_, q, itemLabel }: { rows: MaterialMoveRow[]; cat: string; date: string; ref_: string; q: string; itemLabel: string }) {
  const router = useRouter();
  const [term, setTerm] = useState(q);
  const go = (next: { cat?: string; date?: string; ref?: string; q?: string }) => {
    const c = next.cat ?? cat, d = next.date ?? date;
    const r = next.ref ?? ref_, qq = next.q ?? q; const sp = new URLSearchParams();
    if (c) sp.set("cat", c); if (d) sp.set("date", d); if (r) sp.set("ref", r); if (qq) sp.set("q", qq);
    router.push(`/stock/materials/moves${sp.toString() ? "?" + sp.toString() : ""}`);
  };
  const reasonChip = (r: string) => r === "receive" ? "bg-green-50 text-green-700" : r === "issue" ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-600";
  const reasonTh = (r: string) => r === "receive" ? "รับเข้า" : r === "issue" ? "จ่ายออก" : "ปรับยอด";

  return (
    <div className="space-y-4">
      {(ref_ || q) && (
        <div className="flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50/50 px-3 py-2 text-sm">
          <span className="text-muted">ดูประวัติเฉพาะ:</span>
          <span className="font-semibold text-ink">{ref_ ? itemLabel : `“${q}”`}</span>
          <button onClick={() => go({ ref: "", q: "" })} className="ml-1 inline-flex items-center gap-0.5 text-xs text-brand-600 hover:underline"><X size={12} /> ล้าง ดูทั้งหมด</button>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5">
          {CATS.map((c) => (
            <button key={c.key} onClick={() => go({ cat: c.key })}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${cat === c.key ? "bg-brand-50 text-brand-700" : "border border-line text-muted hover:bg-soft"}`}>{c.label}</button>
          ))}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); go({ q: term.trim(), ref: "" }); }} className="relative min-w-[180px] flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <input value={term} onChange={(e) => setTerm(e.target.value)} className="input h-9 pl-9" placeholder="ค้นหากลิ่น / รายการ" />
        </form>
        <input type="date" value={date} onChange={(e) => go({ date: e.target.value })} className="input h-9 w-40" />
        {date && <button onClick={() => go({ date: "" })} className="btn-ghost text-xs">ทุกวัน</button>}
        <span className="ml-auto text-xs text-muted">{rows.length.toLocaleString()} รายการ</span>
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-soft text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-3">เวลา</th><th className="px-3 py-3">หมวด</th><th className="px-3 py-3">รายการ</th>
                <th className="px-3 py-3">ประเภท</th><th className="px-3 py-3 text-right">จำนวน</th><th className="px-3 py-3 text-right">คงเหลือ</th>
                <th className="px-3 py-3">ผู้ทำ</th><th className="px-3 py-3">หมายเหตุ</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={8} className="px-4 py-12 text-center text-muted">ไม่มีประวัติ</td></tr>}
              {rows.map((m) => (
                <tr key={m.id} className="border-t border-line hover:bg-soft/40">
                  <td className="px-4 py-2.5 text-xs tabular-nums text-muted">{dt(m.created_at)}</td>
                  <td className="px-3 py-2.5 text-xs text-muted">{CAT_TH[m.category] || m.category}</td>
                  <td className="px-3 py-2.5 text-ink">{m.label}</td>
                  <td className="px-3 py-2.5"><span className={`chip ${reasonChip(m.reason)}`}>{reasonTh(m.reason)}</span></td>
                  <td className={`px-3 py-2.5 text-right font-semibold tabular-nums ${m.qty_change < 0 ? "text-red-600" : "text-green-700"}`}>{m.qty_change > 0 ? "+" : ""}{m.qty_change.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-ink">{m.balance?.toLocaleString() ?? "—"}</td>
                  <td className="px-3 py-2.5 text-xs text-muted">{m.by_name || "—"}</td>
                  <td className="px-3 py-2.5 text-xs text-muted">{m.note || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
