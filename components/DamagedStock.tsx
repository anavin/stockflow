"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { DamagedRow } from "@/lib/queries";
import { disposeDamaged } from "@/lib/actions/returns";
import { PackageX, RotateCcw, FileWarning, Trash2, Loader2 } from "lucide-react";

export default function DamagedStock({ rows, canManage }: { rows: DamagedRow[]; canManage: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const total = rows.reduce((a, r) => a + r.qty, 0);

  async function act(r: DamagedRow, action: "repair" | "claim" | "writeoff", qty: number) {
    const key = `${r.product}|${r.size}`;
    if (action === "writeoff" && !confirm(`ทำลาย (ตัดทิ้ง) ${r.product} ${r.size} จำนวน ${qty}? — ย้อนไม่ได้`)) return;
    setBusy(key); setErr(null);
    const res = await disposeDamaged(r.product, r.size, qty, action);
    setBusy("");
    if (!res.ok) { setErr(res.error || "ไม่สำเร็จ"); return; }
    router.refresh();
  }

  if (rows.length === 0) return <div className="card p-10 text-center text-sm text-muted">ยังไม่มีของชำรุดในคลัง 🎉</div>;

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center gap-x-6 gap-y-1 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink"><PackageX size={16} className="text-red-600" /> ของชำรุดในคลัง</div>
        <div className="text-sm text-muted">{rows.length} รายการ · รวม <b className="text-red-700">{total.toLocaleString()}</b> ชิ้น</div>
      </div>
      {err && <div className="alert-error">{err}</div>}

      <div className="overflow-hidden rounded-xl border border-line bg-white">
        <div className="divide-y divide-line">
          {rows.map((r) => <Row key={`${r.product}|${r.size}`} r={r} canManage={canManage} busy={busy === `${r.product}|${r.size}`} onAct={act} />)}
        </div>
      </div>
      {canManage && <p className="text-xs text-faint">ซ่อมคืนสต๊อก = ย้ายกลับเป็นของขายได้ · เคลม = ส่งเคลมขนส่ง/ผู้ผลิต · ทำลาย = ตัดทิ้งถาวร (ทุกอย่างลงประวัติ)</p>}
    </div>
  );
}

function Row({ r, canManage, busy, onAct }: { r: DamagedRow; canManage: boolean; busy: boolean; onAct: (r: DamagedRow, a: "repair" | "claim" | "writeoff", q: number) => void }) {
  const [qty, setQty] = useState(r.qty);
  const q = Math.max(1, Math.min(r.qty, qty || 1));
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-ink">{r.product}</div>
        <div className="text-xs text-muted">{r.size} · เหลือ <b className="text-red-700">{r.qty}</b> ชิ้น</div>
      </div>
      {canManage ? (
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center overflow-hidden rounded-lg border border-line text-sm">
            <input type="number" min={1} max={r.qty} value={qty} onChange={(e) => setQty(Number(e.target.value))}
              className="w-14 px-2 py-1.5 text-center font-mono outline-none" />
            <span className="border-l border-line px-2 py-1.5 text-xs text-faint">/ {r.qty}</span>
          </div>
          {busy ? <span className="flex items-center gap-1 px-2 text-xs text-muted"><Loader2 size={14} className="animate-spin" /> กำลังทำ…</span> : (
            <>
              <button onClick={() => onAct(r, "repair", q)} className="btn-success text-xs"><RotateCcw size={13} /> ซ่อมคืนสต๊อก</button>
              <button onClick={() => onAct(r, "claim", q)} className="btn-warn text-xs"><FileWarning size={13} /> เคลม</button>
              <button onClick={() => onAct(r, "writeoff", q)} className="btn-danger-solid text-xs"><Trash2 size={13} /> ทำลาย</button>
            </>
          )}
        </div>
      ) : (
        <span className="chip-danger">เหลือ {r.qty}</span>
      )}
    </div>
  );
}
