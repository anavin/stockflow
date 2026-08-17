"use client";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { FdaRow, FdaExpirySummary } from "@/lib/queries";
import { Search, FileUp, CheckCircle2, AlertTriangle, ShieldAlert, ShieldCheck, CalendarClock } from "lucide-react";

// tier ความเร่งด่วนตามจำนวนวันที่เหลือ
type Tier = "expired" | "d10" | "d15" | "d30" | "ok";
function tierOf(days: number | null): Tier {
  if (days == null) return "ok";
  if (days < 0) return "expired";
  if (days <= 10) return "d10";
  if (days <= 15) return "d15";
  if (days <= 30) return "d30";
  return "ok";
}
const TIER_META: Record<Tier, { chip: string; row: string; label: string }> = {
  expired: { chip: "bg-red-100 text-red-700", row: "bg-red-50/60", label: "หมดอายุแล้ว" },
  d10: { chip: "bg-red-50 text-red-600", row: "bg-red-50/40", label: "≤ 10 วัน" },
  d15: { chip: "bg-orange-50 text-orange-600", row: "bg-orange-50/40", label: "11–15 วัน" },
  d30: { chip: "bg-amber-50 text-amber-700", row: "bg-amber-50/30", label: "16–30 วัน" },
  ok: { chip: "bg-green-50 text-green-700", row: "", label: "ปกติ" },
};
const daysText = (d: number | null) => d == null ? "—" : d < 0 ? `เกิน ${Math.abs(d)} วัน` : `เหลือ ${d} วัน`;
const dstr = (s: string | null) => (s ? String(s).slice(0, 10) : "—");

export default function FdaManager({ rows, summary, canEdit }: { rows: FdaRow[]; summary: FdaExpirySummary; canEdit: boolean }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [tierF, setTierF] = useState<Tier | "">("");
  const [statusF, setStatusF] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function importFile(file: File) {
    setErr(""); setMsg(""); setBusy(true);
    const fd = new FormData(); fd.append("file", file);
    try {
      const res = await fetch("/api/fda/import", { method: "POST", body: fd });
      const data = await res.json();
      if (!data.ok) setErr(data.error || "นำเข้าไม่สำเร็จ");
      else { setMsg(`นำเข้าข้อมูล อย. ${data.saved} รายการ (ชีต ${data.sheet})`); router.refresh(); }
    } catch { setErr("อัปโหลดไม่สำเร็จ"); }
    setBusy(false);
  }

  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (tierF && tierOf(r.days_left) !== tierF) return false;
      if (statusF && (r.fda_status || "") !== statusF) return false;
      if (t && !(`${r.product} ${r.name_th ?? ""} ${r.name_en ?? ""} ${r.reg_no ?? ""}`.toLowerCase().includes(t))) return false;
      return true;
    });
  }, [rows, search, tierF, statusF]);

  const statuses = useMemo(() => [...new Set(rows.map((r) => r.fda_status).filter(Boolean))] as string[], [rows]);

  const cards: { tier: Tier; n: number; icon: any }[] = [
    { tier: "expired", n: summary.expired, icon: ShieldAlert },
    { tier: "d10", n: summary.d10, icon: AlertTriangle },
    { tier: "d15", n: summary.d15, icon: CalendarClock },
    { tier: "d30", n: summary.d30, icon: CalendarClock },
  ];

  return (
    <div className="space-y-4">
      {/* การ์ดแจ้งเตือน */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map(({ tier, n, icon: Icon }) => {
          const m = TIER_META[tier];
          const active = tierF === tier;
          return (
            <button key={tier} type="button" onClick={() => setTierF(active ? "" : tier)}
              className={`card border p-4 text-left transition-colors ${active ? "ring-2 ring-brand-300" : ""} ${n > 0 && (tier === "expired" || tier === "d10") ? "border-red-200" : "border-line"}`}>
              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${m.chip}`}><Icon size={13} /> {tier === "expired" ? "หมดอายุแล้ว" : m.label}</span>
                <span className={`text-2xl font-bold ${n > 0 && (tier === "expired" || tier === "d10") ? "text-red-600" : "text-ink"}`}>{n}</span>
              </div>
              <p className="mt-1.5 text-[11px] text-muted">{tier === "expired" ? "เกินวันสิ้นสุดแล้ว — ต้องต่ออายุด่วน" : "ใกล้หมดอายุ — เตรียมต่ออายุ อย."}</p>
            </button>
          );
        })}
      </div>

      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-9" placeholder="ค้นหากลิ่น / ชื่อไทย-อังกฤษ / เลขที่จดแจ้ง" />
        </div>
        <select value={statusF} onChange={(e) => setStatusF(e.target.value)} className="input w-40">
          <option value="">สถานะ อย: ทั้งหมด</option>
          {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        {tierF && <button onClick={() => setTierF("")} className="btn-ghost text-xs">ล้างตัวกรอง ({TIER_META[tierF].label})</button>}
        {canEdit && (
          <>
            <button type="button" className="btn-ghost" disabled={busy} onClick={() => fileRef.current?.click()}>
              <FileUp size={15} /> {busy ? "กำลังนำเข้า…" : "นำเข้า Excel"}
            </button>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) { importFile(f); e.target.value = ""; } }} />
          </>
        )}
      </div>
      {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{err}</p>}
      {msg && <p className="flex items-center gap-1 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700"><CheckCircle2 size={14} /> {msg}</p>}

      {/* ตาราง */}
      <div className="overflow-hidden rounded-xl border border-line bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-soft text-left text-xs text-muted">
              <tr>
                <th className="w-10 px-3 py-3">#</th>
                <th className="px-3 py-3">กลิ่น</th>
                <th className="px-3 py-3">Grade</th>
                <th className="px-3 py-3">เลขที่จดแจ้ง อย.</th>
                <th className="px-3 py-3">ออกให้</th>
                <th className="px-3 py-3">วันสิ้นสุด</th>
                <th className="px-3 py-3">เหลืออีก</th>
                <th className="px-3 py-3">สถานะ อย</th>
                <th className="px-3 py-3">สถานะผลิต</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={9} className="px-4 py-12 text-center text-muted">ไม่พบข้อมูล — {canEdit ? "กด 'นำเข้า Excel' เพื่อโหลดข้อมูล อย. หรือรัน SQL ตาราง fda_registrations" : "ยังไม่มีข้อมูล อย."}</td></tr>}
              {filtered.map((r) => {
                const tier = tierOf(r.days_left);
                const m = TIER_META[tier];
                return (
                  <tr key={r.id} className={`border-t border-line ${m.row}`}>
                    <td className="px-3 py-2.5 text-muted">{r.seq ?? ""}</td>
                    <td className="px-3 py-2.5">
                      <div className="font-medium text-ink">{r.product}</div>
                      {r.name_th && <div className="text-[11px] text-faint">{r.name_th}</div>}
                    </td>
                    <td className="px-3 py-2.5">{r.grade ? <span className="chip bg-brand-50 text-brand-600">{r.grade}</span> : <span className="text-faint">—</span>}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-muted">{r.reg_no || "—"}</td>
                    <td className="px-3 py-2.5 text-xs text-muted">{dstr(r.issue_date)}</td>
                    <td className="px-3 py-2.5 text-xs font-medium text-ink">{dstr(r.expiry_date)}</td>
                    <td className="px-3 py-2.5"><span className={`chip ${m.chip}`}>{daysText(r.days_left)}</span></td>
                    <td className="px-3 py-2.5 text-xs">{r.fda_status === "คงอยู่"
                      ? <span className="inline-flex items-center gap-1 text-green-700"><ShieldCheck size={12} /> {r.fda_status}</span>
                      : <span className="text-muted">{r.fda_status || "—"}</span>}</td>
                    <td className="px-3 py-2.5 text-xs text-muted">{r.prod_status || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-xs text-faint">แสดง {filtered.length} จาก {rows.length} รายการ · แจ้งเตือนอัตโนมัติ 30 / 15 / 10 วันก่อนหมดอายุ</p>
    </div>
  );
}
