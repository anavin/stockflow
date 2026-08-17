"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updateUnitSku, deleteUnit, assignUnitSkus } from "@/lib/actions/stock";
import type { UnitRow } from "@/lib/queries";
import { Pencil, Trash2, Check, X, Wrench, Camera, Plus } from "lucide-react";
const CameraScan = dynamic(() => import("./CameraScan"), { ssr: false });

const statusChip = (s: string) => s === "issued"
  ? { label: "ตัดออกแล้ว", cls: "bg-soft text-muted" }
  : s === "void" ? { label: "ยกเลิก", cls: "bg-red-50 text-red-600" }
  : { label: "อยู่คลัง", cls: "bg-green-50 text-green-700" };

type Reconcile = { product: string; size: string; qty: number; units: number; gap: number };

export default function UnitsManager({ units, canEdit, reconcile }: { units: UnitRow[]; canEdit: boolean; reconcile?: Reconcile | null }) {
  const router = useRouter();
  const [editSku, setEditSku] = useState<string | null>(null);
  const [editVal, setEditVal] = useState("");
  const [busy, setBusy] = useState(false);

  function startEdit(sku: string) { setEditSku(sku); setEditVal(sku); }
  function cancelEdit() { setEditSku(null); setEditVal(""); }

  async function saveEdit(oldSku: string) {
    const n = editVal.trim();
    if (!n || n === oldSku) { cancelEdit(); return; }
    setBusy(true);
    const res = await updateUnitSku(oldSku, n);
    setBusy(false);
    if (!res.ok) { alert(res.error || "แก้ไขไม่สำเร็จ"); return; }
    cancelEdit(); router.refresh();
  }

  async function del(u: UnitRow) {
    const warn = u.status === "issued"
      ? `SKU นี้ถูกตัดออกไปแล้ว (ออเดอร์ ${u.order_no || "-"}) — ลบเพื่อล้างประวัติการติดตาม?`
      : `ลบ SKU "${u.sku}" (${u.product} ${u.size}) ออกจากคลัง? ยอดคงเหลือจะลด 1`;
    if (!confirm(warn)) return;
    setBusy(true);
    const res = await deleteUnit(u.sku);
    setBusy(false);
    if (!res.ok) { alert(res.error || "ลบไม่สำเร็จ"); return; }
    router.refresh();
  }

  const cols = canEdit ? 8 : 7;
  return (
    <div className="space-y-3">
      {reconcile && reconcile.gap > 0 && (
        <ReconcilePanel key={reconcile.gap} {...reconcile} />
      )}
      <div className="overflow-hidden rounded-xl border border-line bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-soft text-left text-xs text-muted">
            <tr>
              <th className="px-4 py-3">วันจัดส่ง</th>
              <th className="px-3 py-3">SKU</th>
              <th className="px-3 py-3">กลิ่น</th>
              <th className="px-3 py-3">Grade</th>
              <th className="px-3 py-3">วันที่รับเข้า</th>
              <th className="px-3 py-3">สถานะ</th>
              <th className="px-3 py-3">ออเดอร์ / ผู้ซื้อ</th>
              {canEdit && <th className="px-3 py-3 text-right">จัดการ</th>}
            </tr>
          </thead>
          <tbody>
            {units.length === 0 && <tr><td colSpan={cols} className="px-4 py-12 text-center text-muted">ไม่พบ SKU รายชิ้น — ออเดอร์/สินค้านี้อาจตัดสต๊อกแบบไม่สแกน SKU หรือยังไม่มีการรับเข้าแบบ SKU</td></tr>}
            {units.map((u) => {
              const st = statusChip(u.status);
              const editing = editSku === u.sku;
              return (
                <tr key={u.sku} className="border-t border-line hover:bg-soft/40">
                  <td className="px-4 py-2.5 text-xs text-muted">{u.shipped_at ? String(u.shipped_at).slice(0, 10) : "—"}</td>
                  <td className="px-3 py-2.5">
                    {editing ? (
                      <input autoFocus value={editVal} onChange={(e) => setEditVal(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") saveEdit(u.sku); if (e.key === "Escape") cancelEdit(); }}
                        className="input h-8 w-40 font-mono text-xs" />
                    ) : (
                      <span className="font-mono text-xs text-ink">{u.sku}</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5"><span className="font-medium text-ink">{u.product}</span> <span className="text-muted">{u.size}</span></td>
                  <td className="px-3 py-2.5">{u.grade ? <span className="chip bg-brand-50 text-brand-600">{u.grade}</span> : <span className="text-faint">—</span>}</td>
                  <td className="px-3 py-2.5 text-xs text-muted">{u.received_at ? String(u.received_at).slice(0, 10) : "—"}</td>
                  <td className="px-3 py-2.5"><span className={`chip ${st.cls}`}>{st.label}</span></td>
                  <td className="px-3 py-2.5">
                    {u.order_no ? (
                      <Link href={`/shopee/${encodeURIComponent(u.order_no)}`} className="text-brand-600 hover:underline">
                        <span className="font-mono text-xs">{u.order_no}</span>
                        {(u.buyer || u.receiver) && <span className="text-muted"> · {u.buyer || u.receiver}</span>}
                      </Link>
                    ) : <span className="text-faint">—</span>}
                  </td>
                  {canEdit && (
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        {u.source === "order" ? (
                          <span className="text-[11px] text-faint" title="SKU นี้บันทึกตอนตัดสต๊อก (ยังไม่ได้รับเข้าแบบรายชิ้น) — แก้/ลบที่ใบเบิก">จากใบเบิก</span>
                        ) : editing ? (
                          <>
                            <button onClick={() => saveEdit(u.sku)} disabled={busy} title="บันทึก"
                              className="rounded-md p-1.5 text-green-700 hover:bg-green-50 disabled:opacity-40"><Check size={15} /></button>
                            <button onClick={cancelEdit} disabled={busy} title="ยกเลิก"
                              className="rounded-md p-1.5 text-muted hover:bg-soft disabled:opacity-40"><X size={15} /></button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => startEdit(u.sku)} disabled={busy} title="แก้ SKU"
                              className="rounded-md p-1.5 text-muted hover:bg-soft hover:text-ink disabled:opacity-40"><Pencil size={15} /></button>
                            <button onClick={() => del(u)} disabled={busy} title="ลบ SKU"
                              className="rounded-md p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"><Trash2 size={15} /></button>
                          </>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      </div>
    </div>
  );
}

/** ผูก SKU ให้ตรงยอด — โชว์ช่องว่างเท่ากับจำนวนที่ยังไม่มี SKU ให้ user กรอก/สแกน */
function ReconcilePanel({ product, size, qty, units, gap }: Reconcile) {
  const router = useRouter();
  const [slots, setSlots] = useState<string[]>(() => Array(Math.min(gap, 200)).fill(""));
  const [busy, setBusy] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const filled = [...new Set(slots.map((s) => s.trim()).filter(Boolean))];

  const setAt = (i: number, v: string) => setSlots((l) => l.map((x, k) => (k === i ? v : x)));
  const fillNext = (code: string) => {
    const s = code.trim(); if (!s) return;
    setSlots((l) => {
      if (l.some((x) => x.trim() === s)) return l;
      const idx = l.findIndex((x) => !x.trim());
      if (idx >= 0) { const c = [...l]; c[idx] = s; return c; }
      return [...l, s];
    });
  };
  async function save() {
    if (!filled.length) return;
    setBusy(true);
    const res = await assignUnitSkus(product, size, filled);
    setBusy(false);
    if (!res.ok) { alert(res.error || "ผูก SKU ไม่สำเร็จ"); return; }
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="flex items-center gap-1.5 text-sm font-semibold text-amber-800"><Wrench size={15} /> ผูก SKU ให้ตรงยอด — {product} {size}</p>
          <p className="mt-0.5 text-xs text-amber-700">สต๊อก <b>{qty}</b> · มี SKU แล้ว <b>{units}</b> · <b>ยังไม่ผูก SKU {gap} ชิ้น</b> — กรอก/สแกน SKU ลงช่องว่างด้านล่างเพื่อให้ตรง (ไม่เพิ่มยอด)</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setScanOpen(true)} className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-white px-2.5 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100"><Camera size={13} /> สแกน SKU</button>
          <button type="button" onClick={() => setSlots((l) => [...l, ""])} className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-white px-2.5 py-1.5 text-xs text-amber-800 hover:bg-amber-100"><Plus size={13} /> เพิ่มช่อง</button>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-4">
        {slots.map((s, i) => (
          <div key={i} className="flex items-center gap-1">
            <span className="w-5 shrink-0 text-right text-[11px] text-amber-700/70">{i + 1}</span>
            <input id={`rec-slot-${i}`} value={s} onChange={(e) => setAt(i, e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const nx = document.getElementById(`rec-slot-${i + 1}`) as HTMLInputElement | null; nx?.focus(); } }}
              className="input h-8 flex-1 bg-white font-mono text-xs" placeholder={`SKU #${i + 1}`} />
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-amber-700">กรอกแล้ว <b>{filled.length}</b>/{gap} ชิ้น</span>
        <button type="button" onClick={save} disabled={busy || !filled.length}
          className="rounded-lg bg-amber-600 px-3 py-2 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50">
          {busy ? "กำลังผูก…" : `ผูก SKU (${filled.length})`}
        </button>
      </div>
      {scanOpen && <CameraScan continuous title="สแกน SKU ให้ตรงยอด (ต่อเนื่อง)" hint="เล็ง SKU ของแต่ละชิ้น — เติมลงช่องว่างอัตโนมัติ" onClose={() => setScanOpen(false)} onScan={fillNext} />}
    </div>
  );
}
