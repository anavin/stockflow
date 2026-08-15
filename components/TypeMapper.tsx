"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { bulkSetProductTypes, createProduct } from "@/lib/actions/products";
import type { ProductAdminRow } from "@/lib/queries";
import { PERFUME_TYPES } from "@/lib/types";
import { Search, Save, Plus, CheckCircle2, RotateCcw } from "lucide-react";

type Filter = "all" | "unmapped" | "mapped";

export default function TypeMapper({ products }: { products: ProductAdminRow[] }) {
  const router = useRouter();
  // ค่าเริ่มต้น = ptype ปัจจุบันในฐานข้อมูล (default ตามที่ตั้งไว้ผ่าน migration)
  const initial = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p.ptype ?? ""])), [products]);
  const [types, setTypes] = useState<Record<number, string>>(initial);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  // เพิ่มกลิ่นใหม่
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("");
  const [bulkType, setBulkType] = useState("");

  const changed = useMemo(
    () => products.filter((p) => (types[p.id] ?? "") !== (initial[p.id] ?? "")),
    [products, types, initial],
  );
  const counts = useMemo(() => {
    const c: Record<string, number> = { "": 0 };
    PERFUME_TYPES.forEach((t) => (c[t] = 0));
    products.forEach((p) => { const v = types[p.id] ?? ""; c[v] = (c[v] ?? 0) + 1; });
    return c;
  }, [products, types]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return products.filter((p) => {
      const v = types[p.id] ?? "";
      if (filter === "unmapped" && v) return false;
      if (filter === "mapped" && !v) return false;
      if (t && !(p.name.toLowerCase().includes(t) || (p.code ?? "").toLowerCase().includes(t))) return false;
      return true;
    });
  }, [products, types, q, filter]);

  function setOne(id: number, v: string) { setTypes((s) => ({ ...s, [id]: v })); setMsg(""); }
  function applyBulkToFiltered() {
    if (!bulkType && !confirm("ล้างประเภทของทุกแถวที่กรองอยู่?")) return;
    setTypes((s) => { const next = { ...s }; filtered.forEach((p) => (next[p.id] = bulkType)); return next; });
    setMsg("");
  }
  function resetAll() { setTypes(initial); setMsg(""); }

  async function save() {
    if (changed.length === 0) return;
    if (!confirm(`ยืนยันบันทึกประเภทน้ำหอม ${changed.length} กลิ่น?`)) return;
    setBusy(true); setMsg("");
    const res = await bulkSetProductTypes(changed.map((p) => ({ id: p.id, ptype: types[p.id] ?? "" })));
    setBusy(false);
    if (!res.ok) { setMsg(res.error || "บันทึกไม่สำเร็จ"); return; }
    setMsg(`บันทึกแล้ว ${res.count} กลิ่น`); router.refresh();
  }
  async function addScent(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setBusy(true); setMsg("");
    const res = await createProduct(newName, "", newType);
    setBusy(false);
    if (!res.ok) { setMsg(res.error || "เพิ่มไม่สำเร็จ"); return; }
    setMsg(`เพิ่มกลิ่น "${newName.trim()}" แล้ว`); setNewName(""); setNewType(""); router.refresh();
  }

  const chip = (label: string, n: number, tone: string) => (
    <span className={`chip ${tone}`}>{label} {n}</span>
  );

  return (
    <div className="space-y-4">
      {/* summary */}
      <div className="flex flex-wrap items-center gap-2">
        {chip("ทั้งหมด", products.length, "bg-soft text-ink")}
        {PERFUME_TYPES.map((t) => chip(t, counts[t] ?? 0, "bg-brand-50 text-brand-600"))}
        {chip("ยังไม่จัด", counts[""] ?? 0, (counts[""] ?? 0) > 0 ? "bg-amber-50 text-amber-700" : "bg-soft text-muted")}
      </div>

      {/* add new scent */}
      <form onSubmit={addScent} className="card flex flex-wrap items-center gap-2 p-4">
        <span className="flex items-center gap-1.5 text-sm font-medium text-ink"><Plus size={15} /> เพิ่มกลิ่น</span>
        <input className="input min-w-[200px] flex-1" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="ชื่อกลิ่นใหม่" />
        <select className="input w-36" value={newType} onChange={(e) => setNewType(e.target.value)}>
          <option value="">ประเภท…</option>
          {PERFUME_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <button className="btn-ghost" disabled={busy || !newName.trim()}>เพิ่ม</button>
      </form>

      {/* toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="relative min-w-[200px]">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
            <input className="input pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหากลิ่น / รหัส" />
          </div>
          <div className="flex overflow-hidden rounded-lg border border-line text-sm">
            {(["all", "unmapped", "mapped"] as Filter[]).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-2 ${filter === f ? "bg-brand text-white" : "bg-white text-muted hover:bg-soft"}`}>
                {f === "all" ? "ทั้งหมด" : f === "unmapped" ? "ยังไม่จัด" : "จัดแล้ว"}
              </button>
            ))}
          </div>
        </div>
        {/* bulk apply to filtered rows */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">ตั้งให้ {filtered.length} แถวที่กรอง →</span>
          <select className="input w-32" value={bulkType} onChange={(e) => setBulkType(e.target.value)}>
            <option value="">— (ล้าง)</option>
            {PERFUME_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <button onClick={applyBulkToFiltered} className="btn-ghost" disabled={filtered.length === 0}>ใช้</button>
        </div>
      </div>

      {/* table */}
      <div className="overflow-hidden rounded-xl border border-line bg-white">
        <table className="w-full text-sm">
          <thead className="bg-soft text-left text-xs text-muted">
            <tr>
              <th className="px-4 py-3">ชื่อกลิ่น</th>
              <th className="px-4 py-3">รหัส</th>
              <th className="px-4 py-3 text-center">ใช้ในใบเบิก</th>
              <th className="px-4 py-3 w-64">ประเภทน้ำหอม</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={4} className="px-4 py-10 text-center text-muted">ไม่พบกลิ่น</td></tr>}
            {filtered.map((p) => {
              const v = types[p.id] ?? "";
              const dirty = v !== (initial[p.id] ?? "");
              return (
                <tr key={p.id} className={`border-t border-line ${dirty ? "bg-amber-50/40" : ""}`}>
                  <td className="px-4 py-2 font-medium text-ink">{p.name}{dirty && <span className="ml-1.5 text-[10px] text-amber-600">• แก้</span>}</td>
                  <td className="px-4 py-2 font-mono text-xs text-muted">{p.code || "—"}</td>
                  <td className="px-4 py-2 text-center text-muted">{p.used > 0 ? p.used.toLocaleString() : "—"}</td>
                  <td className="px-4 py-2">
                    <div className="flex gap-1">
                      {PERFUME_TYPES.map((t) => (
                        <button key={t} onClick={() => setOne(p.id, t)}
                          className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                            v === t ? "bg-brand text-white" : "bg-soft text-muted hover:bg-brand-50 hover:text-brand-600"}`}>
                          {t}
                        </button>
                      ))}
                      <button onClick={() => setOne(p.id, "")}
                        className={`rounded-md px-2 py-1 text-xs ${v === "" ? "bg-ink text-white" : "text-faint hover:bg-soft"}`} title="ล้าง">—</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* sticky save bar */}
      <div className="sticky bottom-4 z-10 flex items-center justify-between gap-3 rounded-xl border border-line bg-white/95 px-4 py-3 shadow-card backdrop-blur">
        <div className="text-sm">
          {changed.length > 0
            ? <span className="text-amber-700">แก้ไข {changed.length} กลิ่น (ยังไม่บันทึก)</span>
            : msg
              ? <span className="flex items-center gap-1 text-green-700"><CheckCircle2 size={15} /> {msg}</span>
              : <span className="text-muted">ยังไม่มีการแก้ไข</span>}
        </div>
        <div className="flex items-center gap-2">
          {changed.length > 0 && (
            <button onClick={resetAll} className="btn-ghost" disabled={busy}><RotateCcw size={15} /> ยกเลิก</button>
          )}
          <button onClick={save} className="btn-primary" disabled={busy || changed.length === 0}>
            <Save size={16} /> {busy ? "กำลังบันทึก…" : `บันทึกทั้งหมด${changed.length > 0 ? ` (${changed.length})` : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}
