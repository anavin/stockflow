"use client";
import Combobox from "./Combobox";
import { Trash2, Plus, Gift, AlertTriangle, ShoppingBag } from "lucide-react";
import { buildProductLabel } from "@/lib/types";
import { FREE_ALLOWED_SIZES, isAllowedFreeSize } from "@/lib/config";

// ถุงกระดาษ = สินค้าแถมพิเศษ (เลือกขนาด Size S/M ตอนแพ็ก) — ไม่ติดกฎขนาดของแถม (1.2/4/10 ml)
export const BAG_PRODUCT = "ถุงกระดาษ";
const BAG_SIZES = ["Size S", "Size M"];
export const isBagProduct = (p: string) => /ถุง/.test(p || "");

// จำนวน dropdown options (1–30). ครอบคลุมการใช้งานปกติ; แก้เพิ่มได้ที่นี่
const QTY_OPTIONS = Array.from({ length: 30 }, (_, i) => i + 1);

function QtySelect({ value, onChange, invalid }: { value: number; onChange: (v: number) => void; invalid?: boolean }) {
  const inList = QTY_OPTIONS.includes(value);
  return (
    <select className={`input ${invalid ? "border-red-400 ring-2 ring-red-100" : ""}`} value={value} onChange={(e) => onChange(Number(e.target.value))}>
      {!inList && <option value={value}>{value}</option>}
      {QTY_OPTIONS.map((n) => (
        <option key={n} value={n}>{n}</option>
      ))}
    </select>
  );
}

export type ItemDraft = {
  product: string;
  size: string;
  is_free: boolean;
  qty: number;
  unit: string;
  sku: string;
};

export type ItemError = { product?: boolean; size?: boolean; qty?: boolean };

/** Which required fields are missing on an item (empty = complete). */
export function itemErrorOf(it: ItemDraft): ItemError {
  const e: ItemError = {};
  if (!it.product.trim()) e.product = true;
  if (!isBagProduct(it.product) && !it.size.trim()) e.size = true;   // ถุงกระดาษ ไม่บังคับขนาด
  if (!(Number(it.qty) > 0)) e.qty = true;
  return e;
}
export function hasItemError(e: ItemError): boolean {
  return !!(e.product || e.size || e.qty);
}

export function emptyItem(): ItemDraft {
  return { product: "", size: "", is_free: false, qty: 1, unit: "ขวด", sku: "" };
}

export default function ItemsEditor({
  items,
  onChange,
  products,
  sizes,
  errors = [],
  productCodes,
  productTypes,
  discontinued,
}: {
  items: ItemDraft[];
  onChange: (items: ItemDraft[]) => void;
  products: string[];
  sizes: string[];
  errors?: ItemError[];
  productCodes?: Record<string, string>;
  productTypes?: Record<string, string>;
  discontinued?: Record<string, string[]>;
}) {
  const normKey = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9ก-๙]/g, "");
  const errMsg = (e?: ItemError) => {
    if (!e) return "";
    const miss: string[] = [];
    if (e.product) miss.push("กลิ่น");
    if (e.size) miss.push("ขนาด");
    if (e.qty) miss.push("จำนวน");
    return miss.length ? `ต้องกรอก: ${miss.join(" / ")}` : "";
  };
  function update(i: number, patch: Partial<ItemDraft>) {
    onChange(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }
  function remove(i: number) {
    onChange(items.filter((_, idx) => idx !== i));
  }
  function add() {
    onChange([...items, emptyItem()]);
  }
  function addFree() {
    onChange([...items, { ...emptyItem(), is_free: true }]);
  }
  function addBag() {
    onChange([...items, { product: BAG_PRODUCT, size: "", is_free: true, qty: 1, unit: "ใบ", sku: "" }]);
  }
  // ปกติ: ขนาดใหญ่ก่อน (30/50/90/100) แล้วค่อยขนาดเล็ก
  const SIZE_ORDER = ["30 ml", "50 ml", "90 ml", "100 ml", "1.2 ml", "4 ml", "10 ml"];
  const rank = (sz: string) => { const i = SIZE_ORDER.indexOf(sz); return i < 0 ? 99 : i; };
  const sizesNormal = [...sizes].sort((a, b) => rank(a) - rank(b));
  // ตัดขนาดที่ "เลิกผลิต" ของกลิ่นนั้นออกจากตัวเลือก
  const sizeOptionsFor = (it: ItemDraft) => {
    const base = isBagProduct(it.product) ? BAG_SIZES : (it.is_free ? sizesFree : sizesNormal);
    const blocked = discontinued?.[normKey(it.product)];
    return blocked?.length ? base.filter((sz) => !blocked.includes(normKey(sz))) : base;
  };
  // ของแถมเลือกได้เฉพาะขนาดเล็ก
  const sizesFree = sizes.filter((sz) => FREE_ALLOWED_SIZES.includes(sz));
  function setFree(i: number, checked: boolean) {
    const it = items[i];
    if (isBagProduct(it.product)) { update(i, { is_free: true }); return; }   // ถุงกระดาษ = ฟรีเสมอ (ปลดไม่ได้)
    const patch: Partial<ItemDraft> = { is_free: checked };
    if (checked && !isAllowedFreeSize(it.size)) patch.size = ""; // ล้างไซต์ใหญ่ที่เป็นของแถมไม่ได้
    update(i, patch);
  }
  // เปลี่ยนกลิ่น → ถ้าเป็นถุงกระดาษ ให้ติ๊กฟรีอัตโนมัติ
  const setProduct = (i: number, v: string) => update(i, { product: v, ...(isBagProduct(v) ? { is_free: true } : {}) });
  // จำนวน > 30 = ของแถมไม่ได้ (ปิดปุ่ม Free + ยกเลิกถ้าติ๊กไว้)
  const FREE_MAX_QTY = 30;
  function setQty(i: number, v: number) {
    const it = items[i];
    update(i, { qty: v, ...(v > FREE_MAX_QTY && it.is_free ? { is_free: false } : {}) });
  }
  // ปิดปุ่ม Free เมื่อ: ขนาดใหญ่ (ไม่ใช่ 1.2/4/10 ml) หรือ จำนวนเกิน 30
  // (ถ้าติ๊ก Free ไว้แล้ว ไม่ปิด เพื่อให้ยกเลิกได้)
  const freeDisabled = (it: ItemDraft) =>
    isBagProduct(it.product) ||   // ถุงกระดาษ = ฟรีเสมอ (ล็อก ปลดไม่ได้)
    (!it.is_free && (it.qty > FREE_MAX_QTY || (!!it.size.trim() && !isAllowedFreeSize(it.size))));
  const freeReason = (it: ItemDraft) =>
    isBagProduct(it.product) ? "ถุงกระดาษเป็นของแถม (ฟรี) เสมอ"
      : it.qty > FREE_MAX_QTY ? "จำนวนเกิน 30 เป็นของแถมไม่ได้"
      : (!!it.size.trim() && !isAllowedFreeSize(it.size)) ? "ขนาดใหญ่กว่า 10 ml เป็นของแถมไม่ได้ (ได้เฉพาะ 1.2/4/10 ml)"
      : "";

  return (
    <div>
      {/* desktop table */}
      <div className="hidden overflow-hidden rounded-xl border border-line md:block">
        <table className="w-full text-sm">
          <thead className="bg-soft text-left text-xs text-muted">
            <tr>
              <th className="w-10 px-3 py-2">#</th>
              <th className="px-3 py-2">รายการ EDP</th>
              <th className="w-32 px-3 py-2">ขนาด</th>
              <th className="w-24 px-3 py-2">จำนวน</th>
              <th className="w-20 px-3 py-2">Free</th>
              <th className="w-24 px-3 py-2">หน่วย</th>
              <th className="px-3 py-2">ชื่อสินค้า (auto)</th>
              <th className="w-12 px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={i} className={`border-t border-line align-top ${it.is_free ? "bg-brand-50/50" : ""}`}>
                <td className="px-3 py-2 text-muted">{i + 1}</td>
                <td className="px-3 py-2">
                  <Combobox value={it.product} onChange={(v) => setProduct(i, v)} options={products} placeholder="เลือกกลิ่น" invalid={errors[i]?.product} codes={productCodes} />
                  {productTypes?.[it.product] && <div className="mt-1 text-[11px] text-muted">Grade: <span className="font-medium text-ink">{productTypes[it.product]}</span></div>}
                  {errMsg(errors[i]) && (
                    <div className="mt-1 flex items-center gap-1 text-[11px] text-red-600"><AlertTriangle size={12} /> {errMsg(errors[i])}</div>
                  )}
                </td>
                <td className="px-3 py-2">
                  <Combobox value={it.size} onChange={(v) => update(i, { size: v })}
                    options={sizeOptionsFor(it)}
                    allowCustom={!it.is_free && !isBagProduct(it.product)} placeholder={isBagProduct(it.product) ? "ขนาดถุง (ถ้ามี)" : "ขนาด"} invalid={errors[i]?.size} />
                  {!isBagProduct(it.product) && it.is_free && it.size && !isAllowedFreeSize(it.size) && (
                    <div className="mt-1 flex items-center gap-1 text-[11px] text-red-600">
                      <AlertTriangle size={12} /> ของแถมได้เฉพาะ 1.2/4/10 ml
                    </div>
                  )}
                </td>
                <td className="px-3 py-2">
                  <QtySelect value={it.qty} onChange={(v) => setQty(i, v)} invalid={errors[i]?.qty} />
                </td>
                <td className="px-3 py-2 text-center">
                  <input type="checkbox" className="h-4 w-4 accent-brand disabled:cursor-not-allowed" checked={it.is_free || isBagProduct(it.product)}
                    disabled={freeDisabled(it)}
                    title={freeReason(it)}
                    onChange={(e) => setFree(i, e.target.checked)} />
                </td>
                <td className="px-3 py-2">
                  <input className="input" value={it.unit} onChange={(e) => update(i, { unit: e.target.value })} />
                </td>
                <td className="px-3 py-2 text-xs text-muted">{it.product ? buildProductLabel(it.product, it.size, it.is_free) : "—"}</td>
                <td className="px-3 py-2 text-center">
                  <button type="button" className="text-faint hover:text-red-600" onClick={() => remove(i)} disabled={items.length === 1}>
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* mobile cards */}
      <div className="space-y-3 md:hidden">
        {items.map((it, i) => (
          <div key={i} className="card space-y-2 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted">รายการ #{i + 1}</span>
              <button type="button" className="text-faint hover:text-red-600" onClick={() => remove(i)} disabled={items.length === 1}>
                <Trash2 size={16} />
              </button>
            </div>
            <Combobox value={it.product} onChange={(v) => setProduct(i, v)} options={products} placeholder="เลือกกลิ่น" invalid={errors[i]?.product} codes={productCodes} />
            {productTypes?.[it.product] && <div className="text-[11px] text-muted">Grade: <span className="font-medium text-ink">{productTypes[it.product]}</span></div>}
            <div className="grid grid-cols-2 gap-2">
              <Combobox value={it.size} onChange={(v) => update(i, { size: v })}
                options={sizeOptionsFor(it)}
                allowCustom={!it.is_free && !isBagProduct(it.product)} placeholder={isBagProduct(it.product) ? "ขนาดถุง (ถ้ามี)" : "ขนาด"} invalid={errors[i]?.size} />
              <QtySelect value={it.qty} onChange={(v) => setQty(i, v)} invalid={errors[i]?.qty} />
            </div>
            {errMsg(errors[i]) && (
              <div className="flex items-center gap-1 text-xs text-red-600"><AlertTriangle size={12} /> {errMsg(errors[i])}</div>
            )}
            {!isBagProduct(it.product) && it.is_free && it.size && !isAllowedFreeSize(it.size) && (
              <div className="flex items-center gap-1 text-xs text-red-600"><AlertTriangle size={12} /> ของแถมได้เฉพาะ 1.2/4/10 ml</div>
            )}
            <label className={`flex items-center gap-2 text-sm ${freeDisabled(it) ? "text-faint" : "text-muted"}`}>
              <input type="checkbox" className="h-4 w-4 accent-brand" checked={it.is_free || isBagProduct(it.product)}
                disabled={freeDisabled(it)} onChange={(e) => setFree(i, e.target.checked)} />
              {isBagProduct(it.product) ? "ถุงกระดาษ — ของแถม (Free) เสมอ" : `ของแถม (Free) — เฉพาะ 1.2/4/10 ml${freeDisabled(it) ? ` (${freeReason(it)})` : ""}`}
            </label>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="btn-ghost" onClick={add}><Plus size={16} /> เพิ่มรายการ</button>
        <button type="button" className="btn-ghost border-brand-200 text-brand-600 hover:bg-brand-50" onClick={addFree}>
          <Gift size={16} /> เพิ่มของแถม (Free)
        </button>
        <button type="button" className="btn-ghost border-amber-200 text-amber-700 hover:bg-amber-50" onClick={addBag}>
          <ShoppingBag size={16} /> แถมถุง
        </button>
      </div>
    </div>
  );
}
