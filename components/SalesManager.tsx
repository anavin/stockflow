"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { setScentSold } from "@/lib/actions/products";
import type { SaleScent } from "@/lib/queries";
import { Tag, Search, X, Check, Info } from "lucide-react";

type Tab = "selling" | "closed" | "all";

export default function SalesManager({ scents }: { scents: SaleScent[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("selling");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState("");
  // สถานะขาย/ปิดแบบ optimistic (ใช้ชื่อกลิ่นเป็น key) — override ค่าจาก server ระหว่างรอ refresh
  const [override, setOverride] = useState<Record<string, boolean>>({});

  const activeOf = (s: SaleScent) => override[s.name] ?? s.active;
  const closedCount = scents.filter((s) => !activeOf(s)).length;
  const sellingCount = scents.length - closedCount;

  const list = useMemo(() => {
    const t = search.trim().toLowerCase();
    return scents
      .filter((s) => (tab === "selling" ? activeOf(s) : tab === "closed" ? !activeOf(s) : true))
      .filter((s) => !t || s.name.toLowerCase().includes(t))
      .sort((a, b) => a.name.localeCompare(b.name, "en"));
  }, [scents, tab, search, override]);

  async function toggle(s: SaleScent) {
    const next = !activeOf(s);
    setBusy(s.name); setErr("");
    setOverride((o) => ({ ...o, [s.name]: next }));   // optimistic
    const res = await setScentSold(s.name, next);
    setBusy(null);
    if (!res.ok) {
      setOverride((o) => { const n = { ...o }; delete n[s.name]; return n; });   // rollback
      setErr(res.error || "บันทึกไม่สำเร็จ");
      return;
    }
    router.refresh();
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-ghost relative">
        <Tag size={16} /> จัดการการขาย
        {closedCount > 0 && (
          <span className="ml-1 rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">ปิด {closedCount}</span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[8vh]" onClick={() => setOpen(false)}>
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            {/* header */}
            <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
              <div>
                <h2 className="flex items-center gap-2 text-base font-semibold text-ink"><Tag size={17} /> จัดการการขาย</h2>
                <p className="mt-0.5 text-xs text-muted">ปิดกลิ่นที่ไม่ได้ขาย เพื่อซ่อนจากสต๊อกและฟอร์มสั่งใบเบิก</p>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-lg p-1 text-faint hover:bg-soft hover:text-ink" title="ปิด"><X size={18} /></button>
            </div>

            <div className="px-5 py-4">
              {/* search */}
              <div className="relative mb-3">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-9" placeholder="ค้นหากลิ่น" autoFocus />
              </div>

              {/* tabs */}
              <div className="mb-3 flex gap-2 text-sm">
                <button onClick={() => setTab("selling")}
                  className={`rounded-lg px-3 py-1.5 font-medium ${tab === "selling" ? "bg-brand-50 text-brand-700" : "border border-line text-muted hover:bg-soft"}`}>
                  กำลังขาย {sellingCount}
                </button>
                <button onClick={() => setTab("closed")}
                  className={`rounded-lg px-3 py-1.5 font-medium ${tab === "closed" ? "bg-slate-200 text-slate-700" : "border border-line text-muted hover:bg-soft"}`}>
                  ปิดการขาย {closedCount}
                </button>
                <button onClick={() => setTab("all")}
                  className={`rounded-lg px-3 py-1.5 ${tab === "all" ? "bg-soft font-medium text-ink" : "text-muted hover:bg-soft"}`}>
                  ทั้งหมด {scents.length}
                </button>
              </div>

              {err && <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{err}</p>}

              {/* list */}
              <div className="max-h-[46vh] overflow-y-auto rounded-xl border border-line">
                {list.length === 0 && <p className="px-4 py-10 text-center text-sm text-muted">ไม่พบกลิ่น</p>}
                {list.map((s) => {
                  const active = activeOf(s);
                  return (
                    <div key={s.name} className={`flex items-center justify-between gap-3 border-b border-line px-4 py-2.5 last:border-b-0 ${active ? "" : "bg-slate-50/60"}`}>
                      <div className="flex min-w-0 items-center gap-2">
                        <span className={`truncate text-sm font-medium ${active ? "text-ink" : "text-slate-500"}`}>{s.name}</span>
                        {s.grade && <span className="chip shrink-0 bg-brand-50 text-brand-600">{s.grade}</span>}
                        {!active && <span className="shrink-0 rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">ปิดการขาย</span>}
                      </div>
                      <button onClick={() => toggle(s)} disabled={busy === s.name}
                        className="flex shrink-0 items-center gap-2 disabled:opacity-50"
                        title={active ? "กดเพื่อปิดการขายกลิ่นนี้" : "กดเพื่อเปิดขายอีกครั้ง"}>
                        <span className={`text-xs font-medium ${active ? "text-green-700" : "text-muted"}`}>
                          {active ? <span className="inline-flex items-center gap-1"><Check size={12} /> ขายอยู่</span> : "ปิดขาย"}
                        </span>
                        <span className={`relative inline-block h-5 w-9 rounded-full transition-colors ${active ? "bg-green-500" : "bg-slate-300"}`}>
                          <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${active ? "left-[18px]" : "left-0.5"}`} />
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>

              <p className="mt-3 flex items-center gap-1.5 text-xs text-faint">
                <Info size={13} /> กดสวิตช์เพื่อเปิด/ปิดการขายทันที — ยอดสต๊อกไม่หาย เปิดกลับได้ทุกเมื่อ
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
