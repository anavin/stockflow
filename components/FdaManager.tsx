"use client";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { FdaRow, FdaExpirySummary } from "@/lib/queries";
import { updateFda, addFda, deleteFda, renewFda, type FdaPatch } from "@/lib/actions/fda";
import { Search, FileUp, CheckCircle2, AlertTriangle, ShieldAlert, ShieldCheck, CalendarClock, Plus, Pencil, Trash2, Check, X, RefreshCw } from "lucide-react";

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
const emptyForm: FdaPatch = { product: "", grade: "", reg_no: "", issue_date: "", expiry_date: "", fda_status: "คงอยู่", prod_status: "จำหน่าย", name_th: "" };

export default function FdaManager({ rows, summary, canEdit }: { rows: FdaRow[]; summary: FdaExpirySummary; canEdit: boolean }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [tierF, setTierF] = useState<Tier | "">("");
  const [statusF, setStatusF] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<FdaPatch>(emptyForm);
  const [adding, setAdding] = useState(false);

  const setF = (p: Partial<FdaPatch>) => setForm((f) => ({ ...f, ...p }));

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
  function startEdit(r: FdaRow) {
    setAdding(false); setEditId(r.id);
    setForm({ product: r.product, grade: r.grade ?? "", reg_no: r.reg_no ?? "", issue_date: dstr(r.issue_date) === "—" ? "" : dstr(r.issue_date), expiry_date: dstr(r.expiry_date) === "—" ? "" : dstr(r.expiry_date), fda_status: r.fda_status ?? "", prod_status: r.prod_status ?? "", name_th: r.name_th ?? "" });
  }
  function startAdd() { setEditId(null); setForm(emptyForm); setAdding(true); setErr(""); setMsg(""); }
  function cancel() { setEditId(null); setAdding(false); }
  async function save() {
    setErr(""); setMsg(""); setBusy(true);
    const res = adding ? await addFda(form) : await updateFda(editId!, form);
    setBusy(false);
    if (!res.ok) { setErr(res.error || "บันทึกไม่สำเร็จ"); return; }
    setMsg(adding ? "เพิ่มรายการแล้ว" : "บันทึกแล้ว"); cancel(); router.refresh();
  }
  async function del(r: FdaRow) {
    if (!confirm(`ลบข้อมูล อย. ของ "${r.product}"?`)) return;
    setBusy(true);
    const res = await deleteFda(r.id);
    setBusy(false);
    if (!res.ok) { setErr(res.error || "ลบไม่สำเร็จ"); return; }
    router.refresh();
  }
  async function renew(r: FdaRow) {
    if (!confirm(`ต่ออายุ อย. ของ "${r.product}" อีก 3 ปี?\n(เลื่อนวันสิ้นสุดจาก ${dstr(r.expiry_date)} ไปอีก 3 ปี + บันทึกประวัติ)`)) return;
    setErr(""); setMsg(""); setBusy(true);
    const res = await renewFda(r.id, 3);
    setBusy(false);
    if (!res.ok) { setErr(res.error || "ต่ออายุไม่สำเร็จ"); return; }
    setMsg(`ต่ออายุ "${r.product}" แล้ว → วันสิ้นสุดใหม่ ${res.new_expiry}`); router.refresh();
  }

  const isDisc = (r: FdaRow) => /เลิก/.test(r.prod_status || "");
  const isExpired = (r: FdaRow) => (r.days_left != null && r.days_left < 0) || /สิ้นอาย|ยกเลิก/.test(r.fda_status || "");   // หมดอายุตามวันที่ หรือ สถานะ อย.=สิ้นอายุ/ยกเลิก
  // เรียง 3 ระดับ: ปกติ(0) → เลิกผลิต แต่ อย. ยังคงอยู่(1) → สิ้นอายุ/หมดอายุ(2 ล่างสุดจริง)
  const rank = (r: FdaRow) => (isExpired(r) ? 2 : isDisc(r) ? 1 : 0);
  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (tierF && tierOf(r.days_left) !== tierF) return false;
      if (statusF && (r.fda_status || "") !== statusF) return false;
      if (t && !(`${r.product} ${r.name_th ?? ""} ${r.name_en ?? ""} ${r.reg_no ?? ""}`.toLowerCase().includes(t))) return false;
      return true;
    }).sort((a, b) => rank(a) - rank(b));
  }, [rows, search, tierF, statusF]);

  const statuses = useMemo(() => [...new Set(rows.map((r) => r.fda_status).filter(Boolean))] as string[], [rows]);
  const cards: { tier: Tier; n: number; icon: any }[] = [
    { tier: "expired", n: summary.expired, icon: ShieldAlert },
    { tier: "d10", n: summary.d10, icon: AlertTriangle },
    { tier: "d15", n: summary.d15, icon: CalendarClock },
    { tier: "d30", n: summary.d30, icon: CalendarClock },
  ];
  const cols = canEdit ? 10 : 9;

  const Fields = () => (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
      <div><label className="label">กลิ่น <span className="text-brand">*</span></label><input className="input h-9" value={form.product ?? ""} onChange={(e) => setF({ product: e.target.value })} /></div>
      <div><label className="label">Grade</label><input className="input h-9" value={form.grade ?? ""} onChange={(e) => setF({ grade: e.target.value })} placeholder="EDP / EDP+ / PARFUM" /></div>
      <div className="col-span-2"><label className="label">เลขที่จดแจ้ง อย.</label><input className="input h-9 font-mono" value={form.reg_no ?? ""} onChange={(e) => setF({ reg_no: e.target.value })} /></div>
      <div><label className="label">ออกให้ ณ วันที่</label><input type="date" className="input h-9" value={form.issue_date ?? ""} onChange={(e) => setF({ issue_date: e.target.value })} /></div>
      <div><label className="label">วันที่สิ้นสุด</label><input type="date" className="input h-9" value={form.expiry_date ?? ""} onChange={(e) => setF({ expiry_date: e.target.value })} /></div>
      <div><label className="label">สถานะ อย.</label>
        <select className="input h-9" value={form.fda_status ?? ""} onChange={(e) => setF({ fda_status: e.target.value })}>
          <option value="คงอยู่">คงอยู่</option><option value="สิ้นอายุ">สิ้นอายุ</option><option value="">—</option>
        </select></div>
      <div><label className="label">สถานะผลิต</label>
        <select className="input h-9" value={form.prod_status ?? ""} onChange={(e) => setF({ prod_status: e.target.value })}>
          <option value="จำหน่าย">จำหน่าย</option><option value="เลิกผลิต">เลิกผลิต</option><option value="">—</option>
        </select></div>
      <div className="col-span-2 md:col-span-4"><label className="label">ชื่อภาษาไทย</label><input className="input h-9" value={form.name_th ?? ""} onChange={(e) => setF({ name_th: e.target.value })} /></div>
    </div>
  );

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
                <span className={`chip ${m.chip}`}><Icon size={13} /> {tier === "expired" ? "หมดอายุแล้ว" : m.label}</span>
                <span className={`text-2xl font-bold ${n > 0 && (tier === "expired" || tier === "d10") ? "text-red-600" : "text-ink"}`}>{n}</span>
              </div>
              <p className="mt-1.5 text-[11px] text-muted">{tier === "expired" ? "เกินวันสิ้นสุดแล้ว — ต่ออายุด่วน" : "ใกล้หมดอายุ — เตรียมต่ออายุ อย."}</p>
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
            <button type="button" className="btn-primary" onClick={startAdd}><Plus size={15} /> เพิ่มรายการ</button>
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

      {/* ฟอร์มเพิ่มรายการ */}
      {adding && (
        <div className="card border border-brand-200 p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink"><Plus size={16} /> เพิ่มรายการ อย.</h3>
          <Fields />
          <div className="mt-3 flex justify-end gap-2">
            <button type="button" onClick={cancel} className="btn-ghost">ยกเลิก</button>
            <button type="button" onClick={save} disabled={busy} className="btn-primary">{busy ? "กำลังบันทึก…" : "บันทึก"}</button>
          </div>
        </div>
      )}

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
                {canEdit && <th className="px-3 py-3 text-right">จัดการ</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={cols} className="px-4 py-12 text-center text-muted">ไม่พบข้อมูล — {canEdit ? "กด 'เพิ่มรายการ' หรือ 'นำเข้า Excel'" : "ยังไม่มีข้อมูล อย."}</td></tr>}
              {filtered.map((r) => {
                const tier = tierOf(r.days_left);
                const m = TIER_META[tier];
                const editing = editId === r.id;
                return (
                  <tr key={r.id} className={`border-t border-line align-top ${editing ? "bg-brand-50/40" : m.row}`}>
                    {editing ? (
                      <td colSpan={cols} className="px-3 py-3">
                        <Fields />
                        <div className="mt-3 flex justify-end gap-2">
                          <button type="button" onClick={cancel} className="btn-ghost"><X size={14} /> ยกเลิก</button>
                          <button type="button" onClick={save} disabled={busy} className="btn-primary"><Check size={14} /> {busy ? "…" : "บันทึก"}</button>
                        </div>
                      </td>
                    ) : (
                      <>
                        <td className="px-3 py-2.5 text-muted">{r.seq ?? ""}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-ink">{r.product}</span>
                            {(r.renewal_count ?? 0) > 0 && <span className="chip bg-green-50 text-green-700" title={r.last_renewed ? `ต่ออายุล่าสุด ${String(r.last_renewed).slice(0, 10)}` : ""}>ต่อ {r.renewal_count} ครั้ง</span>}
                          </div>
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
                        {canEdit && (
                          <td className="px-3 py-2.5">
                            <div className="flex items-center justify-end gap-1">
                              <button type="button" onClick={() => renew(r)} disabled={busy} className="rounded-md p-1.5 text-green-600 hover:bg-green-50 disabled:opacity-40" title="ต่ออายุ อย. +3 ปี"><RefreshCw size={15} /></button>
                              <button type="button" onClick={() => startEdit(r)} className="rounded-md p-1.5 text-muted hover:bg-soft hover:text-ink" title="แก้ไข"><Pencil size={15} /></button>
                              <button type="button" onClick={() => del(r)} className="rounded-md p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600" title="ลบ"><Trash2 size={15} /></button>
                            </div>
                          </td>
                        )}
                      </>
                    )}
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
