"use client";
import { useState } from "react";
import { FileBarChart, FileDown, X, CalendarRange } from "lucide-react";

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

type PresetKey = "today" | "7d" | "month" | "prevmonth";

/** ปุ่ม "สรุป" + "Export" ที่เปิด popup เลือกช่วงเวลาก่อน (preset + from/to) แล้วค่อยยิงรายงาน/ไฟล์ */
export default function ReportExportBar({ platform, q, issued, shipped, from: fromInit, to: toInit, month }: {
  platform: string; q?: string; issued?: string; shipped?: string; from?: string; to?: string; month?: string;
}) {
  const today = iso(new Date());
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(fromInit || today);
  const [to, setTo] = useState(toInit || today);
  // ถ้าหน้า list กรองด้วย "เดือน" อยู่ (ไม่มีช่วงวันที่) → เริ่มที่โหมดทั้งเดือน (คงบริบทเดิม)
  const [useMonth, setUseMonth] = useState<boolean>(!!month && !fromInit && !toInit);
  const pickRange = (f: string, t: string) => { setFrom(f); setTo(t); setUseMonth(false); };

  const rangeOf = (p: PresetKey): { from: string; to: string } => {
    const now = new Date();
    if (p === "today") return { from: today, to: today };
    if (p === "7d") { const s = new Date(now); s.setDate(s.getDate() - 6); return { from: iso(s), to: today }; }
    if (p === "month") return { from: iso(new Date(now.getFullYear(), now.getMonth(), 1)), to: today };
    return { from: iso(new Date(now.getFullYear(), now.getMonth() - 1, 1)), to: iso(new Date(now.getFullYear(), now.getMonth(), 0)) };
  };
  const presets: { k: PresetKey; label: string }[] = [
    { k: "today", label: "วันนี้" }, { k: "7d", label: "7 วันล่าสุด" }, { k: "month", label: "เดือนนี้" }, { k: "prevmonth", label: "เดือนก่อน" },
  ];
  const activePreset = useMonth ? undefined : presets.find((p) => { const r = rangeOf(p.k); return r.from === from && r.to === to; })?.k;

  const qs = () => {
    const sp = new URLSearchParams();
    sp.set("platform", platform);
    if (useMonth && month) { sp.set("month", month); }   // โหมดทั้งเดือน → ส่ง month (ไม่ส่ง from/to)
    else { if (from) sp.set("from", from); if (to) sp.set("to", to); }
    if (q) sp.set("q", q);
    if (issued === "yes" || issued === "no") sp.set("issued", issued);
    if (shipped === "yes" || shipped === "no") sp.set("shipped", shipped);
    return sp.toString();
  };
  const go = (kind: "report" | "export") => {
    if (!useMonth && from && to && from > to) { alert("ช่วงวันที่ไม่ถูกต้อง (วันเริ่มหลังวันสิ้นสุด)"); return; }
    const url = kind === "report" ? `/print/daily-report?${qs()}` : `/api/export/orders?${qs()}`;
    if (kind === "report") window.open(url, "_blank", "noopener");
    else window.location.href = url;   // CSV: ให้เบราว์เซอร์ดาวน์โหลด
    setOpen(false);
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn-ghost" title="สรุปกลิ่น×ขนาด + ยอดเงิน ตามช่วงเวลา"><FileBarChart size={16} /> สรุป</button>
      <button type="button" onClick={() => setOpen(true)} className="btn-ghost" title="ส่งออกออเดอร์เป็นไฟล์ CSV ตามช่วงเวลา"><FileDown size={16} /> Export</button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-base font-bold text-ink"><CalendarRange size={18} className="text-brand" /> เลือกช่วงเวลา</h3>
              <button type="button" onClick={() => setOpen(false)} className="rounded-md p-1 text-muted hover:bg-soft hover:text-ink"><X size={18} /></button>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              {month && (
                <button type="button" onClick={() => setUseMonth(true)}
                  className={`rounded-full border px-3 py-1 text-sm transition ${useMonth ? "border-brand bg-brand-50 font-medium text-brand-700" : "border-line text-muted hover:border-brand-200 hover:bg-soft"}`}>
                  ทั้งเดือน {month}
                </button>
              )}
              {presets.map((p) => {
                const on = activePreset === p.k;
                return (
                  <button key={p.k} type="button" onClick={() => { const r = rangeOf(p.k); pickRange(r.from, r.to); }}
                    className={`rounded-full border px-3 py-1 text-sm transition ${on ? "border-brand bg-brand-50 font-medium text-brand-700" : "border-line text-muted hover:border-brand-200 hover:bg-soft"}`}>
                    {p.label}
                  </button>
                );
              })}
            </div>

            <div className={`grid grid-cols-2 gap-3 ${useMonth ? "opacity-50" : ""}`}>
              <label className="block">
                <span className="label">ตั้งแต่</span>
                <input type="date" className="input" value={from} max={to || undefined} onChange={(e) => { setFrom(e.target.value); setUseMonth(false); }} />
              </label>
              <label className="block">
                <span className="label">ถึง</span>
                <input type="date" className="input" value={to} min={from || undefined} onChange={(e) => { setTo(e.target.value); setUseMonth(false); }} />
              </label>
            </div>
            {useMonth && <p className="mt-1.5 text-[11px] text-brand-600">กำลังสรุป “ทั้งเดือน {month}” — เลือกช่วงวันที่ด้านล่างเพื่อเปลี่ยนเป็นช่วงกำหนดเอง</p>}

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button type="button" onClick={() => go("report")} className="btn-primary justify-center"><FileBarChart size={16} /> ดูสรุป</button>
              <button type="button" onClick={() => go("export")} className="btn-ghost justify-center border border-line"><FileDown size={16} /> Export CSV</button>
            </div>
            <p className="mt-2.5 text-center text-[11px] text-faint">สรุป = กลิ่น×ขนาด + ยอดเงิน (เปิดแท็บใหม่ · พิมพ์/PDF ได้) · Export = ไฟล์ CSV</p>
          </div>
        </div>
      )}
    </>
  );
}
