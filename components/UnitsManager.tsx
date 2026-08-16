"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updateUnitSku, deleteUnit } from "@/lib/actions/stock";
import type { UnitRow } from "@/lib/queries";
import { Pencil, Trash2, Check, X } from "lucide-react";

const statusChip = (s: string) => s === "issued"
  ? { label: "ตัดออกแล้ว", cls: "bg-soft text-muted" }
  : s === "void" ? { label: "ยกเลิก", cls: "bg-red-50 text-red-600" }
  : { label: "อยู่คลัง", cls: "bg-green-50 text-green-700" };

export default function UnitsManager({ units, canEdit }: { units: UnitRow[]; canEdit: boolean }) {
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
    <div className="overflow-hidden rounded-xl border border-line bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-soft text-left text-xs text-muted">
            <tr>
              <th className="px-4 py-3">Barcode</th>
              <th className="px-3 py-3">SKU</th>
              <th className="px-3 py-3">รายชื่อ</th>
              <th className="px-3 py-3">Type</th>
              <th className="px-3 py-3">วันที่รับเข้า</th>
              <th className="px-3 py-3">สถานะ</th>
              <th className="px-3 py-3">ออเดอร์ / ผู้ซื้อ</th>
              {canEdit && <th className="px-3 py-3 text-right">จัดการ</th>}
            </tr>
          </thead>
          <tbody>
            {units.length === 0 && <tr><td colSpan={cols} className="px-4 py-12 text-center text-muted">ไม่พบ SKU — ลองรับเข้าสต๊อกเพื่อบันทึก SKU หรือรัน SQL ตาราง stock_unit</td></tr>}
            {units.map((u) => {
              const st = statusChip(u.status);
              const editing = editSku === u.sku;
              return (
                <tr key={u.sku} className="border-t border-line hover:bg-soft/40">
                  <td className="px-4 py-2.5 font-mono text-xs text-muted">{u.barcode || "—"}</td>
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
                        {editing ? (
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
  );
}
