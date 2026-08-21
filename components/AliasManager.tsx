"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { addScentAlias, deleteScentAlias } from "@/lib/actions/products";
import type { ScentAliasRow } from "@/lib/queries";
import { Plus, Trash2, ArrowRight, Search } from "lucide-react";

export default function AliasManager({ aliases, products }: { aliases: ScentAliasRow[]; products: string[] }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [prod, setProd] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !prod) { setErr("กรอกชื่อที่ platform ใช้ + เลือกกลิ่นจริง"); return; }
    setBusy(true); setErr("");
    const r = await addScentAlias(text, prod);
    setBusy(false);
    if (!r.ok) { setErr(r.error || "บันทึกไม่สำเร็จ"); return; }
    setText(""); setProd(""); router.refresh();
  }
  async function del(id: number) {
    if (!confirm("ลบชื่อพ้องนี้?")) return;
    const r = await deleteScentAlias(id);
    if (!r.ok) { alert(r.error); return; }
    router.refresh();
  }

  const t = q.trim().toLowerCase();
  const rows = t ? aliases.filter((a) => `${a.alias_text} ${a.product}`.toLowerCase().includes(t)) : aliases;

  return (
    <div className="space-y-4">
      {/* เพิ่มชื่อพ้อง */}
      <form onSubmit={add} className="card flex flex-wrap items-end gap-2 p-4">
        <div className="min-w-[200px] flex-1">
          <label className="label">ชื่อที่แพลตฟอร์มใช้ (เช่น Shadow de bacci)</label>
          <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="ชื่อกลิ่นที่จับไม่ตรง" />
        </div>
        <span className="pb-2 text-muted"><ArrowRight size={16} /></span>
        <div className="min-w-[200px] flex-1">
          <label className="label">กลิ่นจริงในระบบ</label>
          <select className="input" value={prod} onChange={(e) => setProd(e.target.value)}>
            <option value="">— เลือกกลิ่น —</option>
            {products.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <button className="btn-primary" disabled={busy}><Plus size={16} /> {busy ? "กำลังบันทึก…" : "เพิ่ม"}</button>
      </form>
      {err && <div className="alert-error">{err}</div>}

      {/* รายการ */}
      <div className="relative max-w-sm">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
        <input className="input pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาชื่อพ้อง…" />
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-white">
        <table className="w-full text-sm">
          <thead className="bg-soft text-left text-xs text-muted">
            <tr><th className="px-4 py-3">ชื่อที่แพลตฟอร์มใช้</th><th className="px-4 py-3">→ กลิ่นจริง</th><th className="px-4 py-3 text-right">จัดการ</th></tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={3} className="px-4 py-10 text-center text-muted">ยังไม่มีชื่อพ้อง — เพิ่มด้านบน หรือระบบจะแนะนำให้ตอน import</td></tr>}
            {rows.map((a) => (
              <tr key={a.id} className="border-t border-line">
                <td className="px-4 py-2.5 font-medium text-ink">{a.alias_text}</td>
                <td className="px-4 py-2.5">{a.product}</td>
                <td className="px-4 py-2.5 text-right">
                  <button onClick={() => del(a.id)} className="rounded-md p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600" title="ลบ"><Trash2 size={15} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-faint">ชื่อพ้อง = แผนที่จากชื่อกลิ่นที่ Shopee/Lazada เขียน → ชื่อจริงในระบบ · ใช้ตอน import ทั้งสองแพลตฟอร์ม · ทั้งหมด {aliases.length} รายการ</p>
    </div>
  );
}
