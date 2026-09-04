/**
 * ใบเบิกสินค้า / Goods Issue Form — react-pdf document (Thai, Noto Sans Thai).
 * A4 LANDSCAPE with two panels side by side: ต้นฉบับ (Original) | สำเนา (Copy).
 *
 * NOTE on Thai: @react-pdf v4's text shaper drops the leading glyph of the
 * "ร"+"า" cluster (e.g. "รายการ"). We avoid that cluster in labels — the product
 * column is titled "สินค้า (EDP)" instead of "รายการ". Dynamic values (scent
 * names, order numbers) are Latin.
 */
import { Document, Page, Text, View, StyleSheet, Font, Svg, Rect, Image } from "@react-pdf/renderer";
import { LAB_PARFUMO_LOGO, LAB_PARFUMO_AR, EVEANDBOY_LOGO, EVEANDBOY_AR } from "./logos";
import { code128 } from "./code128";
import { COMPANY_NAME, COMPANY_NAME_EN, COMPANY_ADDRESS, isWholesalePlatform, platformName } from "@/lib/config";
import { EVEANDBOY_BY_KEY, EVEANDBOY_BRANCHES } from "@/lib/eveandboy-data";
import { NOTO_SANS_THAI_REGULAR, NOTO_SANS_THAI_BOLD } from "./fonts";
import type { OrderWithItems } from "@/lib/types";

let fontRegistered = false;
function registerFontOnce() {
  if (fontRegistered) return;
  // Fonts are embedded (base64 data URIs) — no fs/process.cwd(), so this renders
  // on Cloudflare Workers (nodejs_compat) as well as Node/Vercel.
  Font.register({
    family: "NotoSansThai",
    fonts: [
      { src: NOTO_SANS_THAI_REGULAR, fontWeight: "normal" },
      { src: NOTO_SANS_THAI_BOLD, fontWeight: "bold" },
    ],
  });
  Font.registerHyphenationCallback((w) => [w]);
  fontRegistered = true;
}

const T = (s: any) => {
  if (s == null || s === "") return "-";
  const v = String(s).trim();
  return v || "-";
};
const C = { ink: "#1a1614", muted: "#6b645d", faint: "#9a938c", border: "#cfc9c1", soft: "#f5f3ef", brand: "#ee4d2d", line: "#e6e1da" };

const s = StyleSheet.create({
  // A4 landscape content height = 595.28 - padding(40) ≈ 555 → ล็อกกล่องใบ = 552 (ทุกใบสูงเท่ากัน ขอบบน/ล่างตรงกัน)
  page: { fontFamily: "NotoSansThai", fontSize: 8, color: C.ink, paddingVertical: 20, paddingHorizontal: 20 },
  pageRow: { flexDirection: "row", alignItems: "stretch" },
  panel: { flex: 1, height: 552, borderWidth: 1, borderColor: C.ink, padding: 9, flexDirection: "column" },
  // full = A4 portrait เต็มแผ่น: ไม่ล็อกความสูง ให้เนื้อหาไหลลงตามปกติ (กันตัวหนังสือซ้อนกัน)
  panelFull: { borderWidth: 1, borderColor: C.ink, padding: 14, flexDirection: "column" },
  spacer: { flexGrow: 1 },   // ดันลายเซ็นลงล่างสุด (ไม่มีเส้น/เลข)
  // dashed fold/cut line down the middle between the two copies
  divider: { width: 18, alignItems: "center" },
  dividerLine: { flex: 1, borderLeftWidth: 1, borderLeftColor: C.muted, borderStyle: "dashed" },
  cutLabel: { fontSize: 6, color: C.faint, marginVertical: 3 },

  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", borderBottomWidth: 1.5, borderBottomColor: C.ink, paddingBottom: 5, marginBottom: 5 },
  company: { fontSize: 10, fontWeight: "bold" },
  companyEn: { fontSize: 6.5, color: C.muted, marginTop: 1 },
  titleWrap: { alignItems: "flex-end" },
  docTitle: { fontSize: 13, fontWeight: "bold" },
  docSub: { fontSize: 7, color: C.faint },
  badge: { marginTop: 3, alignSelf: "flex-end", borderWidth: 0.8, borderColor: C.brand, color: C.brand, fontSize: 6.5, paddingHorizontal: 4, paddingVertical: 1.5, borderRadius: 3, fontWeight: "bold" },
  // ชิปประเภทการส่ง (ส่งด่วน/ส่งทันที) — เล็ก อยู่ในช่องหมายเหตุ (สีแยกประเภท ชัดแม้ขาวดำ: กรอบ+ตัวหนา)
  noteChip: { fontWeight: "bold", fontSize: 7, borderWidth: 0.8, borderRadius: 2, paddingHorizontal: 3, paddingVertical: 0.5, marginRight: 3 },
  noteChipExpress: { borderColor: "#b91c1c", backgroundColor: "#fde4e4", color: "#b91c1c" },
  noteChipNow: { borderColor: "#c2410c", backgroundColor: "#ffe9d3", color: "#c2410c" },

  band: { flexDirection: "row", backgroundColor: C.soft, borderWidth: 0.5, borderColor: C.border, marginBottom: 5 },
  bandCell: { flex: 1, paddingVertical: 3, paddingHorizontal: 5, borderRightWidth: 0.5, borderRightColor: C.border },
  bandLabel: { fontSize: 6, color: C.muted },
  bandVal: { fontSize: 8.5, fontWeight: "bold" },

  // Order No. + barcode strip (แนวนอน: เลขซ้าย บาร์โค้ดขวา) — ดีไซน์แรก
  bcRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 0.8, borderColor: C.border, borderRadius: 3, paddingHorizontal: 8, paddingVertical: 5, marginBottom: 5 },
  bcLeft: {},
  bcLabel: { fontSize: 6.5, color: C.muted },
  bcValue: { fontSize: 11, fontWeight: "bold", letterSpacing: 0.6 },
  bcRight: { alignItems: "center" },
  bcText: { fontSize: 6.5, color: C.muted, marginTop: 1 },

  grid: { flexDirection: "row", flexWrap: "wrap", marginBottom: 4 },
  field: { width: "50%", flexDirection: "row", marginBottom: 2, paddingRight: 6 },
  fieldFull: { width: "100%", flexDirection: "row", marginBottom: 2 },
  fLabel: { color: C.muted, width: 54, fontSize: 7 },
  fVal: { fontWeight: "bold", flex: 1, fontSize: 7.5 },

  th: { flexDirection: "row", backgroundColor: C.soft, borderTopWidth: 0.8, borderColor: C.border },
  tr: { flexDirection: "row", borderTopWidth: 0.5, borderColor: C.line, minHeight: 14 },
  trLast: { borderBottomWidth: 0.8, borderColor: C.border },
  cell: { paddingVertical: 2.5, paddingHorizontal: 3, fontSize: 7.5 },
  hCell: { fontWeight: "bold", fontSize: 7, color: C.muted },

  foot: { flexDirection: "row", borderTopWidth: 0.8, borderBottomWidth: 0.8, borderColor: C.border, backgroundColor: C.soft },
  blankCell: { paddingVertical: 2.5, paddingHorizontal: 3 },
  signRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 14, paddingHorizontal: 4 },
  sign: { width: "30%", alignItems: "center" },
  signLine: { borderTopWidth: 0.6, borderColor: C.muted, width: "100%", marginBottom: 3 },
  signLabel: { fontSize: 7, color: C.muted },
});

// column widths (# / Grade / สินค้า / ขนาด / จำนวน / Free / หน่วย / SKU)
const COL_HALF = [16, 46, 104, 42, 34, 28, 30, 62];        // ~362pt half-panel (A4 landscape 2-up)
const COL_FULL = [22, 60, 150, 55, 45, 36, 40, 127];       // ~535pt full panel (A4 portrait, 1 ใบเต็มแผ่น)

function Barcode({ value, width = 250, height = 50 }: { value: string; width?: number; height?: number }) {
  const bc = code128(value);
  const scale = width / bc.totalModules;
  return (
    <Svg width={width} height={height}>
      {bc.bars.map((b, i) => (
        <Rect key={i} x={b.x * scale} y={0} width={b.w * scale} height={height} fill="#000" />
      ))}
    </Svg>
  );
}

function Field({ label, value, full }: { label: string; value?: any; full?: boolean }) {
  return (
    <View style={full ? s.fieldFull : s.field}>
      <Text style={s.fLabel}>{T(label)}</Text>
      <Text style={s.fVal}>{T(value)}</Text>
    </View>
  );
}

function Sign({ label }: { label: string }) {
  return (
    <View style={s.sign}>
      <View style={s.signLine} />
      <Text style={s.signLabel}>{`( ${T(label)} )`}</Text>
    </View>
  );
}

function fmtDate(d?: any) {
  if (!d) return "-";
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return String(d).slice(0, 10);
}

// ถุงกระดาษ = ของแถม (Free) เสมอ
const isBag = (p?: string | null) => /ถุง/.test(String(p || ""));
const isFreeItem = (it: { is_free?: boolean | null; product?: string | null }) => !!it.is_free || isBag(it.product);
// เรียงรายการในใบพิมพ์: ของขายก่อน → ของแถม(Free)ต่อท้าย → Grade → ขนาดใหญ่ก่อน → ชื่อกลิ่น (ก-๙/A-Z)
const TYPE_ORDER = ["PARFUM", "EDP+", "EDT", "EDP"];
const typeRank = (t?: string | null) => { const i = TYPE_ORDER.indexOf(String(t || "").trim()); return i < 0 ? 9 : i; };
const mlOf = (sz?: string | null) => { const m = String(sz || "").match(/(\d+(?:\.\d+)?)/); return m ? parseFloat(m[1]) : 0; };

function Panel({ order, copyLabel, full = false }: { order: OrderWithItems; copyLabel: string; full?: boolean }) {
  const items = [...(order.items ?? [])].sort((a, b) =>
    (isFreeItem(a) ? 1 : 0) - (isFreeItem(b) ? 1 : 0)   // ของขายขึ้นก่อน ของแถมไว้ล่าง
    || typeRank(a.ptype) - typeRank(b.ptype)             // Grade
    || mlOf(b.size) - mlOf(a.size)                       // ขนาดใหญ่ก่อน
    || String(a.product || "").localeCompare(String(b.product || ""), "th"));  // ชื่อกลิ่น
  const total = items.reduce((sum, it) => sum + (Number(it.qty) || 0), 0);
  const addr = [order.address, order.subdistrict, order.district, order.province, order.postcode].filter(Boolean).join(" ");

  // Density: shrink rows/fonts for big orders so it all fits ONE page.
  // full = A4 portrait เต็มแผ่น (สูง ~802) → มีที่มากกว่า ย่อช้ากว่า half (สูง 552)
  const n = items.length;
  const COL = full ? COL_FULL : COL_HALF;
  // เกณฑ์จำนวนรายการที่เริ่มย่อ — full (A4 เต็มแผ่น) จูนให้ ~50 รายการพอดี 1 หน้า
  const [T0, T1, T2, T3, T4, T5] = full ? [92, 68, 46, 33, 23, 13] : [70, 55, 40, 31, 22, 14];
  const rowH = n > T0 ? 4.7 : n > T1 ? 5.4 : n > T2 ? 6.3 : n > T3 ? 7.4 : n > T4 ? 9.5 : n > T5 ? 11 : 14;
  const cfs = n > T0 ? 4.7 : n > T1 ? 5.0 : n > T2 ? 5.4 : n > T3 ? 6 : n > T4 ? 6.6 : n > T5 ? 7 : 7.5;
  // เพดานกันตกขอบเงียบ ๆ: ถ้าเกิน CAP บรรทัด แสดงเท่าที่พอดี + แถวเตือน (ยอดรวมยังนับครบทุกชิ้น)
  const CAP = full ? 112 : 78;
  const shownItems = n > CAP ? items.slice(0, CAP - 1) : items;
  const truncated = n - shownItems.length;
  const pv = n > T3 ? 0.8 : n > T5 ? 1.3 : 2.5;
  const signGap = n > T3 ? 3 : n > T5 ? 6 : 14;
  const bcH = n > T3 ? 22 : n > T5 ? 26 : 34;   // barcode เล็กลงเมื่อออร์เดอร์ใหญ่ กันล้น
  const rowStyle = { minHeight: rowH };
  const cStyle = { fontSize: cfs, paddingVertical: pv };
  // ประเภทการส่ง (ดึงจากแท็กในหมายเหตุ) — โชว์เป็นชิปสีในช่องหมายเหตุ
  const noteText = order.note || "";
  const isExpress = noteText.includes("ส่งด่วน");
  const isNow = noteText.includes("ส่งทันที");
  const restNote = noteText.replace("ส่งด่วน", "").replace("ส่งทันที", "").replace(/\s{2,}/g, " ").trim();

  return (
    <View style={full ? s.panelFull : s.panel}>
      {/* header */}
      <View style={s.head}>
        <View>
          <Text style={s.company}>{T(COMPANY_NAME)}</Text>
          <Text style={s.companyEn}>{COMPANY_NAME_EN}</Text>
        </View>
        <View style={s.titleWrap}>
          <Text style={s.docTitle}>{T("ใบเบิกสินค้า")}</Text>
          <Text style={s.docSub}>Goods Issue Form</Text>
          {copyLabel ? <Text style={s.badge}>{T(copyLabel)}</Text> : null}
        </View>
      </View>

      {/* band: shop / doc no / date */}
      <View style={s.band}>
        <View style={s.bandCell}><Text style={s.bandLabel}>Shop</Text><Text style={s.bandVal}>{T(order.platform)}</Text></View>
        <View style={s.bandCell}><Text style={s.bandLabel}>{T("เลขที่ใบเบิก")}</Text><Text style={s.bandVal}>{T(order.doc_no)}</Text></View>
        <View style={[s.bandCell, { borderRightWidth: 0 }]}><Text style={s.bandLabel}>{T("วันที่")}</Text><Text style={s.bandVal}>{fmtDate(order.doc_date)}</Text></View>
      </View>

      {/* Order No. + barcode (แนวนอน: เลขซ้าย บาร์โค้ดขวา) */}
      <View style={s.bcRow}>
        <View style={s.bcLeft}>
          <Text style={s.bcLabel}>Order No.</Text>
          <Text style={s.bcValue}>{T(order.order_no)}</Text>
        </View>
        <View style={s.bcRight}>
          <Barcode value={order.order_no} width={185} height={bcH} />
          <Text style={s.bcText}>{order.order_no}</Text>
        </View>
      </View>

      {/* info fields */}
      <View style={s.grid}>
        <Field label="ชื่อผู้ใช้" value={order.username} />
        <Field label="ผู้รับ" value={order.receiver} />
        {/* เบอร์โทร: แสดงเฉพาะเมื่อมีข้อมูล (ไฟล์ Shopee ที่มีคอลัมน์เบอร์ หรือกรอกเอง) */}
        {order.phone && String(order.phone).trim() ? <Field label="เบอร์โทร" value={order.phone} full /> : null}
        <View style={{ width: "100%", flexDirection: "row" }}>
          <Field label="ลูกค้า" value={order.customer_type || (order.purchase_count ? (Number(order.purchase_count) > 1 ? "ลูกค้าเก่า" : "ลูกค้าใหม่") : null)} />
          <Field label="ซื้อครั้งที่" value={order.purchase_count ?? (order.customer_type === "ลูกค้าใหม่" ? 1 : null)} />
        </View>
        <Field label="ที่อยู่" value={addr} full />
        <Field label="แคมเปญ" value={order.campaign} />
        <Field label="ฉีดกลิ่นกล่อง" value={order.box_scent} />
        {/* หมายเหตุ + ชิปประเภทการส่ง (ส่งด่วน=แดง / ส่งทันที=ส้ม) แสดงในช่องนี้ */}
        <View style={s.fieldFull}>
          <Text style={s.fLabel}>{T("หมายเหตุ")}</Text>
          <View style={{ flex: 1, flexDirection: "row", flexWrap: "wrap", alignItems: "center" }}>
            {isExpress && <Text style={[s.noteChip, s.noteChipExpress]}>{T("ส่งด่วน")}</Text>}
            {isNow && <Text style={[s.noteChip, s.noteChipNow]}>{T("ส่งทันที")}</Text>}
            {restNote ? <Text style={s.fVal}>{restNote}</Text> : (!isExpress && !isNow && <Text style={s.fVal}>{T(null)}</Text>)}
          </View>
        </View>
      </View>

      {/* items table */}
      <View>
        <View style={s.th}>
          {["#", "Grade", "สินค้า (EDP)", "ขนาด", "จำนวน", "Free", "หน่วย", "SKU"].map((h, i) => (
            <Text key={i} style={[s.cell, s.hCell, { width: COL[i], textAlign: i === 4 ? "right" : "left" }]}>{T(h)}</Text>
          ))}
        </View>
        {shownItems.map((it, i) => (
          <View key={i} style={[s.tr, rowStyle]} wrap={false}>
            <Text style={[s.cell, cStyle, { width: COL[0], color: C.faint }]}>{i + 1}</Text>
            <Text style={[s.cell, cStyle, { width: COL[1], color: C.faint }]}>{T(it.ptype)}</Text>
            <Text style={[s.cell, cStyle, { width: COL[2], fontWeight: "bold" }]}>{T(it.product)}</Text>
            <Text style={[s.cell, cStyle, { width: COL[3] }]}>{T(it.size)}</Text>
            <Text style={[s.cell, cStyle, { width: COL[4], textAlign: "right", fontWeight: "bold" }]}>{Number(it.qty) || 0}</Text>
            <Text style={[s.cell, cStyle, { width: COL[5], color: isFreeItem(it) ? C.brand : C.faint }]}>{isFreeItem(it) ? "Free" : "-"}</Text>
            <Text style={[s.cell, cStyle, { width: COL[6] }]}>{T(it.unit)}</Text>
            <Text style={[s.cell, cStyle, { width: COL[7], fontSize: cfs - 0.8 }]}>{it.sku || ""}</Text>
          </View>
        ))}
        {truncated > 0 && (
          <View style={[s.tr, rowStyle]} wrap={false}>
            <Text style={[s.cell, cStyle, { width: COL.reduce((a, w) => a + w, 0), color: C.brand, fontWeight: "bold" }]}>
              {`⚠ และอีก ${truncated} รายการ — พิมพ์ไม่ครบใน 1 ใบ (ยอดรวมนับครบ · ควรแบ่งใบ)`}
            </Text>
          </View>
        )}
        <View style={s.foot}>
          <Text style={[s.cell, cStyle, { width: COL[0] + COL[1] + COL[2] + COL[3], textAlign: "right", fontWeight: "bold" }]}>{T("รวมทั้งสิ้น")}</Text>
          <Text style={[s.cell, cStyle, { width: COL[4], textAlign: "right", fontWeight: "bold" }]}>{total}</Text>
          <Text style={[s.cell, cStyle, { width: COL[5] + COL[6] + COL[7] }]}> </Text>
        </View>
      </View>

      {/* เว้นว่างตรงกลาง (ไม่มีเส้น/เลข) ดันลายเซ็นไปล่างสุด — เฉพาะใบสูงคงที่ (half); full ไหลตามเนื้อหา */}
      {!full && <View style={s.spacer} />}

      {/* signatures — ล็อกอยู่ท้ายเอกสาร (ตำแหน่งเดิมทุกใบ) */}
      <View style={[s.signRow, { marginTop: full ? 14 : signGap }]}>
        <Sign label="ผู้เบิก" />
        <Sign label="ผู้ตรวจ" />
        <Sign label="ผู้จ่ายสินค้า" />
      </View>
    </View>
  );
}

// A4 landscape, 2 ชุด (ต้นฉบับ | สำเนา) — ใบทั่วไป
function OrderPageHalf({ order }: { order: OrderWithItems }) {
  return (
    <Page size="A4" orientation="landscape" style={s.page}>
      <View style={s.pageRow}>
        <Panel order={order} copyLabel="ต้นฉบับ · ORIGINAL" />
        <View style={s.divider}>
          <View style={s.dividerLine} />
          <Text style={s.cutLabel}>{T("ตัด")}</Text>
          <View style={s.dividerLine} />
        </View>
        <Panel order={order} copyLabel="สำเนา · COPY" />
      </View>
    </Page>
  );
}

// ════════════ ใบเบิกแบบ PO (ค้าส่ง: CTW / Eveandboy / King Power) — A4 เต็มแผ่น ════════════
// ค้าส่ง (CTW/Eveandboy/King Power) = ใบเบิกรูปแบบเดียวกับใบส่งของ · อื่นๆ = 2 ชุดต่อหน้า
function OrderPage({ order }: { order: OrderWithItems }) {
  return isWholesalePlatform(order.platform) ? <WholesaleDocPage order={order} mode="issue" /> : <OrderPageHalf order={order} />;
}

export function WithdrawalDocument({ order }: { order: OrderWithItems }) {
  registerFontOnce();
  return (
    <Document title={`ใบเบิก ${order.doc_no || order.order_no}`} author="Lab Parfumo">
      <OrderPage order={order} />
    </Document>
  );
}

/** ใบเบิกหลายใบในไฟล์เดียว (1 ออร์เดอร์ = 1 หน้า) — สำหรับพิมพ์ที่เลือกทีเดียว */
export function WithdrawalDocumentMulti({ orders }: { orders: OrderWithItems[] }) {
  registerFontOnce();
  return (
    <Document title={`ใบเบิก ${orders.length} ใบ`} author="Lab Parfumo">
      {orders.map((o) => <OrderPage key={o.order_no} order={o} />)}
    </Document>
  );
}

// ════════════ ใบส่งของ / Delivery Note (ค้าส่ง — Eveandboy/CTW/King Power) ════════════
const MON_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fmtDateEN = (d?: any) => {
  if (!d) return "";
  const [y, m, dd] = String(d).slice(0, 10).split("-");
  return y && m && dd ? `${+dd} ${MON_EN[+m - 1]} ${y}` : String(d).slice(0, 10);
};
const AC = "#22303f";      // accent เข้ม (slate/navy) — โทนมืออาชีพ
const ACS = "#eef1f4";     // accent tint อ่อน (พื้นการ์ด/หัวตาราง)
const dn = StyleSheet.create({
  page: { fontFamily: "NotoSansThai", fontSize: 9, color: C.ink, paddingTop: 30, paddingBottom: 46, paddingHorizontal: 38 },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  headRight: { alignItems: "flex-end" },
  brandWrap: { flexDirection: "row", alignItems: "center", gap: 14 },
  partner: { fontSize: 13, fontWeight: "bold", color: C.faint, letterSpacing: 1 },
  title: { fontSize: 19, fontWeight: "bold", color: AC, textAlign: "right", letterSpacing: 0.5 },
  titleEn: { fontSize: 8.5, color: C.muted, textAlign: "right", marginTop: 1, letterSpacing: 1.5 },
  metaRow: { flexDirection: "row", marginTop: 3.5, justifyContent: "flex-end" },
  metaL: { fontSize: 8, color: C.muted, textAlign: "right", width: 96 },
  metaV: { fontSize: 8.5, fontWeight: "bold", width: 108, textAlign: "left", paddingLeft: 8 },
  accentBar: { height: 2.4, backgroundColor: AC, marginTop: 10, marginBottom: 13 },
  infoRow: { flexDirection: "row", gap: 12, marginBottom: 14 },
  card: { flex: 1, borderWidth: 0.7, borderColor: C.border, borderRadius: 3 },
  cardHead: { backgroundColor: ACS, paddingVertical: 3.5, paddingHorizontal: 8, fontSize: 7.5, fontWeight: "bold", color: AC },
  cardBody: { paddingVertical: 6, paddingHorizontal: 8 },
  cardName: { fontSize: 9.5, fontWeight: "bold" },
  cardText: { fontSize: 7.8, color: C.muted, marginTop: 2.5, lineHeight: 1.35 },
  kv: { flexDirection: "row", marginTop: 2.5 },
  kvL: { fontSize: 7.8, color: C.muted, width: 46 },
  kvV: { fontSize: 8.2, fontWeight: "bold", flex: 1 },
  tableWrap: { borderWidth: 0.7, borderColor: AC, borderRadius: 3, overflow: "hidden" },
  th: { flexDirection: "row", backgroundColor: AC },
  thCell: { paddingVertical: 5, paddingHorizontal: 8, fontSize: 8, fontWeight: "bold", color: "#ffffff", letterSpacing: 0.3 },
  tr: { flexDirection: "row", borderTopWidth: 0.5, borderColor: C.line },
  cell: { paddingVertical: 4.5, paddingHorizontal: 8, fontSize: 8.5 },
  totalWrap: { flexDirection: "row", justifyContent: "flex-end", marginTop: 8 },
  totalBox: { flexDirection: "row", alignItems: "center", backgroundColor: ACS, borderLeftWidth: 2.4, borderLeftColor: AC, paddingVertical: 5, paddingHorizontal: 12 },
  signRow: { flexDirection: "row", gap: 10, marginTop: 30 },
  signBox: { flex: 1, borderWidth: 0.7, borderColor: C.border, borderRadius: 3, overflow: "hidden", minHeight: 104 },
  signBar: { backgroundColor: ACS, paddingVertical: 4, paddingHorizontal: 8, fontSize: 8.5, fontWeight: "bold", color: AC },
  signBody: { paddingVertical: 7, paddingHorizontal: 8 },
  signCap: { fontSize: 7, color: C.faint, marginBottom: 8 },
  signLine: { fontSize: 8, color: C.muted, marginBottom: 13 },
  footer: { position: "absolute", bottom: 22, left: 38, right: 38, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 0.6, borderColor: C.line, paddingTop: 5 },
  footText: { fontSize: 6.8, color: C.faint },
});
const DN_COL = [118, 302, 56, 52];   // Product Code / Name / Size / Qty (~528)

// layout เดียวใช้ทั้งใบเบิก (mode 'issue') และใบส่งของ (mode 'delivery') — ต่างแค่หัวเรื่อง/meta/ช่องเซ็น
function WholesaleDocPage({ order, mode }: { order: OrderWithItems; mode: "issue" | "delivery" }) {
  const isEvb = String(order.platform) === "Eveandboy";
  const nkey = (x?: string | null) => (x || "").toLowerCase().replace(/[^a-z0-9ก-๙]/g, "");
  const evbOf = (it: OrderWithItems["items"][number]) => (isEvb ? EVEANDBOY_BY_KEY[`${nkey(it.product)}|${mlOf(it.size)}`] : undefined);
  const items = [...(order.items ?? [])].filter((it) => (it.product || "").trim());
  const total = items.reduce((s, it) => s + (Number(it.qty) || 0), 0);
  const addr = isEvb ? (EVEANDBOY_BRANCHES.find((b) => b.branch === order.branch)?.address || "") : "";
  const partner = platformName(order.platform).toUpperCase();
  const isDelivery = mode === "delivery";
  const title = isDelivery ? "ใบส่งของ" : "ใบเบิกสินค้า";
  const titleEn = isDelivery ? "DELIVERY NOTE" : "GOODS ISSUE FORM";
  const meta: [string, string][] = isDelivery
    ? [["Delivery No. :", "—"], ["Delivery Date :", fmtDateEN(order.doc_date)], ["PO Order No. :", T(order.order_no)]]
    : [["เลขที่ใบเบิก :", T(order.doc_no)], ["วันที่ :", fmtDateEN(order.doc_date)], ["PO Order No. :", T(order.order_no)]];
  const signs: [string, string][] = isDelivery
    ? [["From", "Sender: LAB PARFUMO"], ["Approved by", ""], ["Received by", `Recipient: ${partner}`]]
    : [["ผู้เบิก", ""], ["ผู้จ่ายสินค้า", ""], ["ผู้รับ", ""]];
  return (
    <Page size="A4" style={dn.page}>
      {/* header: โลโก้ | หัวเรื่อง + meta */}
      <View style={dn.head}>
        <View style={dn.brandWrap}>
          <Image src={LAB_PARFUMO_LOGO} style={{ height: 38, width: 38 * LAB_PARFUMO_AR }} />
          {isEvb ? <Image src={EVEANDBOY_LOGO} style={{ height: 32, width: 32 * EVEANDBOY_AR }} /> : (partner ? <Text style={dn.partner}>{partner}</Text> : null)}
        </View>
        <View style={dn.headRight}>
          <Text style={dn.title}>{T(title)}</Text>
          <Text style={dn.titleEn}>{titleEn}</Text>
          {meta.map(([l, v], i) => (
            <View key={i} style={dn.metaRow}><Text style={dn.metaL}>{l}</Text><Text style={dn.metaV}>{v || " "}</Text></View>
          ))}
        </View>
      </View>

      <View style={dn.accentBar} />

      {/* From / Deliver To — การ์ดคู่ */}
      <View style={dn.infoRow}>
        <View style={dn.card}>
          <Text style={dn.cardHead}>{isDelivery ? "FROM / ผู้ส่ง" : "ผู้เบิก / FROM"}</Text>
          <View style={dn.cardBody}>
            <Text style={dn.cardName}>{`${T(COMPANY_NAME)}  `}</Text>
            <Text style={dn.cardText}>{`${COMPANY_ADDRESS}  `}</Text>
          </View>
        </View>
        <View style={dn.card}>
          <Text style={dn.cardHead}>{isDelivery ? "DELIVER TO / ส่งถึง" : "ส่งไปที่ / DELIVER TO"}</Text>
          <View style={dn.cardBody}>
            <Text style={dn.cardName}>{partner}</Text>
            <View style={dn.kv}><Text style={dn.kvL}>Branch</Text><Text style={dn.kvV}>{T(order.branch)}</Text></View>
            {order.branch_code ? <View style={dn.kv}><Text style={dn.kvL}>รหัสสาขา</Text><Text style={dn.kvV}>{T(order.branch_code)}</Text></View> : null}
            {addr ? <Text style={dn.cardText}>{`${addr}  `}</Text> : null}
          </View>
        </View>
      </View>

      {/* table */}
      <View style={dn.tableWrap}>
        <View style={dn.th} fixed>
          {["Product Code", "Name", "Size", "Qty"].map((h, i) => (
            <Text key={i} style={[dn.thCell, { width: DN_COL[i], textAlign: i === 3 ? "right" : "left" }]}>{h}</Text>
          ))}
        </View>
        {items.map((it, i) => (
          <View key={it.id ?? i} style={[dn.tr, i % 2 === 1 ? { backgroundColor: "#faf9f7" } : {}]} wrap={false}>
            <Text style={[dn.cell, { width: DN_COL[0], letterSpacing: 0.3 }]}>{T(evbOf(it)?.barcode || it.barcode)}</Text>
            <Text style={[dn.cell, { width: DN_COL[1], fontWeight: "bold" }]}>{T(evbOf(it)?.item_name || it.product)}</Text>
            <Text style={[dn.cell, { width: DN_COL[2], color: C.muted }]}>{T(it.size)}</Text>
            <Text style={[dn.cell, { width: DN_COL[3], textAlign: "right", fontWeight: "bold" }]}>{Number(it.qty) || 0}</Text>
          </View>
        ))}
      </View>
      <View style={dn.totalWrap}>
        <View style={dn.totalBox}>
          <Text style={{ fontSize: 8.5, color: C.muted, marginRight: 22 }}>รวมทั้งสิ้น · Total</Text>
          <Text style={{ fontSize: 12, fontWeight: "bold", color: AC }}>{total}</Text>
          <Text style={{ fontSize: 8, color: C.muted, marginLeft: 4 }}>ชิ้น</Text>
        </View>
      </View>

      {/* signatures (3 ช่อง — แถบหัว) */}
      <View style={dn.signRow}>
        {signs.map(([bar, cap], i) => (
          <View key={i} style={dn.signBox}>
            <Text style={dn.signBar}>{bar}</Text>
            <View style={dn.signBody}>
              {cap ? <Text style={dn.signCap}>{cap}</Text> : null}
              <Text style={dn.signLine}>ชื่อ / Name</Text>
              <Text style={dn.signLine}>วันที่ / Date</Text>
              <Text style={dn.signLine}>ลายเซ็น / Signature</Text>
            </View>
          </View>
        ))}
      </View>

      {/* footer */}
      <View style={dn.footer} fixed>
        <Text style={dn.footText}>{`${T(COMPANY_NAME)} · ${titleEn}`}</Text>
        <Text style={dn.footText} render={({ pageNumber, totalPages }) => `${T(order.order_no)}  ·  หน้า ${pageNumber}/${totalPages}`} />
      </View>
    </Page>
  );
}

/** ใบส่งของ (Delivery Note) — ค้าส่ง */
export function DeliveryNoteDocument({ order }: { order: OrderWithItems }) {
  registerFontOnce();
  return (
    <Document title={`ใบส่งของ ${order.order_no}`} author="Lab Parfumo">
      <WholesaleDocPage order={order} mode="delivery" />
    </Document>
  );
}
