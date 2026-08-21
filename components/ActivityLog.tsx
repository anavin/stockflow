"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ActivityRow } from "@/lib/queries";
import { ROLE_LABELS, roleList } from "@/lib/auth/roles";
import { downloadCsv } from "@/lib/csv";
import { Search, FileDown, LogIn, LogOut, FileText, Trash2, ScanLine, Undo2, Truck, PackagePlus, PackageMinus, SlidersHorizontal, FlaskConical, Users, Upload, RotateCcw, Boxes, ClipboardCheck, ShieldCheck } from "lucide-react";

export const ACTIONS: Record<string, { label: string; icon: any; cls: string }> = {
  login: { label: "เข้าสู่ระบบ", icon: LogIn, cls: "bg-green-50 text-green-700" },
  logout: { label: "ออกจากระบบ", icon: LogOut, cls: "bg-slate-100 text-slate-600" },
  "order.create": { label: "สร้าง/แก้ใบเบิก", icon: FileText, cls: "bg-blue-50 text-blue-700" },
  "order.import": { label: "นำเข้าใบเบิก", icon: Upload, cls: "bg-blue-50 text-blue-700" },
  "order.delete": { label: "ลบใบเบิก", icon: Trash2, cls: "bg-red-50 text-red-600" },
  "order.restore": { label: "กู้คืนใบเบิก", icon: RotateCcw, cls: "bg-slate-100 text-slate-600" },
  "order.purge": { label: "ลบถาวร", icon: Trash2, cls: "bg-red-100 text-red-700" },
  "stock.issue": { label: "ตัดสต๊อก", icon: ScanLine, cls: "bg-amber-50 text-amber-700" },
  "stock.reverse": { label: "ยกเลิกตัดสต๊อก", icon: Undo2, cls: "bg-red-50 text-red-600" },
  "stock.receive": { label: "รับเข้าสินค้า", icon: Boxes, cls: "bg-green-50 text-green-700" },
  "stock.adjust": { label: "ปรับยอดสินค้า", icon: SlidersHorizontal, cls: "bg-slate-100 text-slate-600" },
  "stock.count-import": { label: "อัปเดตยอดจากไฟล์", icon: ClipboardCheck, cls: "bg-blue-50 text-blue-700" },
  ship: { label: "บันทึกจัดส่ง", icon: Truck, cls: "bg-green-50 text-green-700" },
  unship: { label: "ยกเลิกจัดส่ง", icon: Undo2, cls: "bg-red-50 text-red-600" },
  return: { label: "รับคืนสินค้า", icon: Undo2, cls: "bg-green-50 text-green-700" },
  "return.reverse": { label: "ยกเลิกการคืน", icon: Undo2, cls: "bg-red-50 text-red-600" },
  "damaged.dispose": { label: "จัดการของชำรุด", icon: Boxes, cls: "bg-slate-100 text-slate-600" },
  "material.receive": { label: "รับเข้าวัตถุดิบ", icon: PackagePlus, cls: "bg-green-50 text-green-700" },
  "material.issue": { label: "เบิกวัตถุดิบ", icon: PackageMinus, cls: "bg-orange-50 text-orange-700" },
  "material.adjust": { label: "ปรับยอดวัตถุดิบ", icon: SlidersHorizontal, cls: "bg-slate-100 text-slate-600" },
  "scent.manage": { label: "จัดการกลิ่น", icon: FlaskConical, cls: "bg-purple-50 text-purple-700" },
  "fda.manage": { label: "จัดการ อย.", icon: ShieldCheck, cls: "bg-teal-50 text-teal-700" },
  "user.manage": { label: "จัดการผู้ใช้", icon: Users, cls: "bg-brand-50 text-brand-600" },
};

const dt = (v: string) => new Date(v).toLocaleString("th-TH", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
const roleTh = (r: string | null) => roleList(r).map((x) => ROLE_LABELS[x] || x).join(", ") || "—";

export default function ActivityLog({ rows, user, action, from, to, total }: { rows: ActivityRow[]; user: string; action: string; from: string; to: string; total: number }) {
  const router = useRouter();
  const [term, setTerm] = useState(user);
  const go = (next: { user?: string; action?: string; from?: string; to?: string }) => {
    const u = next.user ?? user, a = next.action ?? action, fr = next.from ?? from, t = next.to ?? to;
    const sp = new URLSearchParams();
    if (u) sp.set("user", u); if (a) sp.set("action", a); if (fr) sp.set("from", fr); if (t) sp.set("to", t);
    router.push(`/activity${sp.toString() ? "?" + sp.toString() : ""}`);
  };
  function exportCsv() {
    // Export = เฉพาะหน้าปัจจุบัน — เตือนถ้ามีมากกว่าที่โหลด (กัน admin เข้าใจผิดว่าได้ทั้งหมด)
    if (total > rows.length && !confirm(`Export ได้เฉพาะ ${rows.length} รายการในหน้านี้ (ทั้งหมด ${total.toLocaleString()}) — แคบช่วงวัน/เลื่อนหน้าเพื่อดึงเพิ่ม\n\nดำเนินการต่อ?`)) return;
    downloadCsv("บันทึกการใช้งาน", ["เวลา", "ผู้ใช้", "บทบาท", "การกระทำ", "รายละเอียด", "IP"],
      rows.map((r) => [dt(r.created_at), r.username || "", roleTh(r.role), ACTIONS[r.action]?.label || r.action, r.detail || "", r.ip || ""]));
  }

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center gap-2 p-3">
        <form onSubmit={(e) => { e.preventDefault(); go({ user: term.trim() }); }} className="relative min-w-[180px] flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <input value={term} onChange={(e) => setTerm(e.target.value)} className="input pl-9" placeholder="ค้นหาชื่อผู้ใช้" />
        </form>
        <select value={action} onChange={(e) => go({ action: e.target.value })} className="input w-48">
          <option value="">ทุกการกระทำ</option>
          {Object.entries(ACTIONS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <div className="flex items-center gap-1.5">
          <input type="date" value={from} max={to || undefined} onChange={(e) => go({ from: e.target.value })} className="input w-36" title="ตั้งแต่วันที่" />
          <span className="text-xs text-muted">ถึง</span>
          <input type="date" value={to} min={from || undefined} onChange={(e) => go({ to: e.target.value })} className="input w-36" title="ถึงวันที่" />
        </div>
        {(user || action || from || to) && <button onClick={() => go({ user: "", action: "", from: "", to: "" })} className="btn-ghost text-xs">ล้าง</button>}
        <button onClick={exportCsv} className="btn-ghost text-sm"><FileDown size={14} /> Export</button>
        <span className="ml-auto text-xs text-muted">แสดง {rows.length.toLocaleString()} / {total.toLocaleString()}</span>
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-soft text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-3">เวลา</th><th className="px-3 py-3">ผู้ใช้</th>
                <th className="px-3 py-3">การกระทำ</th><th className="px-3 py-3">รายละเอียด</th><th className="px-3 py-3">IP</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={5} className="px-4 py-12 text-center text-muted">ไม่มีบันทึก</td></tr>}
              {rows.map((r) => {
                const a = ACTIONS[r.action]; const Icon = a?.icon;
                return (
                  <tr key={r.id} className="border-t border-line hover:bg-soft/40">
                    <td className="whitespace-nowrap px-4 py-2.5 text-xs tabular-nums text-muted">{dt(r.created_at)}</td>
                    <td className="px-3 py-2.5">
                      <div className="font-medium text-ink">{r.username || "—"}</div>
                      <div className="text-[11px] text-faint">{roleTh(r.role)}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`chip whitespace-nowrap ${a?.cls || "bg-slate-100 text-slate-600"}`}>
                        {Icon && <Icon size={12} />} {a?.label || r.action}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted">{r.detail || "—"}</td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-faint">{r.ip || "—"}</td>
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
