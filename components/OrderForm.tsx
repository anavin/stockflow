"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Combobox from "./Combobox";
import DatePicker from "./DatePicker";
import CustomerSuggest from "./CustomerSuggest";
import ItemsEditor, { emptyItem, itemErrorOf, hasItemError, type ItemDraft, type ItemError } from "./ItemsEditor";
import type { CustomerSuggestion } from "@/lib/actions/orders";
import { saveOrder, orderExists, type OrderInput } from "@/lib/actions/orders";
import { CUSTOMER_TYPES } from "@/lib/config";
import type { OrderWithItems } from "@/lib/types";
import type { PostcodeRow } from "@/lib/queries";
import { Save, Printer, CheckCircle2, AlertTriangle } from "lucide-react";

// เบอร์โทร: เก็บเฉพาะตัวเลข + - เว้นวรรค (กันพิมพ์ตัวอักษร)
const cleanPhone = (v: string) => v.replace(/[^0-9\-+ ]/g, "");
const cleanOrderNo = (v: string) => v.replace(/\s+/g, "").toUpperCase();

type Props = {
  products: string[];
  sizes: string[];
  provinces: string[];
  postcodes: PostcodeRow[];
  initial?: OrderWithItems | null;
};

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function OrderForm({ products, sizes, provinces, postcodes, initial }: Props) {
  const router = useRouter();
  const editing = !!initial;

  const [f, setF] = useState({
    order_no: initial?.order_no ?? "",
    doc_no: initial?.doc_no ?? "",
    doc_date: initial?.doc_date ?? todayStr(),
    channel: initial?.channel ?? "Shopee",
    shop_name: initial?.shop_name ?? "",
    username: initial?.username ?? "",
    receiver: initial?.receiver ?? "",
    phone: initial?.phone ?? "",
    customer_type: initial?.customer_type ?? "",
    purchase_count: initial?.purchase_count?.toString() ?? "",
    province: initial?.province ?? "",
    district: initial?.district ?? "",
    postcode: initial?.postcode ?? "",
    address: initial?.address ?? "",
    campaign: initial?.campaign ?? "",
    note: initial?.note ?? "",
    box_scent: initial?.box_scent ?? "",
    order_date: initial?.order_date ?? "",
  });

  const [items, setItems] = useState<ItemDraft[]>(
    initial?.items?.length
      ? initial.items.map((it) => ({ product: it.product, size: it.size, is_free: it.is_free, qty: it.qty, unit: it.unit, sku: it.sku ?? "" }))
      : [emptyItem()],
  );

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [savedMsg, setSavedMsg] = useState("");
  const [itemErrors, setItemErrors] = useState<ItemError[]>([]);
  const [fieldErrors, setFieldErrors] = useState<{ receiver?: boolean; province?: boolean; address?: boolean }>({});
  const [dupWarn, setDupWarn] = useState("");     // Order No. ซ้ำ (create mode)
  const [dirty, setDirty] = useState(false);

  const set = (patch: Partial<typeof f>) => { setF((prev) => ({ ...prev, ...patch })); setDirty(true); };

  // เตือนก่อนออกจากหน้าถ้ายังไม่ได้บันทึก (ปิดแท็บ / refresh)
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  // ตรวจ Order No. ซ้ำ (เฉพาะตอนสร้างใหม่)
  async function checkDup(v: string) {
    if (editing || !v.trim()) { setDupWarn(""); return; }
    const res = await orderExists(v);
    setDupWarn(res.exists ? `⚠ Order No. นี้มีอยู่แล้ว (${res.deleted ? "อยู่ในถังขยะ" : res.doc_no || "-"}) — การบันทึกจะเขียนทับของเดิม` : "");
  }

  // แก้ไขรายการ = ล้างไฮไลต์ error (จะ validate ใหม่ตอนกดบันทึก)
  function onItemsChange(next: ItemDraft[]) {
    setItems(next);
    setDirty(true);
    if (itemErrors.length) setItemErrors([]);
  }

  // เลือกลูกค้าเดิม → เติมที่อยู่ + ตั้ง "ลูกค้าเก่า" + "ซื้อครั้งที่" + รายการที่เคยซื้อ อัตโนมัติ
  function fillFromCustomer(c: CustomerSuggestion) {
    setDirty(true);
    setF((prev) => ({
      ...prev,
      receiver: c.receiver ?? prev.receiver,
      phone: c.phone ?? prev.phone,
      username: c.username ?? prev.username,
      province: c.province ?? prev.province,
      district: c.district ?? prev.district,
      postcode: c.postcode ?? prev.postcode,
      address: c.address ?? prev.address,
      customer_type: "ลูกค้าเก่า",
      purchase_count: String((c.total_orders || 0) + 1),
    }));

    // เติมรายการที่เคยซื้อ (เฉพาะตอนตารางยังว่าง เพื่อไม่ทับของที่กรอกไว้)
    const isEmptyItems = items.every((it) => !it.product.trim());
    if (c.past_items && c.past_items.length > 0 && isEmptyItems) {
      setItemErrors([]);
      setItems(
        c.past_items.map((p) => ({
          product: p.product,
          size: p.size ?? "",
          is_free: !!p.is_free,
          qty: Number(p.qty) > 0 ? Number(p.qty) : 1,
          unit: "ขวด",
          sku: "",
        })),
      );
    }
  }

  // province → district options
  const districts = useMemo(() => {
    if (!f.province) return [];
    return Array.from(new Set(postcodes.filter((p) => p.province === f.province).map((p) => p.district)));
  }, [postcodes, f.province]);

  function onProvince(v: string) {
    set({ province: v, district: "", postcode: "" });
  }
  function onDistrict(v: string) {
    const match = postcodes.find((p) => p.province === f.province && p.district === v);
    set({ district: v, postcode: match?.postcode ?? f.postcode });
  }

  async function onSave(thenPrint = false) {
    setError("");
    if (!f.order_no.trim()) { setError("กรุณากรอก Order No."); return; }

    // บังคับช่องจำเป็นสำหรับจัดส่ง — ผู้รับ / จังหวัด / ที่อยู่
    const fErr = { receiver: !f.receiver.trim(), province: !f.province.trim(), address: !f.address.trim() };
    if (fErr.receiver || fErr.province || fErr.address) {
      setFieldErrors(fErr);
      const miss = [fErr.receiver && "ผู้รับ", fErr.province && "จังหวัด", fErr.address && "ที่อยู่"].filter(Boolean).join(" / ");
      setError(`กรุณากรอกข้อมูลจัดส่งให้ครบ: ${miss} (ดูช่องสีแดง)`);
      return;
    }
    setFieldErrors({});

    if (items.length === 0) { setError("กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ"); return; }

    // ทุกบรรทัดต้องกรอกครบ (กลิ่น + ขนาด + จำนวน) — ไฮไลต์ช่องที่ยังไม่ครบ
    const errs = items.map(itemErrorOf);
    if (errs.some(hasItemError)) {
      setItemErrors(errs);
      setError("กรุณากรอกรายการสินค้าให้ครบทุกช่อง (ดูช่องสีแดง)");
      return;
    }
    setItemErrors([]);

    // เตือน Order No. ซ้ำ (สร้างใหม่) — ยืนยันก่อนเขียนทับ
    if (!editing) {
      const dup = await orderExists(f.order_no);
      if (dup.exists && !window.confirm(`Order No. "${f.order_no}" มีอยู่แล้วในระบบ (${dup.deleted ? "ในถังขยะ" : dup.doc_no || "-"})\nบันทึกต่อจะเขียนทับข้อมูลเดิม — ต้องการดำเนินการต่อหรือไม่?`)) {
        return;
      }
    }

    setBusy(true);
    const payload: OrderInput = {
      ...f,
      purchase_count: f.purchase_count ? Number(f.purchase_count) : null,
      items: items.map((it) => ({
        product: it.product, size: it.size, is_free: it.is_free, qty: it.qty, unit: it.unit, sku: it.sku || null,
      })),
    };
    const res = await saveOrder(payload);
    if (!res.ok) { setBusy(false); setError(res.error || "บันทึกไม่สำเร็จ"); return; }
    setDirty(false);   // บันทึกแล้ว → ไม่ต้องเตือนตอนออก
    setSavedMsg(`บันทึกแล้ว ✓ (${res.doc_no || res.order_no})`);
    if (thenPrint) {
      window.open(`/api/print/${encodeURIComponent(res.order_no!)}`, "_blank");
    }
    setTimeout(() => { router.push("/shopee"); router.refresh(); }, 700);
  }

  return (
    <div className="space-y-6">
      {savedMsg && <div className="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-sm font-medium text-green-700"><CheckCircle2 size={16} /> {savedMsg}</div>}
      {error && <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600"><AlertTriangle size={16} /> {error}</div>}

      {/* header / customer */}
      <section className="card p-5">
        <h2 className="mb-4 text-sm font-semibold text-ink">ข้อมูลใบเบิก</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="label">Order No. <span className="text-brand">*</span> <span className="text-faint">(คีย์หลัก)</span></label>
            <input className={`input font-mono ${dupWarn ? "border-amber-400 ring-2 ring-amber-100" : ""}`} value={f.order_no} disabled={editing}
              onChange={(e) => { set({ order_no: cleanOrderNo(e.target.value) }); setDupWarn(""); }}
              onBlur={(e) => checkDup(e.target.value)} placeholder="เช่น 250430MMF62DBV" />
            {dupWarn && <div className="mt-1 text-[11px] text-amber-600">{dupWarn}</div>}
          </div>
          <div>
            <label className="label">เลขที่ใบเบิก</label>
            <input className="input font-mono" value={f.doc_no} onChange={(e) => set({ doc_no: e.target.value })}
              placeholder="ออกอัตโนมัติเมื่อบันทึก (SH-YY-MM-DD-####)" />
          </div>
          <div>
            <label className="label">วันที่</label>
            <DatePicker value={f.doc_date} onChange={(v) => set({ doc_date: v })} />
          </div>
          <div>
            <label className="label">Channel</label>
            <input className="input" value={f.channel} onChange={(e) => set({ channel: e.target.value })} />
          </div>
          <div>
            <label className="label">ชื่อลูกค้า / ร้าน</label>
            <input className="input" value={f.shop_name} onChange={(e) => set({ shop_name: e.target.value })} />
          </div>
          <div>
            <label className="label">ชื่อผู้ใช้ (Shopee)</label>
            <CustomerSuggest value={f.username} onChange={(v) => set({ username: v })} onPick={fillFromCustomer} placeholder="พิมพ์ชื่อผู้ใช้ / ชื่อ / กลิ่นที่เคยซื้อ" />
          </div>
        </div>
      </section>

      {/* recipient */}
      <section className="card p-5">
        <h2 className="mb-4 text-sm font-semibold text-ink">ผู้รับ & ที่อยู่จัดส่ง</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="label">ชื่อผู้รับ <span className="text-brand">*</span></label>
            <CustomerSuggest value={f.receiver} onChange={(v) => set({ receiver: v })} onPick={fillFromCustomer} placeholder="พิมพ์เพื่อค้นหาลูกค้าเดิม" invalid={fieldErrors.receiver} />
          </div>
          <div>
            <label className="label">เบอร์โทร</label>
            <CustomerSuggest value={f.phone} onChange={(v) => set({ phone: cleanPhone(v) })} onPick={fillFromCustomer} placeholder="พิมพ์เบอร์เพื่อค้นหา" type="tel" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">ลูกค้า</label>
              <Combobox value={f.customer_type} allowCustom={false} placeholder="เลือก" options={[...CUSTOMER_TYPES]}
                onChange={(v) => set({ customer_type: v, ...(v === "ลูกค้าใหม่" ? { purchase_count: "1" } : {}) })} />
            </div>
            <div>
              <label className="label">ซื้อครั้งที่</label>
              <input type="number" min={0} inputMode="numeric"
                className="input disabled:bg-soft disabled:text-faint disabled:cursor-not-allowed"
                value={f.customer_type === "ลูกค้าใหม่" ? "1" : f.purchase_count}
                disabled={f.customer_type === "ลูกค้าใหม่"}
                onChange={(e) => set({ purchase_count: e.target.value })}
                placeholder="เช่น 1, 25, 100" />
            </div>
          </div>
          <div>
            <label className="label">จังหวัด <span className="text-brand">*</span></label>
            <Combobox value={f.province} onChange={onProvince} options={provinces} placeholder="เลือกจังหวัด" invalid={fieldErrors.province} />
          </div>
          <div>
            <label className="label">อำเภอ / เขต</label>
            <Combobox value={f.district} onChange={onDistrict} options={districts} placeholder={f.province ? "เลือกอำเภอ/เขต" : "เลือกจังหวัดก่อน"} disabled={!f.province} />
          </div>
          <div>
            <label className="label">รหัสไปรษณีย์</label>
            <input className="input" value={f.postcode} onChange={(e) => set({ postcode: e.target.value })} placeholder="อัตโนมัติจากอำเภอ" />
          </div>
          <div className="md:col-span-3">
            <label className="label">ที่อยู่ (บ้านเลขที่ / ถนน / รายละเอียด) <span className="text-brand">*</span></label>
            <textarea className={`input min-h-[64px] ${fieldErrors.address ? "border-red-400 ring-2 ring-red-100" : ""}`} value={f.address} onChange={(e) => set({ address: e.target.value })} />
          </div>
        </div>
      </section>

      {/* items */}
      <section className="card p-5">
        <h2 className="mb-4 text-sm font-semibold text-ink">รายการสินค้า</h2>
        <ItemsEditor items={items} onChange={onItemsChange} products={products} sizes={sizes} errors={itemErrors} />
      </section>

      {/* extras */}
      <section className="card p-5">
        <h2 className="mb-4 text-sm font-semibold text-ink">รายละเอียดเพิ่มเติม</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="label">Campaign</label>
            <input className="input" value={f.campaign} onChange={(e) => set({ campaign: e.target.value })} />
          </div>
          <div>
            <label className="label">ฉีดกลิ่นลงในกล่อง</label>
            <Combobox value={f.box_scent} onChange={(v) => set({ box_scent: v })} options={products} placeholder="เลือกกลิ่น (ถ้ามี)" />
          </div>
          <div>
            <label className="label">วันที่ทำการสั่งซื้อ</label>
            <DatePicker value={f.order_date} onChange={(v) => set({ order_date: v })} />
          </div>
          <div className="md:col-span-3">
            <label className="label">หมายเหตุ (Note)</label>
            <textarea className="input min-h-[56px]" value={f.note} onChange={(e) => set({ note: e.target.value })} />
          </div>
        </div>
      </section>

      <div className="sticky bottom-0 flex flex-wrap gap-3 border-t border-line bg-[#faf9f7]/90 py-4 backdrop-blur">
        <button className="btn-primary" disabled={busy} onClick={() => onSave(false)}>
          <Save size={16} /> {busy ? "กำลังบันทึก…" : "บันทึก"}
        </button>
        <button className="btn-ghost" disabled={busy} onClick={() => onSave(true)}>
          <Printer size={16} /> บันทึก & พิมพ์
        </button>
        <button className="btn-ghost ml-auto" disabled={busy}
          onClick={() => { if (!dirty || window.confirm("ยังไม่ได้บันทึก — ต้องการออกจากหน้านี้?")) router.push("/shopee"); }}>ยกเลิก</button>
      </div>
    </div>
  );
}
