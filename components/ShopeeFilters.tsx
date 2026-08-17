"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search, X, CalendarDays } from "lucide-react";

export default function ShopeeFilters({ q, month, from, to, issued, shipped, months }: { q?: string; month?: string; from?: string; to?: string; issued?: string; shipped?: string; months: string[] }) {
  const router = useRouter();
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
    router.push(`/shopee${s ? "?" + s : ""}`);
  }

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

      {/* ช่วงวันที่ (ตามวันที่ใบเบิก) — เลือกแล้วกรองทันที */}
      <div className="flex items-center gap-1 rounded-lg border border-line bg-white px-2 py-1">
        <CalendarDays size={15} className="shrink-0 text-faint" />
        <input type="date" className="w-[132px] bg-transparent text-sm text-ink outline-none" value={df} max={dt || undefined}
          onChange={(e) => { setDf(e.target.value); go({ from: e.target.value }); }} title="จากวันที่" />
        <span className="text-faint">–</span>
        <input type="date" className="w-[132px] bg-transparent text-sm text-ink outline-none" value={dt} min={df || undefined}
          onChange={(e) => { setDt(e.target.value); go({ to: e.target.value }); }} title="ถึงวันที่" />
      </div>

      <button className="btn-ghost">ค้นหา</button>
      {hasFilter && (
        <button type="button" className="btn-ghost text-muted"
          onClick={() => { setSearch(""); setDf(""); setDt(""); router.push("/shopee"); }}>
          <X size={14} /> ล้างตัวกรอง
        </button>
      )}
    </form>
  );
}
