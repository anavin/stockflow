"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { saveCatalogItem, deleteCatalogItem, saveBranch, deleteBranch, type CatalogInput, type BranchInput } from "@/lib/actions/wholesale";
import Combobox from "@/components/Combobox";
import { Plus, Pencil, Trash2, Check, X, CheckCircle2, Search } from "lucide-react";
import type { WholesaleCatalogRow, WholesaleBranchRow } from "@/lib/queries";

type Tab = "evb-cat" | "kp-cat" | "evb-branch";
const emptyCat: CatalogInput = { platform: "", product: "", size: "", barcode: "", code: "", item_name: "", grade: "", active: true };
const emptyBranch: BranchInput = { platform: "Eveandboy", branch: "", code: "", address: "", active: true };

export default function WholesaleManager({ catalog, branches, products, sizes, canEdit }: {
  catalog: Record<string, WholesaleCatalogRow[]>; branches: WholesaleBranchRow[]; products: string[]; sizes: string[]; canEdit: boolean;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("evb-cat");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(""); const [err, setErr] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [cf, setCf] = useState<CatalogInput>(emptyCat);
  const [bf, setBf] = useState<BranchInput>(emptyBranch);

  const platform = tab === "kp-cat" ? "KingPower" : "Eveandboy";
  const isBranch = tab === "evb-branch";
  const catRows = catalog[platform] || [];
  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase();
    if (isBranch) return branches.filter((b) => !t || `${b.branch} ${b.code ?? ""}`.toLowerCase().includes(t));
    return catRows.filter((r) => !t || `${r.product} ${r.size} ${r.code ?? ""} ${r.item_name ?? ""}`.toLowerCase().includes(t));
  }, [search, isBranch, branches, catRows]);

  function cancel() { setEditId(null); setAdding(false); setErr(""); }
  function startAdd() { setErr(""); setMsg(""); setEditId(null); setAdding(true); setCf({ ...emptyCat, platform }); setBf({ ...emptyBranch }); }
  function startEditCat(r: WholesaleCatalogRow) { setAdding(false); setEditId(r.id); setCf({ id: r.id, platform: r.platform, product: r.product, size: r.size, barcode: r.barcode ?? "", code: r.code ?? "", item_name: r.item_name ?? "", grade: r.grade ?? "", active: r.active }); }
  function startEditBranch(r: WholesaleBranchRow) { setAdding(false); setEditId(r.id); setBf({ id: r.id, platform: r.platform, branch: r.branch, code: r.code ?? "", address: r.address ?? "", active: r.active }); }

  async function saveCat() {
    setBusy(true); setErr(""); setMsg("");
    const res = await saveCatalogItem({ ...cf, platform });
    setBusy(false);
    if (!res.ok) { setErr(res.error || "บันทึกไม่สำเร็จ"); return; }
    setMsg("บันทึกแล้ว"); cancel(); router.refresh();
  }
  async function saveBr() {
    setBusy(true); setErr(""); setMsg("");
    const res = await saveBranch({ ...bf, platform: "Eveandboy" });
    setBusy(false);
    if (!res.ok) { setErr(res.error || "บันทึกไม่สำเร็จ"); return; }
    setMsg("บันทึกแล้ว"); cancel(); router.refresh();
  }
  async function del(kind: "cat" | "branch", id: number, label: string) {
    if (!confirm(`ลบ "${label}"?`)) return;
    setBusy(true);
    const res = kind === "cat" ? await deleteCatalogItem(id) : await deleteBranch(id);
    setBusy(false);
    if (!res.ok) { setErr(res.error || "ลบไม่สำเร็จ"); return; }
    router.refresh();
  }

  const TABS: { k: Tab; label: string }[] = [
    { k: "evb-cat", label: `Eveandboy สินค้า (${(catalog.Eveandboy || []).length})` },
    { k: "kp-cat", label: `King Power สินค้า (${(catalog.KingPower || []).length})` },
    { k: "evb-branch", label: `Eveandboy สาขา (${branches.length})` },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button key={t.k} type="button" onClick={() => { setTab(t.k); cancel(); }}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-medium ${tab === t.k ? "border-brand-300 bg-brand-50 text-brand-700" : "border-line bg-white text-muted hover:border-brand-200"}`}>{t.label}</button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-9" placeholder="ค้นหา…" />
        </div>
        {canEdit && <button type="button" className="btn-primary" onClick={startAdd}><Plus size={15} /> เพิ่ม{isBranch ? "สาขา" : "สินค้า"}</button>}
      </div>
      {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{err}</p>}
      {msg && <p className="flex items-center gap-1 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700"><CheckCircle2 size={14} /> {msg}</p>}

      {/* ฟอร์มเพิ่ม */}
      {adding && canEdit && (
        <div className="card border border-brand-200 p-4">
          <h3 className="mb-3 text-sm font-semibold text-ink">เพิ่ม{isBranch ? "สาขา Eveandboy" : `สินค้า ${platform}`}</h3>
          {isBranch ? <BranchFields f={bf} set={setBf} /> : <CatFields f={cf} set={setCf} products={products} sizes={sizes} />}
          <div className="mt-3 flex justify-end gap-2">
            <button type="button" onClick={cancel} className="btn-ghost">ยกเลิก</button>
            <button type="button" onClick={isBranch ? saveBr : saveCat} disabled={busy} className="btn-primary">{busy ? "กำลังบันทึก…" : "บันทึก"}</button>
          </div>
        </div>
      )}

      {/* ตาราง */}
      <div className="overflow-hidden rounded-xl border border-line bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-soft text-left text-xs text-muted">
              {isBranch ? (
                <tr><th className="w-px whitespace-nowrap px-3 py-3">สาขา</th><th className="w-px whitespace-nowrap px-3 py-3">รหัส</th><th className="px-3 py-3">ที่อยู่</th><th className="w-px whitespace-nowrap px-3 py-3">สถานะ</th>{canEdit && <th className="w-px whitespace-nowrap px-3 py-3 text-right">จัดการ</th>}</tr>
              ) : (
                <tr><th className="px-3 py-3">กลิ่น</th><th className="px-3 py-3">ขนาด</th><th className="px-3 py-3">Product Code</th><th className="px-3 py-3">Barcode</th><th className="px-3 py-3">ชื่อบนใบเบิก</th><th className="px-3 py-3">เกรด</th><th className="px-3 py-3">สถานะ</th>{canEdit && <th className="px-3 py-3 text-right">จัดการ</th>}</tr>
              )}
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={9} className="px-4 py-10 text-center text-muted">ไม่พบข้อมูล</td></tr>}
              {isBranch
                ? (filtered as WholesaleBranchRow[]).map((r) => editId === r.id && canEdit ? (
                    <tr key={r.id} className="border-t border-line bg-brand-50/40"><td colSpan={9} className="px-3 py-3"><BranchFields f={bf} set={setBf} /><RowActions busy={busy} onSave={saveBr} onCancel={cancel} /></td></tr>
                  ) : (
                    <tr key={r.id} className={`border-t border-line ${r.active ? "" : "opacity-50"}`}>
                      <td className="w-px whitespace-nowrap px-3 py-2.5 align-top font-medium text-ink">{r.branch}</td>
                      <td className="w-px whitespace-nowrap px-3 py-2.5 align-top font-mono text-xs">{r.code || "—"}</td>
                      <td className="px-3 py-2.5 align-top text-xs text-muted">{r.address || "—"}</td>
                      <td className="w-px whitespace-nowrap px-3 py-2.5 align-top">{r.active ? <span className="chip-ok">ใช้งาน</span> : <span className="chip-danger">ปิด</span>}</td>
                      {canEdit && <td className="w-px whitespace-nowrap px-3 py-2.5 text-right align-top"><RowBtns onEdit={() => startEditBranch(r)} onDel={() => del("branch", r.id, r.branch)} /></td>}
                    </tr>
                  ))
                : (filtered as WholesaleCatalogRow[]).map((r) => editId === r.id && canEdit ? (
                    <tr key={r.id} className="border-t border-line bg-brand-50/40"><td colSpan={9} className="px-3 py-3"><CatFields f={cf} set={setCf} products={products} sizes={sizes} /><RowActions busy={busy} onSave={saveCat} onCancel={cancel} /></td></tr>
                  ) : (
                    <tr key={r.id} className={`border-t border-line ${r.active ? "" : "opacity-50"}`}>
                      <td className="px-3 py-2.5 font-medium text-ink">{r.product}</td>
                      <td className="px-3 py-2.5">{r.size}</td>
                      <td className="px-3 py-2.5 font-mono text-xs">{r.code || "—"}</td>
                      <td className="px-3 py-2.5 font-mono text-xs">{r.barcode || "—"}</td>
                      <td className="px-3 py-2.5 max-w-[280px] truncate text-xs text-muted" title={r.item_name || ""}>{r.item_name || "—"}</td>
                      <td className="px-3 py-2.5 text-xs">{r.grade || "—"}</td>
                      <td className="px-3 py-2.5">{r.active ? <span className="chip-ok">ใช้งาน</span> : <span className="chip-danger">ปิด</span>}</td>
                      {canEdit && <td className="px-3 py-2.5 text-right"><RowBtns onEdit={() => startEditCat(r)} onDel={() => del("cat", r.id, `${r.product} ${r.size}`)} /></td>}
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── field groups (module-level — กัน remount ตอนพิมพ์) ──
function CatFields({ f, set, products, sizes }: { f: CatalogInput; set: (v: CatalogInput) => void; products: string[]; sizes: string[] }) {
  const u = (p: Partial<CatalogInput>) => set({ ...f, ...p });
  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
      <div><label className="label">กลิ่น (จับกับระบบ) <span className="text-brand">*</span></label><Combobox value={f.product ?? ""} options={products} onChange={(v) => u({ product: v })} placeholder="เลือก/พิมพ์กลิ่น" /></div>
      <div><label className="label">ขนาด <span className="text-brand">*</span></label><Combobox value={f.size ?? ""} options={sizes} onChange={(v) => u({ size: v })} placeholder="เช่น 50 ml" /></div>
      <div><label className="label">เกรด (คู่ค้า)</label><input className="input h-9" value={f.grade ?? ""} onChange={(e) => u({ grade: e.target.value })} placeholder="EDP / LE PARFUM…" /></div>
      <div><label className="label">Product Code (รหัสคู่ค้า)</label><input className="input h-9 font-mono" value={f.code ?? ""} onChange={(e) => u({ code: e.target.value })} placeholder="ARTICLE" /></div>
      <div><label className="label">Barcode</label><input className="input h-9 font-mono" value={f.barcode ?? ""} onChange={(e) => u({ barcode: e.target.value })} /></div>
      <div className="flex items-end gap-2"><label className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={f.active !== false} onChange={(e) => u({ active: e.target.checked })} className="h-4 w-4 accent-brand" /> ใช้งาน</label></div>
      <div className="col-span-2 md:col-span-3"><label className="label">ชื่อบนใบเบิก/ใบส่งของ</label><input className="input h-9" value={f.item_name ?? ""} onChange={(e) => u({ item_name: e.target.value })} placeholder="ว่าง = ใช้ชื่อกลิ่น" /></div>
    </div>
  );
}
function BranchFields({ f, set }: { f: BranchInput; set: (v: BranchInput) => void }) {
  const u = (p: Partial<BranchInput>) => set({ ...f, ...p });
  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
      <div className="md:col-span-2"><label className="label">สาขา <span className="text-brand">*</span></label><input className="input h-9" value={f.branch ?? ""} onChange={(e) => u({ branch: e.target.value })} /></div>
      <div><label className="label">รหัสสาขา</label><input className="input h-9 font-mono" value={f.code ?? ""} onChange={(e) => u({ code: e.target.value })} /></div>
      <div className="flex items-end gap-2"><label className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={f.active !== false} onChange={(e) => u({ active: e.target.checked })} className="h-4 w-4 accent-brand" /> ใช้งาน</label></div>
      <div className="col-span-2 md:col-span-4"><label className="label">ที่อยู่ (โชว์บนใบส่งของ)</label><input className="input h-9" value={f.address ?? ""} onChange={(e) => u({ address: e.target.value })} /></div>
    </div>
  );
}
function RowActions({ busy, onSave, onCancel }: { busy: boolean; onSave: () => void; onCancel: () => void }) {
  return <div className="mt-3 flex justify-end gap-2"><button type="button" onClick={onCancel} className="btn-ghost"><X size={14} /> ยกเลิก</button><button type="button" onClick={onSave} disabled={busy} className="btn-primary"><Check size={14} /> {busy ? "…" : "บันทึก"}</button></div>;
}
function RowBtns({ onEdit, onDel }: { onEdit: () => void; onDel: () => void }) {
  return <div className="inline-flex gap-1"><button type="button" onClick={onEdit} className="rounded-md p-1.5 text-muted hover:bg-soft hover:text-ink" title="แก้ไข"><Pencil size={15} /></button><button type="button" onClick={onDel} className="rounded-md p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600" title="ลบ"><Trash2 size={15} /></button></div>;
}
