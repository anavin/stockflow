"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Combobox from "./Combobox";
import CustomerSuggest from "./CustomerSuggest";
import DatePicker from "./DatePicker";
import CustomerHistoryCard from "./CustomerHistoryCard";
import PostcodeSearch from "./PostcodeSearch";
import type { PostcodeHit } from "@/lib/actions/orders";
import ItemsEditor, { emptyItem, itemErrorOf, hasItemError, type ItemDraft, type ItemError } from "./ItemsEditor";
import type { CustomerSuggestion, CustomerHistory, PastOrder } from "@/lib/actions/orders";
import { saveOrder, orderExists, customerHistory, type OrderInput } from "@/lib/actions/orders";
import { CUSTOMER_TYPES, platformColor, isWholesalePlatform, platformName } from "@/lib/config";
import { EVEANDBOY_BRANCHES, EVEANDBOY_SIZES_BY_SCENT } from "@/lib/eveandboy-data";
import { KINGPOWER_SIZES_BY_SCENT } from "@/lib/kingpower-data";
import type { OrderWithItems } from "@/lib/types";
import type { PostcodeRow } from "@/lib/queries";
import { Save, Printer, CheckCircle2, AlertTriangle, History, Check, Wallet, Truck, MapPin } from "lucide-react";

// เบอร์โทร: เก็บเฉพาะตัวเลข + - เว้นวรรค (กันพิมพ์ตัวอักษร)
const cleanPhone = (v: string) => v.replace(/[^0-9\-+ ]/g, "");
// ตัวเลือกสำหรับใบเบิก Office (ร้านขาย/จัดส่งเอง)
const PAYMENT_METHODS = ["Cash", "K Shop", "K Shop Credit Card", "Omise"];
const CARRIERS = ["ไปรษณีย์ไทย", "Flash Express", "J&T Express", "Kerry", "Shopee Express", "Lalamove", "Grab", "รับเอง"];
// สาขาปลายทางต่อช่องค้าส่ง (พิมพ์เพิ่มเองได้) — เพิ่มรายการจริงภายหลังได้
const BRANCHES: Record<string, string[]> = {
  CTW: ["01_CTW - Central World"],
  Eveandboy: EVEANDBOY_BRANCHES.map((b) => b.branch),
  KingPower: [],
};
const cleanMoney = (v: string) => v.replace(/[^0-9.]/g, "");
const cleanOrderNo = (v: string) => v.replace(/\s+/g, "").toUpperCase();

type Props = {
  platform?: string;
  products: string[];
  sizes: string[];
  provinces: string[];
  postcodes: PostcodeRow[];
  initial?: OrderWithItems | null;
  productCodes?: Record<string, string>;
  productTypes?: Record<string, string>;
  discontinued?: Record<string, string[]>;
};

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function OrderForm({ platform = "Shopee", products, sizes, provinces, postcodes, initial, productCodes, productTypes, discontinued }: Props) {
  const router = useRouter();
  const base = `/${platform.toLowerCase()}`;   // path ฐานของแพลตฟอร์ม (กลับหน้ารายการ)
  const editing = !!initial;
  const pfCode = initial?.platform || platform;
  const isOffice = pfCode === "Office";   // Office = ร้านขาย/จัดส่งเอง → มีราคา/ชำระเงิน/ขนส่ง
  const isWholesale = isWholesalePlatform(pfCode);   // CTW/Eveandboy/King Power = ค้าส่ง → มีช่องสาขา ไม่ต้องมีลูกค้า/ที่อยู่
  const isCTW = pfCode === "CTW";                     // CTW = โอนสาขา (มีปุ่มส่งไป CTW)
  const isEveandboy = pfCode === "Eveandboy";         // Eveandboy = มี PO Order Version (กรอกเอง)
  const isKingPower = pfCode === "KingPower";         // King Power = จำกัดสินค้าตาม catalog (สาขา/รหัสพิมพ์เอง)

  const [f, setF] = useState({
    order_no: initial?.order_no ?? "",
    doc_no: initial?.doc_no ?? "",
    doc_date: initial?.doc_date ?? todayStr(),
    channel: initial?.channel ?? platform,
    shop_name: initial?.shop_name ?? "",
    username: initial?.username ?? "",
    receiver: initial?.receiver ?? "",
    phone: initial?.phone ?? "",
    customer_type: initial?.customer_type ?? "",
    purchase_count: initial?.purchase_count?.toString() ?? "",
    province: initial?.province ?? "",
    district: initial?.district ?? "",
    subdistrict: initial?.subdistrict ?? "",
    postcode: initial?.postcode ?? "",
    address: initial?.address ?? "",
    campaign: initial?.campaign ?? "",
    note: initial?.note ?? "",
    box_scent: initial?.box_scent ?? "",
    order_date: initial?.order_date ?? "",
    branch: initial?.branch ?? "",
    branch_code: initial?.branch_code ?? "",
    po_version: initial?.po_version ?? "",
    price: initial?.price?.toString() ?? "",
    discount: initial?.discount?.toString() ?? "",
    payment_method: initial?.payment_method ?? "",
    shipping_carrier: initial?.shipping_carrier ?? "",
    tracking_no: initial?.tracking_no ?? "",
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
  const [hist, setHist] = useState<CustomerHistory | null>(null);   // ประวัติลูกค้าเก่า
  const [histOpen, setHistOpen] = useState(true);                    // กาง/พับการ์ดประวัติ
  const [returnWarn, setReturnWarn] = useState(0);                   // ลูกค้าคืนบ่อย (เตือน)

  const set = (patch: Partial<typeof f>) => { setF((prev) => ({ ...prev, ...patch })); setDirty(true); };

  // เตือนก่อนออกจากหน้าถ้ายังไม่ได้บันทึก (ปิดแท็บ / refresh)
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  // เตือนตอนคลิกลิงก์ในแอป (เมนูซ้าย ฯลฯ) ระหว่างยังไม่บันทึก — Next App Router ไม่มี route-guard ในตัว
  // จับคลิก <a> ภายในเว็บ (ไม่ใช่แท็บใหม่/ดาวน์โหลด) แล้ว confirm ก่อนปล่อยให้ไป
  useEffect(() => {
    if (!dirty) return;
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a) return;
      const href = a.getAttribute("href") || "";
      if (!href || href.startsWith("#") || a.target === "_blank" || a.hasAttribute("download")) return;
      if (a.origin !== window.location.origin) return;                 // ลิงก์นอกเว็บ = beforeunload จัดการ
      if (a.pathname === window.location.pathname) return;             // อยู่หน้าเดิม
      if (!window.confirm("ยังไม่ได้บันทึกใบเบิก — ออกจากหน้านี้เลยไหม? ข้อมูลที่กรอกจะหาย")) {
        e.preventDefault(); e.stopPropagation();
      }
    };
    document.addEventListener("click", onClick, true);                // capture: ดักก่อน Next Link
    return () => document.removeEventListener("click", onClick, true);
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

  // ดึง "ตำบล/แขวง" จาก address blob — ข้อมูล Shopee เก่าเก็บตำบลรวมในที่อยู่ ไม่แยกคอลัมน์ (เช่น "…แขวงออเงิน เขตสายไหม…")
  const subFromAddr = (addr?: string | null) => { const m = (addr || "").match(/(แขวง|ตำบล)\s*([^\s,]+)/); return m ? m[1] + m[2] : ""; };

  // เลือกลูกค้าเดิม → เติมตัวตน (ชื่อ/เบอร์) + ที่อยู่ล่าสุด + ตั้ง "ลูกค้าเก่า"/นับครั้ง อัตโนมัติ
  // (รายการสินค้ายังให้ดูจากการ์ดประวัติแล้วกดเติมเอง กันลอกผิดล็อต)
  function fillFromCustomer(c: CustomerSuggestion) {
    setDirty(true);
    setF((prev) => ({
      ...prev,
      receiver: c.receiver ?? prev.receiver,
      phone: c.phone ?? prev.phone,
      username: c.username ?? prev.username,
      // เติมที่อยู่จากออเดอร์ล่าสุดของลูกค้า (เฉพาะช่องที่มีค่า ไม่ทับด้วยค่าว่าง)
      province: c.province ?? prev.province,
      district: c.district ?? prev.district,
      subdistrict: c.subdistrict || subFromAddr(c.address) || prev.subdistrict,
      postcode: c.postcode ?? prev.postcode,
      address: c.address ?? prev.address,
      customer_type: "ลูกค้าเก่า",
      purchase_count: String((c.total_orders || 0) + 1),
    }));
    setReturnWarn(c.return_count || 0);
    loadHistory({ phone: c.phone, username: c.username, receiver: c.receiver });
  }

  async function loadHistory(id: { phone?: string | null; username?: string | null; receiver?: string | null }) {
    const h = await customerHistory(id, { excludeOrderNo: initial?.order_no });
    const returning = h.orders.length > 0;
    setHist(returning ? h : null);
    setHistOpen(true);
    // เติม customer_type + จำนวนครั้งอัตโนมัติ (เฉพาะตอนช่องยังว่าง เพื่อไม่ทับค่าที่ตั้งเอง)
    // เจอประวัติ → ลูกค้าเก่า + ครั้งถัดไป · ไม่เจอ → ลูกค้าใหม่ + ซื้อครั้งที่ 1
    setF((prev) => (prev.customer_type
      ? prev
      : returning
        ? { ...prev, customer_type: "ลูกค้าเก่า", purchase_count: String((h.total_orders || 0) + 1) }
        : { ...prev, customer_type: "ลูกค้าใหม่", purchase_count: "1" }));
  }

  // กดปุ่ม "ตั้งเป็นลูกค้าเก่า" → เติม customer_type + จำนวนครั้งจากประวัติ
  function markReturning() {
    if (!hist) return;
    set({ customer_type: "ลูกค้าเก่า", purchase_count: String((hist.total_orders || 0) + 1) });
  }

  // แก้ไขใบเดิมของลูกค้าเก่า → โหลดประวัติมาโชว์เทียบให้เลย
  useEffect(() => {
    if (editing && (initial?.phone || initial?.username || initial?.receiver)) {
      loadHistory({ phone: initial?.phone, username: initial?.username, receiver: initial?.receiver });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // คัดลอกที่อยู่จากการ์ดประวัติเข้าฟอร์ม
  function useHistoryAddress() {
    if (!hist?.profile) return;
    const p = hist.profile;
    set({ province: p.province ?? "", district: p.district ?? "", subdistrict: p.subdistrict || subFromAddr(p.address), postcode: p.postcode ?? "", address: p.address ?? "" });
  }

  // เติมรายการจากออร์เดอร์ครั้งก่อน (ถ้าตารางว่าง = แทนที่, ถ้ามีของแล้ว = ต่อท้าย)
  function fillItemsFromOrder(o: PastOrder) {
    const draft: ItemDraft[] = o.items.map((it) => ({
      product: it.product, size: it.size ?? "", is_free: !!it.is_free,
      qty: Number(it.qty) > 0 ? Number(it.qty) : 1, unit: "ขวด", sku: "",
    }));
    if (draft.length === 0) return;
    setItemErrors([]);
    setItems((prev) => {
      const kept = prev.filter((it) => it.product.trim());
      return [...kept, ...draft];
    });
    setDirty(true);
  }

  // province → district options
  const districts = useMemo(() => {
    if (!f.province) return [];
    return Array.from(new Set(postcodes.filter((p) => p.province === f.province).map((p) => p.district)));
  }, [postcodes, f.province]);

  // เลือกจากผลค้นรหัสไปรษณีย์ → เติมจังหวัด/อำเภอ/ตำบล/รหัส ให้ครบ
  function onPickPostcode(hit: PostcodeHit) {
    const bkk = hit.province === "กรุงเทพมหานคร";
    set({
      province: hit.province,
      district: (bkk ? "เขต" : "อำเภอ") + hit.district,
      subdistrict: (bkk ? "แขวง" : "ตำบล") + hit.subdistrict,
      postcode: hit.postcode,
    });
  }

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

    // บังคับช่องจำเป็นสำหรับจัดส่ง — ผู้รับ / จังหวัด (ที่อยู่ไม่บังคับ)
    // CTW = โอนสาขา ไม่ต้องมีผู้รับ/จังหวัด (ใช้ช่องสาขาแทน)
    const fErr = isWholesale ? { receiver: false, province: false } : { receiver: !f.receiver.trim(), province: !f.province.trim() };
    if (isWholesale && !f.branch.trim()) { setError(`เลือกสาขาปลายทาง (${platformName(pfCode)})`); return; }
    if (fErr.receiver || fErr.province) {
      setFieldErrors(fErr);
      const miss = [fErr.receiver && "ผู้รับ", fErr.province && "จังหวัด"].filter(Boolean).join(" / ");
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

    // เปิดแท็บพิมพ์ทันทีตอนคลิก (ยังอยู่ใน user gesture) — กัน popup blocker บล็อก
    // เพราะถ้าเปิดหลัง await saveOrder เบราว์เซอร์จะถือว่าไม่ใช่การคลิกแล้ว บล็อกทันที
    const printWin = thenPrint ? window.open("about:blank", "_blank") : null;

    // เตือน Order No. ซ้ำ (สร้างใหม่) — ยืนยันก่อนเขียนทับ
    if (!editing) {
      const dup = await orderExists(f.order_no);
      if (dup.exists && !window.confirm(`Order No. "${f.order_no}" มีอยู่แล้วในระบบ (${dup.deleted ? "ในถังขยะ" : dup.doc_no || "-"})\nบันทึกต่อจะเขียนทับข้อมูลเดิม — ต้องการดำเนินการต่อหรือไม่?`)) {
        printWin?.close();
        return;
      }
    }

    setBusy(true);
    const payload: OrderInput = {
      ...f,
      platform: initial?.platform || platform,
      // ลูกค้าใหม่ = ครั้งที่ 1 เสมอ (ช่องถูก disable โชว์ "1" — state อาจว่าง เลยบังคับ 1 กัน PDF ไม่ขึ้น)
      purchase_count: f.customer_type === "ลูกค้าใหม่" ? 1 : (f.purchase_count ? Number(f.purchase_count) : null),
      items: items.map((it) => ({
        product: it.product, size: it.size, is_free: it.is_free, qty: it.qty, unit: it.unit, sku: it.sku || null,
      })),
    };
    const res = await saveOrder(payload);
    if (!res.ok) { printWin?.close(); setBusy(false); setError(res.error || "บันทึกไม่สำเร็จ"); return; }
    setDirty(false);   // บันทึกแล้ว → ไม่ต้องเตือนตอนออก
    setSavedMsg(`บันทึกแล้ว ✓ (${res.doc_no || res.order_no})`);
    if (thenPrint && res.order_no) {
      const url = `/print/pdf/${encodeURIComponent(res.order_no)}`;
      if (printWin) printWin.location.href = url;     // ชี้แท็บที่เปิดไว้ไปที่ PDF
      else window.open(url, "_blank");                // เผื่อ open แรกถูกบล็อก
    }
    if (editing) {
      router.refresh();   // แก้ไข → อยู่หน้าเดิม (รีเฟรชข้อมูลอย่างเดียว ไม่เด้งกลับ)
      setBusy(false);
    } else {
      setTimeout(() => { router.push(base); router.refresh(); }, 700);   // สร้างใหม่ → กลับหน้ารายการ
    }
  }

  return (
    <div className="space-y-6">
      {savedMsg && <div className="alert-success flex items-center gap-2 font-medium"><CheckCircle2 size={16} /> {savedMsg}</div>}
      {error && <div className="alert-error flex items-center gap-2"><AlertTriangle size={16} /> {error}</div>}

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
            <label className="label">วันที่ใบเบิก <span className="text-faint">(ล็อกอัตโนมัติ)</span></label>
            <div className="input flex items-center justify-between bg-soft">
              <span className="font-medium text-ink">{f.doc_date || todayStr()}</span>
              <span className="text-[11px] text-faint">{editing ? "วันที่สร้างเดิม" : "= วันที่สร้างวันนี้"}</span>
            </div>
          </div>
          <div>
            <label className="label inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: platformColor(platform) }} /> ชื่อผู้ใช้ ({platform})
            </label>
            <CustomerSuggest value={f.username} onChange={(v) => { set({ username: v }); setReturnWarn(0); }} onPick={fillFromCustomer} placeholder="พิมพ์ชื่อผู้ใช้ / ชื่อ / กลิ่นที่เคยซื้อ" />
          </div>
        </div>
        {returnWarn >= 2 && (
          <div className="alert-warn mt-3 flex items-start gap-2">
            <span className="text-base leading-none">⚠️</span>
            <div><b>ลูกค้ารายนี้เคยส่งคืน {returnWarn} ครั้ง</b> — ควรตรวจก่อนส่ง (เช่น ยืนยันที่อยู่/เบอร์ หรือแนะนำเก็บเงินปลายทาง)</div>
          </div>
        )}
      </section>

      {/* recipient (ค้าส่ง = สาขา · อื่นๆ = ลูกค้า/ที่อยู่) */}
      <section className="card p-5">
        <h2 className="mb-4 text-sm font-semibold text-ink">{isWholesale ? `สาขาปลายทาง (${platformName(pfCode)})` : "ผู้รับ & ที่อยู่จัดส่ง"}</h2>
        {isWholesale ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label">สาขา <span className="text-brand">*</span></label>
              <Combobox value={f.branch} options={BRANCHES[pfCode] || []} allowCustom={!isEveandboy} placeholder={isEveandboy ? "เลือกสาขา Eveandboy" : "เลือก / พิมพ์สาขา"}
                onChange={(v) => { const m = EVEANDBOY_BRANCHES.find((b) => b.branch === v); set({ branch: v, ...(m ? { branch_code: m.code } : {}) }); }} />
              {(() => {
                const addr = EVEANDBOY_BRANCHES.find((b) => b.branch === f.branch)?.address;
                return addr ? (
                  <div className="mt-1.5 flex items-start gap-1.5 rounded-lg border border-line bg-soft px-3 py-2 text-xs text-muted">
                    <MapPin size={13} className="mt-0.5 shrink-0 text-brand" /><span>{addr}</span>
                  </div>
                ) : null;
              })()}
            </div>
            <div>
              <label className="label">รหัสสาขา</label>
              <input className="input" value={f.branch_code} onChange={(e) => set({ branch_code: e.target.value })} placeholder="เช่น 01" />
            </div>
            {isEveandboy && (
              <div>
                <label className="label">PO Order Version</label>
                <input className="input" value={f.po_version} onChange={(e) => set({ po_version: e.target.value })} placeholder="กรอกเอง (ถ้ามี)" />
              </div>
            )}
            <p className="mt-0.5 text-xs text-faint sm:col-span-2">ค้าส่ง — ไม่ต้องกรอกลูกค้า/ที่อยู่ · ตัดสต๊อกด้วยการสแกน SKU เหมือนเดิม{isCTW ? " · เสร็จแล้วกด “ส่งไป CTW”" : ""}</p>
          </div>
        ) : (
        <>

        {/* ป้ายลูกค้าเก่า — เห็นชัดในหน้าแก้ไข + กดตั้ง/ดูประวัติได้ */}
        {hist && (
          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
            <History size={15} className="text-amber-600" />
            <span className="text-sm font-medium text-amber-800">ลูกค้าเก่า — เคยซื้อ {hist.total_orders} ครั้ง</span>
            {hist.orders[0]?.doc_date && <span className="text-xs text-amber-700">ล่าสุด {hist.orders[0].doc_date}</span>}
            <div className="ml-auto flex items-center gap-2">
              {f.customer_type !== "ลูกค้าเก่า" && (
                <button type="button" onClick={markReturning}
                  className="rounded-md border border-amber-300 bg-white px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100">
                  ตั้งเป็นลูกค้าเก่า · ครั้งที่ {hist.total_orders + 1}
                </button>
              )}
              <button type="button" onClick={() => setHistOpen((v) => !v)} className="text-xs font-medium text-amber-700 underline">
                {histOpen ? "ซ่อนประวัติ" : "ดูประวัติ"}
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="label">ชื่อผู้รับ <span className="text-brand">*</span></label>
            <CustomerSuggest value={f.receiver} onChange={(v) => { set({ receiver: v }); setReturnWarn(0); }} onPick={fillFromCustomer} placeholder="พิมพ์เพื่อค้นหาลูกค้าเดิม" invalid={fieldErrors.receiver} />
          </div>
          {/* เบอร์โทร — โชว์เฉพาะ Office (แพลตฟอร์มอื่นซ่อนไว้ ยังเก็บใน DB + ใช้จับคู่ลูกค้าเดิม) */}
          {isOffice && (
            <div>
              <label className="label">เบอร์โทร</label>
              <CustomerSuggest value={f.phone} onChange={(v) => { set({ phone: cleanPhone(v) }); setReturnWarn(0); }} onPick={fillFromCustomer} placeholder="พิมพ์เบอร์เพื่อค้นหา" type="tel" />
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">ลูกค้า</label>
              <Combobox value={f.customer_type} allowCustom={false} placeholder="เลือก" options={[...CUSTOMER_TYPES]}
                onChange={(v) => set({ customer_type: v,
                  ...(v === "ลูกค้าใหม่" ? { purchase_count: "1" }
                    : v === "ลูกค้าเก่า" && hist ? { purchase_count: String((hist.total_orders || 0) + 1) }
                    : {}) })} />
            </div>
            <div>
              <label className="label">ซื้อครั้งที่</label>
              <input type="number" min={0} inputMode="numeric"
                className="input disabled:bg-soft disabled:text-faint disabled:cursor-not-allowed"
                value={f.customer_type === "ลูกค้าใหม่" ? "1" : f.purchase_count}
                disabled={f.customer_type === "ลูกค้าใหม่"}
                onChange={(e) => set({ purchase_count: e.target.value })}
                placeholder="เช่น 1, 25" />
            </div>
          </div>
          {f.customer_type === "ลูกค้าใหม่" && hist && (hist.total_orders || 0) > 0 && (
            <p className="-mt-1 flex items-center gap-1 text-xs text-amber-600">
              <AlertTriangle size={12} /> ระบบพบประวัติซื้อ {hist.total_orders} ครั้ง — น่าจะเป็น "ลูกค้าเก่า"
            </p>
          )}
          <div>
            <label className="label">จังหวัด <span className="text-brand">*</span></label>
            <Combobox value={f.province} onChange={onProvince} options={provinces} placeholder="เลือกจังหวัด" invalid={fieldErrors.province} />
          </div>
          <div>
            <label className="label">อำเภอ / เขต</label>
            <Combobox value={f.district} onChange={onDistrict} options={districts} placeholder={f.province ? "เลือกอำเภอ/เขต" : "เลือกจังหวัดก่อน"} disabled={!f.province} />
          </div>
          <div>
            <label className="label">ตำบล / แขวง</label>
            <input className="input" value={f.subdistrict} onChange={(e) => set({ subdistrict: e.target.value })} placeholder="อัตโนมัติจากรหัสไปรษณีย์" />
          </div>
          <div>
            <label className="label">รหัสไปรษณีย์ <span className="text-faint">(พิมพ์เพื่อค้นตำบล/อำเภอ)</span></label>
            <PostcodeSearch value={f.postcode} onChange={(v) => set({ postcode: v })} onPick={onPickPostcode} placeholder="พิมพ์รหัส เช่น 10110" />
          </div>
          <div className="md:col-span-2">
            <label className="label">ที่อยู่ (บ้านเลขที่ / ถนน / รายละเอียด)</label>
            <textarea rows={1} className="input !h-10 resize-none" value={f.address} onChange={(e) => set({ address: e.target.value })} />
          </div>
        </div>
        </>
        )}
      </section>

      {/* การ์ดประวัติลูกค้าเก่า — เทียบข้อมูล กดเติมที่อยู่/รายการเอง */}
      {hist && histOpen && (
        <CustomerHistoryCard hist={hist} onUseAddress={useHistoryAddress} onFillItems={fillItemsFromOrder} onClose={() => setHistOpen(false)} />
      )}

      {/* items */}
      <section className="card p-5">
        <h2 className="mb-4 text-sm font-semibold text-ink">รายการสินค้า</h2>
        {(() => {
          // Eveandboy / King Power: เลือกได้เฉพาะสินค้า/ขนาดในแคตตาล็อก (จากไฟล์) เท่านั้น
          const catNk = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9ก-๙]/g, "");
          const catalog = isEveandboy ? EVEANDBOY_SIZES_BY_SCENT : isKingPower ? KINGPOWER_SIZES_BY_SCENT : undefined;
          const catProducts = catalog ? products.filter((p) => catalog[catNk(p)]) : products;
          return (
            <ItemsEditor items={items} onChange={onItemsChange} products={catProducts} sizes={sizes} errors={itemErrors}
              productCodes={productCodes} productTypes={productTypes} discontinued={discontinued} platform={pfCode}
              sizeAllow={catalog} />
          );
        })()}
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
            <DatePicker value={f.order_date} onChange={(v) => set({ order_date: v })} quickPick />
          </div>
          <div className="md:col-span-3">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <label className="label mb-0">หมายเหตุ (Note)</label>
              <span className="text-xs text-faint">ประเภทการส่ง:</span>
              {[
                { tag: "ส่งด่วน", dot: "bg-red-500", on: "border-red-300 bg-red-50 text-red-700", off: "border-line bg-white text-muted hover:border-red-200 hover:text-red-600" },
                { tag: "ส่งทันที", dot: "bg-orange-500", on: "border-orange-300 bg-orange-50 text-orange-700", off: "border-line bg-white text-muted hover:border-orange-200 hover:text-orange-600" },
              ].map(({ tag, dot, on, off }) => {
                const tagRe = new RegExp(`(^|\\s)${tag}(?=\\s|$)`, "g");   // จับเฉพาะแท็ก token จริง (กันชนคำที่ฝังใน)
                const active = tagRe.test(f.note);
                return (
                  <button key={tag} type="button"
                    onClick={() => set({ note: active
                      ? f.note.replace(new RegExp(`(^|\\s)${tag}(?=\\s|$)`, "g"), " ").replace(/\s{2,}/g, " ").trim()   // เอาออก (เฉพาะแท็ก)
                      : (f.note.trim() ? `${f.note.trim()} ${tag}` : tag) })}          // เติมต่อท้าย ไม่ทับของเดิม
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all ${active ? on : off}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${active ? dot : "bg-slate-300"}`} />
                    {tag}
                    {active && <Check size={13} />}
                  </button>
                );
              })}
            </div>
            <textarea className="input min-h-[56px]" value={f.note} onChange={(e) => set({ note: e.target.value })} />
          </div>
        </div>

        {/* ── การขาย & จัดส่ง — เฉพาะ Office (ร้านจัดส่งเอง) ── */}
        {isOffice && (
          <div className="mt-5 rounded-xl border border-brand-200 bg-brand-50/40 p-4">
            <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-brand-700"><Wallet size={15} /> การขาย & จัดส่ง (Office)</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="label">ราคาสินค้า (บาท)</label>
                <input className="input text-right tabular-nums" inputMode="decimal" value={f.price}
                  onChange={(e) => set({ price: cleanMoney(e.target.value) })} placeholder="0.00" />
              </div>
              <div>
                <label className="label">ส่วนลด (บาท)</label>
                <input className="input text-right tabular-nums" inputMode="decimal" value={f.discount}
                  onChange={(e) => set({ discount: cleanMoney(e.target.value) })} placeholder="0.00" />
              </div>
              <div>
                <label className="label">ยอดสุทธิ <span className="text-faint">(auto)</span></label>
                <div className="input flex items-center justify-end bg-soft font-semibold tabular-nums text-ink">
                  {f.price ? `${Math.max(0, (parseFloat(f.price) || 0) - (parseFloat(f.discount) || 0)).toLocaleString("th-TH")} ฿` : "—"}
                </div>
              </div>
              <div>
                <label className="label">ช่องทางชำระเงิน</label>
                <select className="input" value={f.payment_method} onChange={(e) => set({ payment_method: e.target.value })}>
                  <option value="">— เลือก —</option>
                  {PAYMENT_METHODS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="label inline-flex items-center gap-1"><Truck size={13} className="text-muted" /> ขนส่ง</label>
                <Combobox value={f.shipping_carrier} onChange={(v) => set({ shipping_carrier: v })} options={CARRIERS} placeholder="เลือก / พิมพ์ขนส่ง" />
              </div>
              <div>
                <label className="label">เลขพัสดุ (Tracking)</label>
                <input className="input font-mono" value={f.tracking_no}
                  onChange={(e) => set({ tracking_no: e.target.value.replace(/\s/g, "") })} placeholder="เลขพัสดุ" />
              </div>
            </div>
          </div>
        )}
      </section>

      <div className="sticky bottom-0 flex flex-wrap gap-3 border-t border-line bg-canvas/90 py-4 backdrop-blur">
        <button className="btn-primary" disabled={busy} onClick={() => onSave(false)}>
          <Save size={16} /> {busy ? "กำลังบันทึก…" : "บันทึก"}
        </button>
        <button className="btn-ghost" disabled={busy} onClick={() => onSave(true)}>
          <Printer size={16} /> บันทึก & พิมพ์
        </button>
        <button className="btn-ghost ml-auto" disabled={busy}
          onClick={() => { if (!dirty || window.confirm("ยังไม่ได้บันทึก — ต้องการออกจากหน้านี้?")) router.push(base); }}>ยกเลิก</button>
      </div>
    </div>
  );
}
