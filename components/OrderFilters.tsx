"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search, X, CalendarDays } from "lucide-react";

export default function OrderFilters({ platform = "Shopee", q, month, from, to, issued, shipped, months }: { platform?: string; q?: string; month?: string; from?: string; to?: string; issued?: string; shipped?: string; months: string[] }) {
  const router = useRouter();
  const base = `/${platform.toLowerCase()}`;
  const [search, setSearch] = useState(q ?? "");
  const [df, setDf] = useState(from ?? "");   // จากวันที่
  const [dt, setDt] = useState(to ?? "");     // ถึงวันที่

  // รวมค่าปัจจุบัน + ค่าที่เพิ่งเปลี่ยน แล้ว push URL (กรองทันที)
  function go(next: { q?: string; month?: string; from?: string; to?: string; issued?: string; shipped?: string } = {}) {
    const sp = new URLSearchParams();
    const vq = next.q ?? search;
    const vm = next.month ?? month ?? "";
    const vf = next.from ?? df;
    const vt = next.to ?? dt;
    const vi = next.issued ?? issued ?? "";
    const vs = next.shipped ?? shipped ?? "";
    if (vq) sp.set("q", vq);
    if (vm) sp.set("month", vm);
    if (vf) sp.set("from", vf);
    if (vt) sp.set("to", vt);
    if (vi) sp.set("issued", vi);
    if (vs) sp.set("shipped", vs);
    const s = sp.toString();
    router.push(`${base}${s ? "?" + s : ""}`);
  }

  // ── ช่วงวันที่: ปุ่มลัด + กำหนดเอง (เวลาไทย) ──
  const addDays = (iso: string, n: number) => { const d = new Date(iso + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const today = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
  const presets = [
    { key: "today", label: "วันนี้", from: today, to: today },
    { key: "yst", label: "เมื่อวาน", from: addDays(today, -1), to: addDays(today, -1) },
    { key: "7d", label: "7 วัน", from: addDays(today, -6), to: today },
    { key: "month", label: "เดือนนี้", from: today.slice(0, 8) + "01", to: today },
  ];
  const activePreset = presets.find((p) => p.from === df && p.to === dt)?.key ?? "";
  const applyRange = (f: string, t: string) => { setDf(f); setDt(t); go({ from: f, to: t, month: "" }); };

  const hasFilter = !!(search || month || df || dt || issued || shipped);

  return (
    <form className="mb-4 flex flex-wrap items-center gap-2" onSubmit={(e) => { e.preventDefault(); go(); }}>
      <div className="relative min-w-[220px] flex-1">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
        <input className="input pl-9" placeholder="ค้นหา Order No. / เลขที่ / ผู้รับ / ผู้ใช้ / จังหวัด"
          value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <select className="input w-auto" value={month ?? ""} onChange={(e) => go({ month: e.target.value })}>
        <option value="">ทุกเดือน</option>
        {months.map((m) => <option key={m} value={m}>{m}</option>)}
      </select>

      {/* สถานะตัดสต๊อก */}
      <select className="input w-auto" value={issued ?? ""} onChange={(e) => go({ issued: e.target.value })}>
        <option value="">ตัดสต๊อก: ทั้งหมด</option>
        <option value="no">🟡 รอตัดสต๊อก</option>
        <option value="yes">🟢 ตัดสต๊อกแล้ว</option>
      </select>

      {/* สถานะจัดส่ง */}
      <select className="input w-auto" value={shipped ?? ""} onChange={(e) => go({ shipped: e.target.value })}>
        <option value="">จัดส่ง: ทั้งหมด</option>
        <option value="no">📦 ยังไม่ส่ง</option>
        <option value="yes">🚚 ส่งแล้ว</option>
      </select>

      {/* ช่วงวันที่ — ปุ่มลัด + กำหนดเอง (ตามวันที่ใบเบิก · เลือกแล้วกรองทันที) */}
      <div className="flex flex-wrap items-center gap-1.5">
        <div className="flex items-center overflow-hidden rounded-lg border border-line">
          {presets.map((p, i) => (
            <button key={p.key} type="button" onClick={() => applyRange(p.from, p.to)}
              className={`px-2.5 py-2 text-xs font-medium transition-colors ${i > 0 ? "border-l border-line" : ""} ${activePreset === p.key ? "bg-brand text-white" : "bg-white text-muted hover:bg-soft"}`}>
              {p.label}
            </button>
          ))}
        </div>
        <div className={`flex items-center gap-1 rounded-lg border bg-white px-2 py-1 ${(df || dt) && !activePreset ? "border-brand-300 ring-1 ring-brand-100" : "border-line"}`}>
          <CalendarDays size={15} className="shrink-0 text-faint" />
          <input type="date" className="w-[130px] bg-transparent text-sm text-ink outline-none" value={df} max={dt || undefined}
            onChange={(e) => { setDf(e.target.value); go({ from: e.target.value, month: "" }); }} title="จากวันที่" />
          <span className="text-faint">–</span>
          <input type="date" className="w-[130px] bg-transparent text-sm text-ink outline-none" value={dt} min={df || undefined}
            onChange={(e) => { setDt(e.target.value); go({ to: e.target.value, month: "" }); }} title="ถึงวันที่" />
        </div>
      </div>

      <button className="btn-ghost">ค้นหา</button>
      {hasFilter && (
        <button type="button" className="btn-ghost text-muted"
          onClick={() => { setSearch(""); setDf(""); setDt(""); router.push(base); }}>
          <X size={14} /> ล้างตัวกรอง
        </button>
      )}
    </form>
  );
}
