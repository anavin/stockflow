"use client";
import { Fragment, useMemo, useState } from "react";
import { labelRef } from "@/lib/materials";
import type { LabelScent } from "@/lib/queries";
import MaterialControls from "./MaterialControls";
import { Search, ChevronDown, ChevronRight } from "lucide-react";

export default function LabelStock({ scents, canEdit }: { scents: LabelScent[]; canEdit: boolean }) {
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const t = search.trim().toLowerCase();
  const filtered = useMemo(() => scents.filter((s) => !t || s.scent.toLowerCase().includes(t)), [scents, t]);
  const toggle = (k: string) => setCollapsed((c) => { const n = new Set(c); n.has(k) ? n.delete(k) : n.add(k); return n; });

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center gap-2 p-3">
        <div className="relative min-w-[200px] flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-9" placeholder="ค้นหากลิ่น" />
        </div>
        <span className="text-xs text-muted">{filtered.length} กลิ่น</span>
        <button onClick={() => setCollapsed(new Set(filtered.map((s) => s.scent)))} className="btn-ghost text-xs"><ChevronRight size={14} /> ย่อทั้งหมด</button>
        <button onClick={() => setCollapsed(new Set())} className="btn-ghost text-xs"><ChevronDown size={14} /> ขยายทั้งหมด</button>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && <p className="card p-10 text-center text-sm text-muted">ไม่พบกลิ่น</p>}
        {filtered.map((s) => {
          const open = !collapsed.has(s.scent);
          const total = s.components.reduce((a, c) => a + c.qty, 0);
          const low = s.components.filter((c) => c.qty <= 10).length;
          return (
            <div key={s.scent} className="overflow-hidden rounded-xl border border-line bg-white">
              <button onClick={() => toggle(s.scent)} className="flex w-full items-center gap-2 bg-soft/60 px-4 py-2.5 text-left">
                {open ? <ChevronDown size={15} className="text-faint" /> : <ChevronRight size={15} className="text-faint" />}
                <span className="font-semibold text-ink">{s.scent}</span>
                <span className="chip bg-brand-50 text-brand-600">{s.grade}</span>
                <span className="text-xs text-muted">· {s.components.length} ชิ้นส่วน · รวม {total.toLocaleString()}{low > 0 && <span className="text-amber-600"> · ใกล้หมด {low}</span>}</span>
              </button>
              {open && (
                <div className="divide-y divide-line">
                  {s.components.map((c) => (
                    <div key={c.key} className="flex items-center justify-between gap-3 px-4 py-2 pl-10">
                      <span className="text-sm text-ink">{c.label}</span>
                      <MaterialControls canEdit={canEdit} qty={c.qty} unit="ชิ้น"
                        desc={{ category: "label", refKey: labelRef(s.scent, c.key), scent: s.scent, comp_key: c.key, grade: s.grade, label: `${s.scent} · ${c.label}`, unit: "ชิ้น" }} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
