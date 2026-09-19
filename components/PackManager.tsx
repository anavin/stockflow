"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Combobox from "./Combobox";
import { savePack, deletePack, type PackInput } from "@/lib/actions/packs";
import type { PackDef } from "@/lib/config";
import { PackageOpen, Plus, Trash2, Save, Loader2, X } from "lucide-react";

type Draft = { id?: number; name: string; match: string; active: boolean; items: { product: string; size: string; is_free: boolean }[] };
const blankItem = () => ({ product: "", size: "4 ml", is_free: false });
const toDraft = (p: PackDef & { id: number; active: boolean }): Draft => ({ id: p.id, name: p.name, match: p.match, active: p.active, items: p.items.map((i) => ({ ...i })) });

export default function PackManager({ packs, products, sizes }: { packs: (PackDef & { id: number; active: boolean })[]; products: string[]; sizes: string[] }) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Draft[]>(packs.map(toDraft));
  const [busy, setBusy] = useState<number | null>(null);   // index กำลังบันทึก/ลบ
  const [msg, setMsg] = useState<{ i: number; text: string; ok: boolean } | null>(null);
  const sizeOpts = sizes.length ? sizes : ["4 ml", "1.2 ml", "10 ml", "30 ml", "50 ml"];

  const patch = (i: number, p: Partial<Draft>) => setDrafts((d) => d.map((x, idx) => (idx === i ? { ...x, ...p } : x)));
  const patchItem = (i: number, j: number, p: Partial<Draft["items"][number]>) =>
    setDrafts((d) => d.map((x, idx) => (idx === i ? { ...x, items: x.items.map((it, k) => (k === j ? { ...it, ...p } : it)) } : x)));
  const addItem = (i: number) => setDrafts((d) => d.map((x, idx) => (idx === i ? { ...x, items: [...x.items, blankItem()] } : x)));
  const removeItem = (i: number, j: number) => setDrafts((d) => d.map((x, idx) => (idx === i ? { ...x, items: x.items.filter((_, k) => k !== j) } : x)));
  const addPack = () => setDrafts((d) => [...d, { name: "", match: "", active: true, items: [blankItem()] }]);

  async function onSave(i: number) {
    const dft = drafts[i];
    setBusy(i); setMsg(null);
    try {
      const res = await savePack(dft as PackInput);
      if (!res.ok) { setMsg({ i, text: res.error || "บันทึกไม่สำเร็จ", ok: false }); return; }
      if (res.id && !dft.id) patch(i, { id: res.id });
      setMsg({ i, text: "บันทึกแล้ว ✓", ok: true });
      router.refresh();
    } catch { setMsg({ i, text: "ระบบขัดข้อง", ok: false }); }
    finally { setBusy(null); }
  }
  async function onDelete(i: number) {
    const dft = drafts[i];
    if (!confirm(`ลบแพ็ค "${dft.name || "(ใหม่)"}"?`)) return;
    if (!dft.id) { setDrafts((d) => d.filter((_, idx) => idx !== i)); return; }   // ยังไม่บันทึก = ลบจากจอเลย
    setBusy(i);
    try {
      const res = await deletePack(dft.id);
      if (!res.ok) { setMsg({ i, text: res.error || "ลบไม่สำเร็จ", ok: false }); return; }
      setDrafts((d) => d.filter((_, idx) => idx !== i));
      router.refresh();
    } catch { setMsg({ i, text: "ระบบขัดข้อง", ok: false }); }
    finally { setBusy(null); }
  }

  return (
    <div className="space-y-4">
      {drafts.map((dft, i) => {
        const paid = dft.items.filter((x) => !x.is_free).length, free = dft.items.filter((x) => x.is_free).length;
        return (
          <section key={dft.id ?? `new-${i}`} className="card overflow-hidden">
            <header className="flex flex-wrap items-center gap-2 border-b border-line bg-soft/50 px-4 py-3">
              <PackageOpen size={16} className="text-violet-600" />
              <input className="input max-w-[16rem] font-medium" placeholder="ชื่อแพ็ค (เช่น Best Seller Pack)" value={dft.name} onChange={(e) => patch(i, { name: e.target.value })} />
              <span className="text-xs text-muted">= {paid} จ่าย + {free} แถม</span>
              <label className="ml-auto flex items-center gap-1.5 text-xs text-muted">
                <input type="checkbox" className="h-4 w-4 accent-brand" checked={dft.active} onChange={(e) => patch(i, { active: e.target.checked })} /> ใช้งาน
              </label>
            </header>
            <div className="space-y-3 p-4">
              <label className="block text-xs text-muted">
                คำที่ใช้จับชื่อสินค้า (ต้องมีคำนี้ในชื่อสินค้าถึงจะถือเป็นแพ็คนี้)
                <input className="input mt-1" placeholder="เช่น Best Seller Pack" value={dft.match} onChange={(e) => patch(i, { match: e.target.value })} />
              </label>

              <div className="space-y-1.5">
                <div className="grid grid-cols-[1fr_7rem_4rem_2rem] items-center gap-2 px-1 text-[11px] font-medium text-muted">
                  <span>กลิ่น</span><span>ขนาด</span><span className="text-center">แถม</span><span />
                </div>
                {dft.items.map((it, j) => (
                  <div key={j} className="grid grid-cols-[1fr_7rem_4rem_2rem] items-center gap-2">
                    <Combobox value={it.product} onChange={(v) => patchItem(i, j, { product: v })} options={products} placeholder="เลือกกลิ่น" />
                    <select className="input" value={it.size} onChange={(e) => patchItem(i, j, { size: e.target.value })}>
                      {(sizeOpts.includes(it.size) ? sizeOpts : [it.size, ...sizeOpts]).map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <input type="checkbox" className="mx-auto h-4 w-4 accent-brand" checked={it.is_free} onChange={(e) => patchItem(i, j, { is_free: e.target.checked })} />
                    <button type="button" onClick={() => removeItem(i, j)} className="text-faint hover:text-red-600" disabled={dft.items.length === 1}><X size={16} /></button>
                  </div>
                ))}
                <button type="button" onClick={() => addItem(i)} className="btn-ghost mt-1 px-2 py-1 text-xs"><Plus size={14} /> เพิ่มกลิ่น</button>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button type="button" onClick={() => onSave(i)} disabled={busy === i} className="btn-primary disabled:opacity-50">
                  {busy === i ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} บันทึก
                </button>
                <button type="button" onClick={() => onDelete(i)} disabled={busy === i} className="btn-ghost text-red-600 hover:bg-red-50"><Trash2 size={16} /> ลบ</button>
                {msg?.i === i && <span className={`text-xs ${msg.ok ? "text-green-600" : "text-red-600"}`}>{msg.text}</span>}
              </div>
            </div>
          </section>
        );
      })}
      <button type="button" onClick={addPack} className="btn-ghost w-full border-dashed"><Plus size={16} /> เพิ่มแพ็คใหม่</button>
    </div>
  );
}
