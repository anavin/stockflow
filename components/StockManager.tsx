"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Combobox from "./Combobox";
import { receiveStock, adjustStock } from "@/lib/actions/stock";
import type { StockRow } from "@/lib/queries";
import { PackagePlus, CheckCircle2, Search, History, FileUp, FileDown, Lock } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";

export default function StockManager({ rows, products, sizes, q, low, isAdmin }: { rows: StockRow[]; products: string[]; sizes: string[]; q?: string; low?: boolean; isAdmin: boolean }) {
  const router = useRouter();
  const [f, setF] = useState({ product: "", size: "", qty: "", note: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function importFile(file: File) {
    setErr(""); setMsg(""); setBusy(true);
    const fd = new FormData(); fd.append("file", file);
    try {
      const res = await fetch("/api/stock/import", { method: "POST", body: fd });
      const data = await res.json();
      if (!data.ok) { setErr(data.error || "นำเข้าไม่สำเร็จ"); }
      else { setMsg(`นำเข้าสต๊อกจากไฟล์ ${data.imported} รายการ (${(data.sheets || []).join(", ")})`); router.refresh(); }
    } catch { setErr("อัปโหลดไม่สำเร็จ"); }
    setBusy(false);
  }

  async function receive(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setMsg(""); setBusy(true);
    const res = await receiveStock(f.product, f.size, Number(f.qty), f.note);
    setBusy(false);
    if (!res.ok) { setErr(res.error || "รับเข้าไม่สำเร็จ"); return; }
    setMsg(`รับเข้า ${f.product} ${f.size} +${f.qty} → คงเหลือ ${res.balance}`);
    setF({ product: "", size: "", qty: "", note: "" });
    router.refresh();
  }

  async function quickReceive(r: StockRow) {
    const v = prompt(`รับเข้า ${r.product} ${r.size} — จำนวน?`);
    if (!v) return;
    const res = await receiveStock(r.product, r.size, Number(v));
    if (!res.ok) { alert(res.error); return; }
    router.refresh();
  }
  async function quickAdjust(r: StockRow) {
    const v = prompt(`ปรับยอด ${r.product} ${r.size} — ยอดที่นับได้จริง? (ปัจจุบัน ${r.qty})`, String(r.qty));
    if (v === null) return;
    const res = await adjustStock(r.product, r.size, Number(v));
    if (!res.ok) { alert(res.error); return; }
    router.refresh();
  }

  return (
    <div className="space-y-5">
      {!isAdmin && (
        <div className="card flex items-center gap-2 p-4 text-sm text-muted">
          <Lock size={16} className="text-faint" /> โหมดดูอย่างเดียว — การแก้ไขสต๊อก (รับเข้า/ปรับยอด/นำเข้าไฟล์) ทำได้เฉพาะผู้ดูแลระบบ (admin)
        </div>
      )}

      {/* นำเข้าไฟล์สต๊อก (admin) */}
      {isAdmin && (
        <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="text-sm text-muted">
            <span className="font-semibold text-ink">ตั้งยอดสต๊อกจากไฟล์ Excel</span> — <b>ดาวน์โหลดเทมเพลต</b> (สินค้า / ขนาด / จำนวนคงเหลือ) กรอกยอดแล้วอัปโหลดกลับเพื่อ sync ยอดคงเหลือทั้งหมด
          </div>
          <div className="flex gap-2">
            <a href="/api/stock/template" className="btn-ghost"><FileDown size={16} /> ดาวน์โหลดเทมเพลต</a>
            <button type="button" className="btn-primary" disabled={busy} onClick={() => fileRef.current?.click()}>
              <FileUp size={16} /> {busy ? "กำลังนำเข้า…" : "นำเข้าไฟล์"}
            </button>
          </div>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) importFile(f); }} />
        </div>
      )}

      {/* รับเข้าสินค้า (admin) */}
      {isAdmin && (
      <form onSubmit={receive} className="card p-5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink"><PackagePlus size={16} /> รับสินค้าเข้าสต๊อก</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <Combobox value={f.product} onChange={(v) => setF((s) => ({ ...s, product: v }))} options={products} placeholder="เลือกกลิ่น" />
          <Combobox value={f.size} onChange={(v) => setF((s) => ({ ...s, size: v }))} options={sizes} placeholder="ขนาด" />
          <input type="number" min={1} className="input" value={f.qty} onChange={(e) => setF((s) => ({ ...s, qty: e.target.value }))} placeholder="จำนวนรับเข้า" />
          <input className="input" value={f.note} onChange={(e) => setF((s) => ({ ...s, note: e.target.value }))} placeholder="หมายเหตุ (ถ้ามี)" />
        </div>
        {err && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{err}</p>}
        {msg && <p className="mt-3 flex items-center gap-1 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700"><CheckCircle2 size={14} /> {msg}</p>}
        <button className="btn-primary mt-4" disabled={busy}>{busy ? "กำลังรับเข้า…" : "รับเข้า"}</button>
      </form>
      )}

      {/* filter */}
      <form className="flex flex-wrap gap-2" action="/stock">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <input name="q" defaultValue={q} className="input pl-9" placeholder="ค้นหากลิ่น" />
        </div>
        <label className="flex items-center gap-2 rounded-lg border border-line bg-white px-3 text-sm text-muted">
          <input type="checkbox" name="low" value="1" defaultChecked={low} className="h-4 w-4 accent-brand" /> เฉพาะใกล้หมด (≤10)
        </label>
        <button className="btn-ghost">กรอง</button>
        <Link href="/stock/moves" className="btn-ghost"><History size={16} /> ประวัติ</Link>
      </form>

      {/* table */}
      <div className="overflow-hidden rounded-xl border border-line bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-soft text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-3">สินค้า (EDP)</th>
                <th className="px-4 py-3">ขนาด</th>
                <th className="px-4 py-3 text-right">คงเหลือ</th>
                {isAdmin && <th className="px-4 py-3 text-right">จัดการ</th>}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={isAdmin ? 4 : 3} className="px-4 py-10 text-center text-muted">ไม่พบสินค้า</td></tr>}
              {rows.map((r) => (
                <tr key={`${r.product}|${r.size}`} className="border-t border-line hover:bg-soft/40">
                  <td className="px-4 py-2.5 font-medium text-ink">{r.product}</td>
                  <td className="px-4 py-2.5 text-muted">{r.size}</td>
                  <td className="px-4 py-2.5 text-right">
                    <span className={`font-semibold ${r.qty < 0 ? "text-red-600" : r.qty <= 10 ? "text-amber-600" : "text-ink"}`}>{r.qty}</span>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => quickReceive(r)} className="rounded-md px-2 py-1 text-xs text-green-700 hover:bg-green-50">+ รับเข้า</button>
                        <button onClick={() => quickAdjust(r)} className="rounded-md px-2 py-1 text-xs text-muted hover:bg-soft">ปรับยอด</button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
