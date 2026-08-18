"use client";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { issueMaterialBatch, type ItemDesc } from "@/lib/actions/supply";
import type { MaterialPick } from "@/lib/queries";
import { Search, Plus, Trash2, PackageMinus, AlertTriangle, Check } from "lucide-react";

const CAT_CHIP: Record<string, { th: string; cls: string }> = {
  bulk: { th: "ปริมาตร", cls: "bg-brand-50 text-brand-600" },
  label: { th: "สติ๊กเกอร์", cls: "bg-purple-50 text-purple-700" },
  packaging: { th: "แพ็คเกจ", cls: "bg-amber-50 text-amber-700" },
};
const keyOf = (p: { category: string; ref_key: string }) => `${p.category}|${p.ref_key}`;
const descOf = (p: MaterialPick): ItemDesc => ({ category: p.category as any, refKey: p.ref_key, scent: p.scent, comp_key: p.comp_key, brand: p.brand, grade: p.grade, label: p.label, category2: p.category2, unit: p.unit });

export default function MaterialIssue({ items, canIssue }: { items: MaterialPick[]; canIssue: boolean }) {
  const router = useRouter();
  const [term, setTerm] = useState("");
  const [cart, setCart] = useState<Map<string, { pick: MaterialPick; amount: string }>>(new Map());
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<number | null>(null);
  const [err, setErr] = useState("");
  const lastRef = useRef<HTMLInputElement>(null);

  const t = term.trim().toLowerCase();
  const results = useMemo(() => {
    if (!t) return [];
    return items.filter((i) => !cart.has(keyOf(i)) && i.label.toLowerCase().includes(t)).slice(0, 40);
  }, [items, t, cart]);

  const add = (p: MaterialPick) => {
    setCart((c) => { const n = new Map(c); n.set(keyOf(p), { pick: p, amount: "" }); return n; });
    setDone(null);
    setTimeout(() => lastRef.current?.focus(), 30);
  };
  const setAmt = (k: string, v: string) => setCart((c) => { const n = new Map(c); const e = n.get(k); if (e) n.set(k, { ...e, amount: v }); return n; });
  const remove = (k: string) => setCart((c) => { const n = new Map(c); n.delete(k); return n; });

  const lines = [...cart.entries()];
  const totalPicked = lines.filter(([, e]) => Math.abs(Number(e.amount) || 0) > 0).length;

  async function submit() {
    const payload = lines.map(([, e]) => ({ desc: descOf(e.pick), amount: Math.abs(Number(e.amount) || 0) })).filter((l) => l.amount > 0);
    if (!payload.length) { setErr("ยังไม่ได้ใส่จำนวนที่เบิก"); return; }
    setBusy(true); setErr("");
    const r = await issueMaterialBatch(payload, note);
    setBusy(false);
    if (!r.ok) { setErr(r.error || "เบิกไม่สำเร็จ"); return; }
    setDone(r.done || payload.length); setCart(new Map()); setNote(""); setTerm(""); router.refresh();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* ค้นหา + เพิ่มรายการ */}
      <div className="card p-4">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <input autoFocus value={term} onChange={(e) => setTerm(e.target.value)} className="input pl-9" placeholder="ค้นหาชื่อวัตถุดิบ / บรรจุภัณฑ์ ที่จะเบิก" />
        </div>
        <div className="mt-3 max-h-[26rem] space-y-1 overflow-y-auto">
          {!t && <p className="py-10 text-center text-sm text-faint">พิมพ์ชื่อเพื่อค้นหา แล้วกด “เพิ่ม” ลงรายการเบิก</p>}
          {t && results.length === 0 && <p className="py-10 text-center text-sm text-muted">ไม่พบรายการ (หรือถูกเพิ่มไปแล้ว)</p>}
          {results.map((p) => {
            const low = p.qty <= 10;
            return (
              <div key={keyOf(p)} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2">
                <span className={`chip ${CAT_CHIP[p.category]?.cls}`}>{CAT_CHIP[p.category]?.th}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-ink">{p.label}</span>
                <span className={`shrink-0 text-xs tabular-nums ${p.qty < 0 ? "text-red-600" : low ? "text-amber-600" : "text-muted"}`}>{p.qty.toLocaleString()} {p.unit}</span>
                <button onClick={() => add(p)} disabled={!canIssue} className="btn-ghost shrink-0 px-2 py-1 text-xs text-brand-600 disabled:opacity-40"><Plus size={13} /> เพิ่ม</button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ตะกร้าเบิก */}
      <div className="card flex flex-col p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink"><PackageMinus size={16} /> รายการที่จะเบิก ({lines.length})</h2>
          {lines.length > 0 && <button onClick={() => setCart(new Map())} className="text-xs text-muted hover:text-ink">ล้างทั้งหมด</button>}
        </div>

        {done != null && <div className="mb-3 flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700"><Check size={15} /> เบิกสำเร็จ {done} รายการ — ตัดสต๊อกแล้ว</div>}

        <div className="flex-1 space-y-1.5">
          {lines.length === 0 && done == null && <p className="py-12 text-center text-sm text-faint">ยังไม่มีรายการ — ค้นหาแล้วกด “เพิ่ม”</p>}
          {lines.map(([k, e], idx) => {
            const over = Math.abs(Number(e.amount) || 0) > e.pick.qty;
            return (
              <div key={k} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className={`chip ${CAT_CHIP[e.pick.category]?.cls}`}>{CAT_CHIP[e.pick.category]?.th}</span>
                    <span className="truncate text-sm text-ink">{e.pick.label}</span>
                  </div>
                  <div className={`mt-0.5 text-xs ${over ? "text-red-600" : "text-faint"}`}>คงเหลือ {e.pick.qty.toLocaleString()} {e.pick.unit}{over && <span className="ml-1"><AlertTriangle size={11} className="inline" /> เบิกเกินยอด</span>}</div>
                </div>
                <input ref={idx === lines.length - 1 ? lastRef : undefined} type="number" inputMode="numeric" value={e.amount}
                  onChange={(ev) => setAmt(k, ev.target.value)} onKeyDown={(ev) => { if (ev.key === "Enter") (document.getElementById("mi-note") as HTMLInputElement)?.focus(); }}
                  className="input h-9 w-20 py-0 text-right text-sm tabular-nums" placeholder="จำนวน" />
                <button onClick={() => remove(k)} className="shrink-0 rounded-md p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={15} /></button>
              </div>
            );
          })}
        </div>

        <div className="mt-3 border-t border-line pt-3">
          <label className="label">หมายเหตุ / ผู้เบิก / เบิกไปทำอะไร — เว้นว่างได้</label>
          <input id="mi-note" value={note} onChange={(e) => setNote(e.target.value)} className="input" placeholder="เช่น เบิกผลิตล็อต 08/2026 · โดยสมชาย" />
          {err && <p className="mt-2 text-xs text-red-600">{err}</p>}
          <button onClick={submit} disabled={busy || !canIssue || totalPicked === 0}
            className="mt-3 w-full rounded-lg bg-red-500 py-2.5 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-50">
            {busy ? "กำลังเบิก…" : canIssue ? `เบิกทั้งหมด (${totalPicked} รายการ)` : "เฉพาะฝ่ายคลัง / แอดมิน"}
          </button>
        </div>
      </div>
    </div>
  );
}
