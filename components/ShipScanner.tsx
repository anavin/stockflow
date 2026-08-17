"use client";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { markShipped, unshipOrder } from "@/lib/actions/orders";
import type { ShipRow } from "@/lib/queries";
import { ScanLine, Camera, CheckCircle2, AlertTriangle, XCircle, PackageCheck, Truck, Undo2, Calendar } from "lucide-react";

const CameraScan = dynamic(() => import("./CameraScan"), { ssr: false });

type Row = ShipRow & { _new?: boolean };
type Banner = { kind: "ok" | "already" | "error"; text: string; sub?: string } | null;
const timeOf = (v?: string | null) => (v ? new Date(v).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) : "—");

// เสียง/สั่น ยืนยันการสแกน (ok=สูง, already=กลาง, error=ต่ำคู่)
function feedback(kind: "ok" | "already" | "error") {
  try {
    const AC = (window.AudioContext || (window as any).webkitAudioContext); if (!AC) return;
    const ac = new AC(); const o = ac.createOscillator(); const g = ac.createGain();
    o.connect(g); g.connect(ac.destination);
    o.frequency.value = kind === "ok" ? 880 : kind === "already" ? 560 : 300;
    g.gain.value = 0.05; o.start();
    o.stop(ac.currentTime + (kind === "error" ? 0.28 : 0.12));
  } catch { /* เงียบได้ */ }
  try { navigator.vibrate?.(kind === "error" ? [80, 60, 80] : 40); } catch { /* ไม่มี vibrate */ }
}

export default function ShipScanner({ date, isToday, rows: initialRows, pending, canUndo }:
  { date: string; isToday: boolean; rows: ShipRow[]; pending: number; canUndo: boolean }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [banner, setBanner] = useState<Banner>(null);
  const [rows, setRows] = useState<Row[]>(initialRows);
  const [addedIssued, setAddedIssued] = useState(0);   // นับที่เพิ่งสแกน (เฉพาะที่ตัดสต๊อกแล้ว) → ลด "ค้างส่ง"
  const inputRef = useRef<HTMLInputElement>(null);
  const total = rows.length;                            // = รายการของวันที่เลือก (initial + ที่เพิ่งสแกน) ไม่นับซ้ำ
  const left = Math.max(0, pending - addedIssued);
  const seen = useMemo(() => new Set(rows.map((r) => r.order_no.toUpperCase())), [rows]);

  async function scan(codeArg?: string) {
    const code = (codeArg ?? value).trim();
    if (!code || busy) return;
    // กันสแกนซ้ำฝั่ง client (สแกนรัวๆ อาจอ่านกล่องเดิม) — ไม่ยิง action ซ้ำ
    if (seen.has(code.toUpperCase())) { feedback("already"); setBanner({ kind: "already", text: `สแกนไปแล้ว · ${code}` }); setValue(""); return; }
    setBusy(true); setValue("");
    let res: Awaited<ReturnType<typeof markShipped>>;
    try { res = await markShipped(code, isToday ? undefined : date); }   // วันนี้ = now, ย้อนหลัง = วันที่เลือก
    catch { res = { ok: false, error: "บันทึกไม่สำเร็จ (ระบบขัดข้อง)" }; }
    setBusy(false);
    setTimeout(() => inputRef.current?.focus(), 0);
    if (!res.ok) { feedback("error"); setBanner({ kind: "error", text: res.error || "ไม่สำเร็จ" }); return; }
    const o = res.order!;
    if (res.already) {
      feedback("already");
      setBanner({ kind: "already", text: `สแกนไปแล้ว · ${o.order_no}`, sub: `ส่งเมื่อ ${timeOf(res.at)} · ${o.receiver || "-"}` });
      return;
    }
    feedback("ok");
    setBanner({ kind: "ok", text: `บันทึกส่งแล้ว · ${o.order_no}`, sub: `${o.receiver || "-"} · ${o.province || "-"} · ${o.item_count} รายการ${res.issued ? "" : " · ⚠️ ยังไม่ได้ตัดสต๊อก"}` });
    setRows((r) => [{ order_no: o.order_no, doc_no: null, receiver: o.receiver, province: o.province, item_count: o.item_count, shipped_at: res.at || new Date().toISOString(), shipped_by_name: "เพิ่งสแกน", _new: true }, ...r]);
    if (res.issued) setAddedIssued((n) => n + 1);
  }

  async function undo(orderNo: string) {
    if (!confirm(`ยกเลิกการส่งของ ${orderNo}?`)) return;
    const res = await unshipOrder(orderNo);
    if (!res.ok) { alert(res.error); return; }
    setRows((r) => r.filter((x) => x.order_no !== orderNo));
  }

  const bannerCls = banner?.kind === "ok" ? "border-green-200 bg-green-50 text-green-800"
    : banner?.kind === "already" ? "border-amber-200 bg-amber-50 text-amber-800"
    : "border-red-200 bg-red-50 text-red-700";
  const BannerIcon = banner?.kind === "ok" ? CheckCircle2 : banner?.kind === "already" ? AlertTriangle : XCircle;

  const todayStr = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
  return (
    <div className="space-y-4">
      {/* เมนูวันที่ — สแกนย้อนหลังได้ */}
      <div className="flex items-center gap-2 rounded-2xl border border-line bg-white p-3">
        <Calendar size={16} className="shrink-0 text-brand" />
        <label className="shrink-0 text-sm font-medium text-ink">วันที่ส่ง</label>
        <input type="date" value={date} max={todayStr}
          onChange={(e) => router.push(`/ship?date=${e.target.value}`)} className="input h-9 flex-1" />
        {!isToday && <button type="button" onClick={() => router.push("/ship")} className="btn-ghost shrink-0 whitespace-nowrap text-xs">วันนี้</button>}
      </div>
      {!isToday && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <AlertTriangle size={14} className="shrink-0" /> โหมดย้อนหลัง — ที่สแกนจะบันทึกเป็นวันที่ <b>{date}</b> (ไม่ใช่วันนี้)
        </div>
      )}

      {/* สรุป */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-center">
          <div className="text-3xl font-bold text-green-700">{total.toLocaleString()}</div>
          <div className="mt-0.5 text-xs font-medium text-green-700/80">{isToday ? "ส่งแล้ววันนี้" : "ส่งวันที่เลือก"}</div>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center">
          <div className="text-3xl font-bold text-amber-700">{left.toLocaleString()}</div>
          <div className="mt-0.5 text-xs font-medium text-amber-700/80">ค้างส่ง (ตัดแล้ว)</div>
        </div>
      </div>

      {/* ช่องสแกน */}
      <div className="rounded-2xl border border-line bg-white p-4">
        <label className="mb-2 flex items-center gap-1.5 text-sm font-medium text-ink"><ScanLine size={16} /> สแกน Order No. จากใบปะหน้า</label>
        <div className="flex gap-2">
          <input ref={inputRef} autoFocus inputMode="text" value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); scan(); } }}
            className="input h-12 flex-1 font-mono text-base" placeholder="สแกนบาร์โค้ด หรือพิมพ์ Order No. แล้ว Enter" />
          <button type="button" onClick={() => setScanOpen(true)}
            className="inline-flex h-12 items-center gap-1.5 rounded-lg bg-brand px-4 font-semibold text-white hover:bg-brand-600">
            <Camera size={18} /> กล้อง
          </button>
        </div>
        {banner && (
          <div className={`mt-3 flex items-start gap-2 rounded-xl border px-3 py-2.5 text-sm ${bannerCls}`}>
            <BannerIcon size={18} className="mt-0.5 shrink-0" />
            <div><div className="font-semibold">{banner.text}</div>{banner.sub && <div className="text-xs opacity-80">{banner.sub}</div>}</div>
          </div>
        )}
        <p className="mt-2 flex items-center gap-1 text-[11px] text-faint"><Camera size={12} /> เปิดกล้องแล้วเล็งใบปะหน้าทีละกล่องได้ต่อเนื่อง — ระบบบันทึกอัตโนมัติทุกครั้งที่อ่านได้</p>
      </div>

      {/* รายการที่ส่งวันนี้ */}
      <div className="overflow-hidden rounded-2xl border border-line bg-white">
        <div className="flex items-center gap-2 border-b border-line px-4 py-3 text-sm font-semibold text-ink">
          <Truck size={16} /> {isToday ? "รายการที่ส่งวันนี้" : `รายการที่ส่ง ${date}`} <span className="text-muted">({rows.length})</span>
        </div>
        {rows.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted">ยังไม่มีรายการ — สแกนใบปะหน้าเพื่อเริ่มบันทึก</p>
        ) : (
          <div className="divide-y divide-line">
            {rows.map((r) => (
              <div key={r.order_no} className={`flex items-center gap-3 px-4 py-2.5 ${r._new ? "bg-green-50/40" : ""}`}>
                <div className="w-12 shrink-0 text-xs tabular-nums text-muted">{timeOf(r.shipped_at)}</div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-mono text-xs text-ink">{r.order_no}</div>
                  <div className="truncate text-xs text-muted">{r.receiver || "-"} · {r.province || "-"} · {r.item_count} รายการ</div>
                </div>
                <PackageCheck size={16} className="shrink-0 text-green-600" />
                {canUndo && (
                  <button onClick={() => undo(r.order_no)} className="shrink-0 rounded-md p-1 text-faint hover:bg-red-50 hover:text-red-500" title="ยกเลิกการส่ง"><Undo2 size={14} /></button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {scanOpen && (
        <CameraScan continuous title="เล็งใบปะหน้า (Order No.)" hint="วางบาร์โค้ด Order No. ให้อยู่ในกรอบ — สแกนต่อเนื่องได้ กดเสร็จสิ้นเมื่อครบ"
          onClose={() => setScanOpen(false)} onScan={(code) => scan(code)} />
      )}
    </div>
  );
}
