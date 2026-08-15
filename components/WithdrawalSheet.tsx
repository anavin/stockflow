import { COMPANY_NAME, COMPANY_NAME_EN } from "@/lib/config";
import type { OrderWithItems, OrderItem } from "@/lib/types";
import Barcode from "./Barcode";

/**
 * ใบเบิกสินค้า — เวอร์ชัน HTML (พิมพ์ผ่านเบราว์เซอร์ → Save as PDF).
 * เป็นทางเลือกของ react-pdf: เบราว์เซอร์ shape ไทยได้ครบ จึงโชว์ "รายการ" ได้ตรง
 * และใช้ Sheet ตัวเดียวกันทั้ง preview และหน้าพิมพ์ (แนว DailyReportSheet ของ CTW).
 * A4 แนวนอน 2 ใบต่อหน้า: ต้นฉบับ | สำเนา.
 */

const C = { ink: "#1a1614", muted: "#6b645d", faint: "#9a938c", border: "#cfc9c1", soft: "#f5f3ef", brand: "#ee4d2d", line: "#e6e1da" };

// เรียงเหมือนใบ PDF: ประเภท → ชื่อกลิ่น (ก-๙/A-Z) → ขนาดใหญ่ก่อน
const TYPE_ORDER = ["PARFUM", "EDP+", "EDT", "EDP"];
const typeRank = (t?: string | null) => { const i = TYPE_ORDER.indexOf(String(t || "").trim()); return i < 0 ? 9 : i; };
const mlOf = (sz?: string | null) => { const m = String(sz || "").match(/(\d+(?:\.\d+)?)/); return m ? parseFloat(m[1]) : 0; };
const T = (s: any) => (s == null || s === "" ? "-" : String(s));
const fmtDate = (d?: any) => (!d ? "-" : d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10));

function Field({ label, value, full }: { label: string; value?: any; full?: boolean }) {
  return (
    <div style={{ display: "flex", width: full ? "100%" : "50%", marginBottom: 2, paddingRight: 6, fontSize: 8 }}>
      <span style={{ color: C.muted, width: 58, flexShrink: 0 }}>{label}</span>
      <span style={{ fontWeight: 700, flex: 1 }}>{T(value)}</span>
    </div>
  );
}

function Panel({ order, copyLabel }: { order: OrderWithItems; copyLabel: string }) {
  const items: OrderItem[] = [...(order.items ?? [])].sort((a, b) =>
    typeRank(a.ptype) - typeRank(b.ptype)
    || String(a.product || "").localeCompare(String(b.product || ""), "th")
    || mlOf(b.size) - mlOf(a.size));
  const total = items.reduce((sum, it) => sum + (Number(it.qty) || 0), 0);
  const addr = [order.address, order.subdistrict, order.district, order.province, order.postcode].filter(Boolean).join(" ");

  const th: React.CSSProperties = { padding: "3px 4px", fontSize: 7.5, fontWeight: 700, color: C.muted, background: C.soft, borderTop: `0.8px solid ${C.border}`, borderBottom: `0.8px solid ${C.border}`, textAlign: "left" };
  const td: React.CSSProperties = { padding: "2px 4px", fontSize: 8, borderBottom: `0.5px solid ${C.line}`, verticalAlign: "top" };

  return (
    <div style={{ flex: 1, border: `1px solid ${C.ink}`, padding: 10, display: "flex", flexDirection: "column", color: C.ink }}>
      {/* header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: `1.5px solid ${C.ink}`, paddingBottom: 5, marginBottom: 5 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700 }}>{COMPANY_NAME}</div>
          <div style={{ fontSize: 7, color: C.muted, marginTop: 1 }}>{COMPANY_NAME_EN}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>ใบเบิกสินค้า</div>
          <div style={{ fontSize: 7.5, color: C.faint }}>Goods Issue Form</div>
          <div style={{ display: "inline-block", marginTop: 3, border: `0.8px solid ${C.brand}`, color: C.brand, fontSize: 7, padding: "1.5px 4px", borderRadius: 3, fontWeight: 700 }}>{copyLabel}</div>
        </div>
      </div>

      {/* band */}
      <div style={{ display: "flex", background: C.soft, border: `0.5px solid ${C.border}`, marginBottom: 5 }}>
        {[["Shop", T(order.platform)], ["เลขที่ใบเบิก", T(order.doc_no)], ["วันที่", fmtDate(order.doc_date)]].map(([l, v], i) => (
          <div key={i} style={{ flex: 1, padding: "3px 5px", borderRight: i < 2 ? `0.5px solid ${C.border}` : "none" }}>
            <div style={{ fontSize: 6.5, color: C.muted }}>{l}</div>
            <div style={{ fontSize: 9, fontWeight: 700 }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Order No. + barcode */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", border: `0.8px solid ${C.border}`, borderRadius: 3, padding: "5px 8px", marginBottom: 5 }}>
        <div>
          <div style={{ fontSize: 7, color: C.muted }}>Order No.</div>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.6 }}>{T(order.order_no)}</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <Barcode value={order.order_no} height={34} width={1.3} />
          <div style={{ fontSize: 7, color: C.muted, marginTop: 1 }}>{order.order_no}</div>
        </div>
      </div>

      {/* info fields */}
      <div style={{ display: "flex", flexWrap: "wrap", marginBottom: 4 }}>
        <Field label="ชื่อลูกค้า" value={order.shop_name} />
        <Field label="ชื่อผู้ใช้" value={order.username} />
        <Field label="ผู้รับ" value={order.receiver} />
        <Field label="เบอร์โทร" value={order.phone} />
        <Field label="ลูกค้า" value={order.customer_type} />
        <Field label="ซื้อครั้งที่" value={order.purchase_count} />
        <Field label="ที่อยู่" value={addr} full />
        <Field label="แคมเปญ" value={order.campaign} />
        <Field label="ฉีดกลิ่นกล่อง" value={order.box_scent} />
        <Field label="หมายเหตุ" value={order.note} full />
      </div>

      {/* items */}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ ...th, width: 18 }}>#</th>
            <th style={{ ...th, width: 46 }}>ประเภท</th>
            <th style={th}>รายการ</th>
            <th style={{ ...th, width: 48 }}>ขนาด</th>
            <th style={{ ...th, width: 36, textAlign: "right" }}>จำนวน</th>
            <th style={{ ...th, width: 30 }}>Free</th>
            <th style={{ ...th, width: 32 }}>หน่วย</th>
            <th style={{ ...th, width: 64 }}>SKU</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => (
            <tr key={i}>
              <td style={{ ...td, color: C.faint }}>{i + 1}</td>
              <td style={{ ...td, color: C.faint }}>{T(it.ptype)}</td>
              <td style={{ ...td, fontWeight: 700 }}>{T(it.product)}</td>
              <td style={td}>{T(it.size)}</td>
              <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>{Number(it.qty) || 0}</td>
              <td style={{ ...td, color: it.is_free ? C.brand : C.faint }}>{it.is_free ? "Free" : "-"}</td>
              <td style={td}>{T(it.unit)}</td>
              <td style={{ ...td, fontSize: 7 }}>{T(it.sku)}</td>
            </tr>
          ))}
          <tr>
            <td colSpan={4} style={{ ...td, textAlign: "right", fontWeight: 700, background: C.soft, borderBottom: `0.8px solid ${C.border}` }}>รวมทั้งสิ้น</td>
            <td style={{ ...td, textAlign: "right", fontWeight: 700, background: C.soft, borderBottom: `0.8px solid ${C.border}` }}>{total}</td>
            <td colSpan={3} style={{ ...td, background: C.soft, borderBottom: `0.8px solid ${C.border}` }}> </td>
          </tr>
        </tbody>
      </table>

      {/* signatures — ดันลงล่างสุด */}
      <div style={{ flexGrow: 1 }} />
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16, padding: "0 4px" }}>
        {["ผู้เบิก", "ผู้ตรวจ", "ผู้รับสินค้า"].map((l) => (
          <div key={l} style={{ width: "30%", textAlign: "center" }}>
            <div style={{ borderTop: `0.6px solid ${C.muted}`, marginBottom: 3 }} />
            <div style={{ fontSize: 7.5, color: C.muted }}>{`( ${l} )`}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function WithdrawalSheet({ order }: { order: OrderWithItems }) {
  return (
    <div className="wd-sheet" style={{ display: "flex", gap: 6, alignItems: "stretch", width: "100%" }}>
      <Panel order={order} copyLabel="ต้นฉบับ · ORIGINAL" />
      <div style={{ width: 1, borderLeft: `1px dashed ${C.muted}` }} />
      <Panel order={order} copyLabel="สำเนา · COPY" />
    </div>
  );
}
