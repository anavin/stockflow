"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Combobox from "./Combobox";
import { createTryMe, deleteTryMe, type TryMeLine } from "@/lib/actions/tryme";
import { WHOLESALE_PLATFORMS, platformName, platformColor } from "@/lib/config";
import type { TryMeRow, TryMeStat } from "@/lib/queries";
import { FlaskConical, Plus, Trash2, CheckCircle2, AlertTriangle, Gift } from "lucide-react";

const SIZES = ["30 ml", "50 ml"];
type Line = { scent: string; size: string; qty: number };
const blank = (): Line => ({ scent: "", size: "30 ml", qty: 1 });

export default function TryMeManager({ scents, rows, stats, total, initialPlatform, canDelete }: {
  scents: string[]; rows: TryMeRow[]; stats: TryMeStat[]; total: number; initialPlatform?: string; canDelete: boolean;
}) {
  const router = useRouter();
  const wholesale = WHOLESALE_PLATFORMS as readonly string[];
  const [platform, setPlatform] = useState(initialPlatform && wholesale.includes(initialPlatform) ? initialPlatform : WHOLESALE_PLATFORMS[0]);
  const [lines, setLines] = useState<Line[]>([blank()]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const set = (i: number, patch: Partial<Line>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const totalQty = lines.reduce((a, l) => a + (l.scent ? Math.max(0, l.qty) : 0), 0);

  async function submit() {
    setErr(""); setMsg("");
    const payload: TryMeLine[] = lines.filter((l) => l.scent.trim());
    if (!payload.length) { setErr("ยังไม่ได้เลือกกลิ่น"); return; }
    setBusy(true);
    try {
      const res = await createTryMe(platform, payload, note);
      if (!res.ok) { setErr(res.error || "บันทึกไม่สำเร็จ"); return; }
      setMsg(`บันทึกแล้ว · เทสเตอร์ ${res.qty} ชิ้น (${res.count} กลิ่น) → ${platformName(platform)}`);
      setLines([blank()]); setNote("");
      router.refresh();
    } catch { setErr("เกิดข้อผิดพลาด ลองใหม่"); } finally { setBusy(false); }
  }
  async function del(id: number) {
    if (!confirm("ลบรายการ Try Me นี้?")) return;
    try { const r = await deleteTryMe(id); if (!r.ok) { alert(r.error); return; } router.refresh(); } catch { alert("ลบไม่สำเร็จ"); }
  }

  const fmt = (s: string) => new Date(s).toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_1fr]">
      {/* ── ฟอร์มเบิก Try Me ── */}
      <section className="card p-5">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-ink"><FlaskConical size={16} className="text-brand" /> เบิก Try Me (เทสเตอร์)</h2>
        <p className="mb-4 flex items-center gap-1 text-xs text-muted"><Gift size={13} /> เบิกฟรี · ผลิตต่อครั้งตาม request · เฉพาะค้าส่ง 3 แพลตฟอร์ม · ขนาด 30/50 ml</p>

        {/* แพลตฟอร์มที่ขอ */}
        <div className="mb-3">
          <label className="mb-1 block text-xs font-medium text-muted">แพลตฟอร์มที่ขอ</label>
          <div className="flex flex-wrap gap-2">
            {WHOLESALE_PLATFORMS.map((p) => (
              <button key={p} type="button" onClick={() => setPlatform(p)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${platform === p ? "text-white" : "border-line bg-white text-muted hover:bg-soft"}`}
                style={platform === p ? { backgroundColor: platformColor(p), borderColor: platformColor(p) } : undefined}>
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: platform === p ? "#fff" : platformColor(p) }} /> {platformName(p)}
              </button>
            ))}
          </div>
        </div>

        {/* บรรทัดกลิ่น */}
        <div className="space-y-2">
          {lines.map((l, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <Combobox value={l.scent} onChange={(v) => set(i, { scent: v })} options={scents} allowCustom={false} placeholder="เลือกกลิ่น" />
              </div>
              <select value={l.size} onChange={(e) => set(i, { size: e.target.value })} className="input h-10 w-24 shrink-0">
                {SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <input type="number" min={1} max={999} value={l.qty} onChange={(e) => set(i, { qty: Math.max(1, Number(e.target.value) || 1) })}
                className="input h-10 w-20 shrink-0 text-right" title="จำนวน" />
              {lines.length > 1 && (
                <button type="button" onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))} className="mt-1 shrink-0 rounded-md p-1.5 text-faint hover:bg-soft hover:text-red-600" title="ลบบรรทัด"><Trash2 size={16} /></button>
              )}
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setLines((ls) => [...ls, blank()])} className="btn-ghost mt-2 text-xs"><Plus size={14} /> เพิ่มกลิ่น</button>

        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="หมายเหตุ (ถ้ามี) เช่น รอบจัดส่ง / ผู้ขอ" className="input mt-3" />

        {err && <div className="alert-error mt-3 flex items-center gap-1"><AlertTriangle size={14} /> {err}</div>}
        {msg && <div className="alert-success mt-3 flex items-center gap-1"><CheckCircle2 size={14} /> {msg}</div>}

        <button onClick={submit} disabled={busy || totalQty === 0} className="btn-primary mt-4 w-full">
          {busy ? "กำลังบันทึก…" : `บันทึกเบิก Try Me${totalQty ? ` · ${totalQty} ชิ้น` : ""}`}
        </button>
      </section>

      {/* ── สถิติ + ประวัติ ── */}
      <div className="space-y-4">
        <section className="card p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink"><Gift size={15} className="text-brand" /> สถิติ Try Me <span className="text-xs font-normal text-muted">รวม {total.toLocaleString()} ชิ้น</span></h2>
          {stats.length === 0 ? <p className="py-2 text-xs text-muted">ยังไม่มีการเบิก</p> : (
            <div className="space-y-1.5">
              {stats.map((s) => (
                <div key={s.platform} className="flex items-center gap-2 text-sm">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: platformColor(s.platform) }} />
                  <span className="w-28 shrink-0 truncate text-ink">{platformName(s.platform)}</span>
                  <span className="flex-1 text-right tabular-nums text-ink">{s.qty.toLocaleString()} <span className="text-faint">ชิ้น</span></span>
                  <span className="w-16 text-right text-xs text-faint">{s.times} ครั้ง</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card overflow-hidden">
          <div className="border-b border-line px-5 py-3 text-sm font-semibold text-ink">ประวัติล่าสุด</div>
          {rows.length === 0 ? <p className="p-5 text-center text-xs text-muted">ยังไม่มีประวัติ</p> : (
            <div className="max-h-80 overflow-y-auto divide-y divide-line/70">
              {rows.map((r) => (
                <div key={r.id} className="flex items-center gap-2 px-4 py-2 text-xs hover:bg-soft">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: platformColor(r.platform) }} title={platformName(r.platform)} />
                  <span className="min-w-0 flex-1 truncate text-ink"><b>{r.scent}</b> <span className="text-faint">{r.size}</span></span>
                  <span className="shrink-0 tabular-nums text-brand-600">×{r.qty}</span>
                  <span className="hidden shrink-0 text-faint sm:inline">{fmt(r.created_at)}</span>
                  {canDelete && <button onClick={() => del(r.id)} className="shrink-0 rounded p-1 text-faint hover:text-red-600" title="ลบ"><Trash2 size={13} /></button>}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
