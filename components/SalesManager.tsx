"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { setSkuSold } from "@/lib/actions/products";
import { Tag, Search, X, Info } from "lucide-react";

type Combo = { product: string; size: string; grade: string | null };
type Tab = "selling" | "closed" | "all";

const norm = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9ก-๙]/g, "");
const comboKey = (p: string, s: string) => `${norm(p)}|${norm(s)}`;
const mlOf = (s: string) => { const m = String(s || "").match(/(\d+(?:\.\d+)?)/); return m ? parseFloat(m[1]) : 0; };

export default function SalesManager({ rows, closed = {} }:
  { rows: { product: string; size: string; grade: string | null }[]; closed?: Record<string, string[]> }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("selling");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [override, setOverride] = useState<Record<string, boolean>>({});   // comboKey → closed? (optimistic)

  // รายการ กลิ่น+ขนาด ที่ไม่ซ้ำ (จากสต๊อก)
  const combos = useMemo(() => {
    const m = new Map<string, Combo>();
    for (const r of rows) { const k = comboKey(r.product, r.size); if (!m.has(k)) m.set(k, { product: r.product, size: r.size, grade: r.grade }); }
    return [...m.values()];
  }, [rows]);

  const closedFromDb = (p: string, s: string) => (closed[norm(p)] ?? []).includes(norm(s));
  const isClosed = (p: string, s: string) => override[comboKey(p, s)] ?? closedFromDb(p, s);
  const closedCount = combos.filter((c) => isClosed(c.product, c.size)).length;
  const sellingCount = combos.length - closedCount;

  // จัดกลุ่มตามกลิ่น + กรองตามแท็บ/ค้นหา
  const groups = useMemo(() => {
    const t = search.trim().toLowerCase();
    const m = new Map<string, { grade: string | null; sizes: Combo[] }>();
    for (const c of combos) {
      const cl = isClosed(c.product, c.size);
      if (tab === "selling" && cl) continue;
      if (tab === "closed" && !cl) continue;
      if (t && !c.product.toLowerCase().includes(t)) continue;
      if (!m.has(c.product)) m.set(c.product, { grade: c.grade, sizes: [] });
      m.get(c.product)!.sizes.push(c);
    }
    return [...m.entries()]
      .map(([product, v]) => ({ product, grade: v.grade, sizes: v.sizes.sort((a, b) => mlOf(b.size) - mlOf(a.size)) }))
      .sort((a, b) => a.product.localeCompare(b.product, "en"));
  }, [combos, tab, search, override, closed]);

  async function toggle(product: string, size: string, close: boolean) {
    const key = comboKey(product, size);
    setBusy(key); setErr("");
    setOverride((o) => ({ ...o, [key]: close }));   // optimistic
    const res = await setSkuSold(product, size, !close);
    setBusy(null);
    if (!res.ok) {
      setOverride((o) => { const n = { ...o }; delete n[key]; return n; });
      setErr(res.error || "บันทึกไม่สำเร็จ");
      return;
    }
    router.refresh();
  }
  // ปิด/เปิดทั้งกลิ่น (ทุกขนาด) ทีเดียว
  async function toggleScent(g: { product: string; sizes: Combo[] }, close: boolean) {
    setErr("");
    const targets = g.sizes.filter((c) => isClosed(c.product, c.size) !== close);
    setOverride((o) => { const n = { ...o }; for (const c of targets) n[comboKey(c.product, c.size)] = close; return n; });
    setBusy(g.product);
    for (const c of targets) { const r = await setSkuSold(c.product, c.size, !close); if (!r.ok) { setErr(r.error || "บันทึกไม่สำเร็จ"); break; } }
    setBusy(null);
    router.refresh();
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-ghost relative">
        <Tag size={16} /> จัดการการขาย
        {closedCount > 0 && <span className="ml-1 rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">ปิด {closedCount}</span>}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[8vh]" onClick={() => setOpen(false)}>
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
              <div>
                <h2 className="flex items-center gap-2 text-base font-semibold text-ink"><Tag size={17} /> จัดการการขาย</h2>
                <p className="mt-0.5 text-xs text-muted">เลือกเปิด/ปิดการขายได้ราย <b className="text-ink">กลิ่น + ขนาด</b> — ปิดแล้วซ่อนจากสต๊อกและเลือกในใบเบิกไม่ได้</p>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-lg p-1 text-faint hover:bg-soft hover:text-ink" title="ปิด"><X size={18} /></button>
            </div>

            <div className="px-5 py-4">
              <div className="relative mb-3">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-9" placeholder="ค้นหากลิ่น" autoFocus />
              </div>

              <div className="mb-3 flex gap-2 text-sm">
                <button onClick={() => setTab("selling")} className={`rounded-lg px-3 py-1.5 font-medium ${tab === "selling" ? "bg-brand-50 text-brand-700" : "border border-line text-muted hover:bg-soft"}`}>กำลังขาย {sellingCount}</button>
                <button onClick={() => setTab("closed")} className={`rounded-lg px-3 py-1.5 font-medium ${tab === "closed" ? "bg-slate-200 text-slate-700" : "border border-line text-muted hover:bg-soft"}`}>ปิดการขาย {closedCount}</button>
                <button onClick={() => setTab("all")} className={`rounded-lg px-3 py-1.5 ${tab === "all" ? "bg-soft font-medium text-ink" : "text-muted hover:bg-soft"}`}>ทั้งหมด {combos.length}</button>
              </div>

              {err && <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{err}</p>}

              <div className="max-h-[46vh] overflow-y-auto rounded-xl border border-line">
                {groups.length === 0 && <p className="px-4 py-10 text-center text-sm text-muted">ไม่พบรายการ</p>}
                {groups.map((g) => {
                  const openSizes = g.sizes.filter((c) => !isClosed(c.product, c.size)).length;
                  const anyOpen = openSizes > 0;
                  return (
                    <div key={g.product} className="border-b border-line last:border-b-0">
                      {/* หัวกลิ่น + ปิด/เปิดทั้งกลิ่น */}
                      <div className="flex items-center justify-between gap-2 bg-soft/60 px-4 py-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="truncate text-sm font-semibold text-ink">{g.product}</span>
                          {g.grade && <span className="chip shrink-0 bg-brand-50 text-brand-600">{g.grade}</span>}
                          <span className="shrink-0 text-[11px] text-muted">เปิด {openSizes}/{g.sizes.length}</span>
                        </div>
                        <button type="button" disabled={busy === g.product}
                          onClick={() => toggleScent(g, anyOpen)}
                          className="shrink-0 rounded-md border border-line px-2 py-0.5 text-[11px] text-muted hover:bg-white disabled:opacity-50">
                          {anyOpen ? "ปิดทั้งกลิ่น" : "เปิดทั้งกลิ่น"}
                        </button>
                      </div>
                      {/* แต่ละขนาด */}
                      {g.sizes.map((c) => {
                        const cl = isClosed(c.product, c.size);
                        const k = comboKey(c.product, c.size);
                        return (
                          <div key={k} className={`flex items-center justify-between gap-3 px-4 py-2 pl-8 ${cl ? "bg-slate-50/60" : ""}`}>
                            <div className="flex items-center gap-2">
                              <span className={`text-sm ${cl ? "text-slate-500" : "text-ink"}`}>{c.size}</span>
                              {cl && <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">ปิด</span>}
                            </div>
                            <button onClick={() => toggle(c.product, c.size, !cl)} disabled={busy === k}
                              className="flex shrink-0 items-center gap-2 disabled:opacity-50"
                              title={cl ? "กดเพื่อเปิดขายขนาดนี้" : "กดเพื่อปิดขายขนาดนี้"}>
                              <span className={`text-xs font-medium ${cl ? "text-muted" : "text-green-700"}`}>{cl ? "ปิดขาย" : "ขายอยู่"}</span>
                              <span className={`relative inline-block h-5 w-9 rounded-full transition-colors ${cl ? "bg-slate-300" : "bg-green-500"}`}>
                                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${cl ? "left-0.5" : "left-[18px]"}`} />
                              </span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>

              <p className="mt-3 flex items-center gap-1.5 text-xs text-faint">
                <Info size={13} /> กดสวิตช์เพื่อเปิด/ปิดแต่ละขนาดทันที — ยอดสต๊อกไม่หาย เปิดกลับได้ทุกเมื่อ
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
