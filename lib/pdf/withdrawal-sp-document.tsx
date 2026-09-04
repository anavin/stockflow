/**
 * ใบเบิกสินค้า / Goods Issue Form — react-pdf document (Thai, Noto Sans Thai).
 * A4 LANDSCAPE with two panels side by side: ต้นฉบับ (Original) | สำเนา (Copy).
 *
 * NOTE on Thai: @react-pdf v4's text shaper drops the leading glyph of the
 * "ร"+"า" cluster (e.g. "รายการ"). We avoid that cluster in labels — the product
 * column is titled "สินค้า (EDP)" instead of "รายการ". Dynamic values (scent
 * names, order numbers) are Latin.
 */
import { Document, Page, Text, View, StyleSheet, Font, Svg, Rect } from "@react-pdf/renderer";
import { code128 } from "./code128";
import { COMPANY_NAME, COMPANY_NAME_EN, COMPANY_ADDRESS, isWholesalePlatform, platformName } from "@/lib/config";
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
const po = StyleSheet.create({
  page: { fontFamily: "NotoSansThai", fontSize: 8, color: C.ink, paddingVertical: 22, paddingHorizontal: 26 },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", borderBottomWidth: 1.2, borderBottomColor: C.ink, paddingBottom: 6, marginBottom: 8 },
  company: { fontSize: 12, fontWeight: "bold" },
  addr: { fontSize: 6.8, color: C.muted, marginTop: 2, maxWidth: 300 },
  docTitle: { fontSize: 13, fontWeight: "bold", textAlign: "right" },
  docSub: { fontSize: 8, color: C.muted, textAlign: "right", marginTop: 1 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 },
  field: { flexDirection: "row", marginBottom: 2.5 },
  fLabel: { color: C.muted, width: 70, fontSize: 8 },
  fVal: { fontWeight: "bold", fontSize: 9 },
  bcBox: { borderWidth: 0.8, borderColor: C.border, borderRadius: 3, padding: 6, alignItems: "center" },
  bcCap: { fontSize: 6.5, color: C.muted, marginTop: 2 },
  th: { flexDirection: "row", backgroundColor: C.soft, borderTopWidth: 0.8, borderBottomWidth: 0.8, borderColor: C.ink },
  gradeRow: { flexDirection: "row", backgroundColor: "#efece7", borderBottomWidth: 0.5, borderColor: C.border },
  tr: { flexDirection: "row", borderBottomWidth: 0.4, borderColor: C.line },
  cell: { paddingVertical: 3, paddingHorizontal: 4 },
  hCell: { fontWeight: "bold", color: C.muted },
  foot: { flexDirection: "row", borderTopWidth: 1, borderColor: C.ink, paddingTop: 3, marginTop: 1 },
  sumWrap: { flexDirection: "row", gap: 10, marginTop: 12 },
  box: { borderWidth: 0.8, borderColor: C.border, borderRadius: 3, flex: 1 },
  boxHead: { backgroundColor: C.soft, paddingVertical: 3, paddingHorizontal: 6, borderBottomWidth: 0.5, borderColor: C.border, fontSize: 8, fontWeight: "bold" },
  signRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 34, paddingHorizontal: 6 },
  sign: { width: "30%", alignItems: "center" },
  signLine: { borderTopWidth: 0.6, borderColor: C.muted, width: "100%", marginBottom: 3 },
  signLabel: { fontSize: 8, color: C.muted },
  signDate: { fontSize: 7, color: C.faint, marginTop: 4 },
});
// เรียง Grade: EDP → EDP+ → PARFUM → EDT · ขนาดในเกรด: EDT 90-50-30-10, อื่นๆ 50-30-10-4 (ขนาดอื่นต่อท้าย ใหญ่ก่อน)
const GRADE_ORDER = ["EDP", "EDP+", "PARFUM", "EDT"];
const gradeKey = (g?: string | null) => String(g || "อื่นๆ").trim().toUpperCase() || "อื่นๆ";
const gradeRank = (g?: string | null) => { const i = GRADE_ORDER.indexOf(gradeKey(g)); return i < 0 ? 99 : i; };
const sizeRank = (g?: string | null, sz?: string | null) => {
  const ml = mlOf(sz); const ord = gradeKey(g) === "EDT" ? [90, 50, 30, 10] : [50, 30, 10, 4];
  const i = ord.indexOf(ml); return i >= 0 ? i : 50 - ml / 1000;   // ขนาดนอกลิสต์ → ต่อท้าย เรียงใหญ่ก่อน
};
// column widths for PO table (# / BARCODE / ชื่อสินค้า / GRADE / ขนาด / เบิก / หน่วย) ~535pt
const POC = [20, 100, 175, 55, 55, 45, 40];

function WholesalePage({ order }: { order: OrderWithItems }) {
  const all = [...(order.items ?? [])].filter((it) => (it.product || "").trim());
  all.sort((a, b) => gradeRank(a.ptype) - gradeRank(b.ptype) || sizeRank(a.ptype, a.size) - sizeRank(b.ptype, b.size)
    || mlOf(b.size) - mlOf(a.size) || String(a.product || "").localeCompare(String(b.product || ""), "th"));
  const total = all.reduce((s, it) => s + (Number(it.qty) || 0), 0);
  // สรุปตาม Grade (เรียงตามลำดับเกรด)
  const gmap = new Map<string, { lines: number; qty: number }>();
  for (const it of all) { const k = gradeKey(it.ptype); const g = gmap.get(k) || { lines: 0, qty: 0 }; g.lines += 1; g.qty += Number(it.qty) || 0; gmap.set(k, g); }
  const grades = [...gmap.entries()].sort((a, b) => gradeRank(a[0]) - gradeRank(b[0]));

  // density: ย่อเมื่อรายการเยอะ (ย่อลงอีก ~1-2 สเต็ปจากเดิม)
  const n = all.length;
  const fs = n > 55 ? 6.2 : n > 38 ? 7 : n > 24 ? 7.6 : 8.3;
  const pv = n > 38 ? 2 : n > 24 ? 2.6 : 3.4;
  const bcH = n > 38 ? 26 : 34;
  const cell = { fontSize: fs, paddingVertical: pv };
  const isEvb = String(order.platform) === "Eveandboy";

  // แถวตาราง: แทรกหัวเกรดเมื่อเกรดเปลี่ยน
  const rows: any[] = [];
  let curGrade = " "; let idx = 0;
  for (const it of all) {
    const gk = gradeKey(it.ptype);
    if (gk !== curGrade) {
      curGrade = gk;
      rows.push(<View key={`g${gk}`} style={po.gradeRow}><Text style={[po.cell, { fontSize: fs, fontWeight: "bold" }]}>{gk}</Text></View>);
    }
    idx += 1;
    rows.push(
      <View key={`i${it.id ?? idx}`} style={po.tr} wrap={false}>
        <Text style={[po.cell, cell, { width: POC[0], color: C.faint }]}>{idx}</Text>
        <Text style={[po.cell, cell, { width: POC[1] }]}>{T(it.barcode)}</Text>
        <Text style={[po.cell, cell, { width: POC[2], fontWeight: "bold" }]}>{T(it.product)}</Text>
        <Text style={[po.cell, cell, { width: POC[3], color: C.muted }]}>{T(it.ptype)}</Text>
        <Text style={[po.cell, cell, { width: POC[4] }]}>{T(it.size)}</Text>
        <Text style={[po.cell, cell, { width: POC[5], textAlign: "right", fontWeight: "bold" }]}>{Number(it.qty) || 0}</Text>
        <Text style={[po.cell, cell, { width: POC[6] }]}>{T(it.unit)}</Text>
      </View>,
    );
  }

  return (
    <Page size="A4" style={po.page}>
      {/* header: บริษัท + ที่อยู่ | ใบเบิกสินค้า/ต้นฉบับ */}
      <View style={po.head}>
        <View>
          <Text style={po.company}>{T(COMPANY_NAME)}</Text>
          <Text style={po.addr}>{COMPANY_ADDRESS}</Text>
        </View>
        <View>
          <Text style={po.docTitle}>{T("ใบเบิกสินค้า")}</Text>
          <Text style={po.docSub}>ต้นฉบับ · {platformName(order.platform)}</Text>
        </View>
      </View>

      {/* info: PO Order No./วันที่/Branch/รหัสสาขา + barcode */}
      <View style={po.infoRow}>
        <View>
          <View style={po.field}><Text style={po.fLabel}>PO Order No. :</Text><Text style={po.fVal}>{T(order.order_no)}</Text></View>
          <View style={po.field}><Text style={po.fLabel}>วันที่ :</Text><Text style={po.fVal}>{fmtDate(order.doc_date)}</Text></View>
          <View style={po.field}><Text style={po.fLabel}>Branch :</Text><Text style={po.fVal}>{T(order.branch)}</Text></View>
          <View style={po.field}><Text style={po.fLabel}>รหัสสาขา :</Text><Text style={po.fVal}>{T(order.branch_code)}</Text></View>
          {isEvb && <View style={po.field}><Text style={po.fLabel}>PO Version :</Text><Text style={po.fVal}>{T(order.po_version)}</Text></View>}
        </View>
        <View style={po.bcBox}>
          <Barcode value={order.order_no} width={185} height={bcH} />
          <Text style={po.bcCap}>PO Order No. {T(order.order_no)}</Text>
        </View>
      </View>

      {/* table */}
      <View>
        <View style={po.th}>
          {["#", "BARCODE", "ชื่อสินค้า", "GRADE", "ขนาด", "เบิก", "หน่วย"].map((h, i) => (
            <Text key={i} style={[po.cell, po.hCell, { fontSize: fs - 0.5, width: POC[i], textAlign: i === 5 ? "right" : "left" }]}>{h}</Text>
          ))}
        </View>
        {rows}
        <View style={po.foot}>
          <Text style={[po.cell, cell, { width: POC[0] + POC[1] + POC[2] + POC[3] + POC[4], textAlign: "right", fontWeight: "bold" }]}>รวมทั้งสิ้น</Text>
          <Text style={[po.cell, cell, { width: POC[5], textAlign: "right", fontWeight: "bold" }]}>{total}</Text>
          <Text style={[po.cell, cell, { width: POC[6] }]}>ชิ้น</Text>
        </View>
      </View>

      {/* สรุปตาม Grade + หมายเหตุ */}
      <View style={po.sumWrap}>
        <View style={[po.box, { maxWidth: 240 }]}>
          <Text style={po.boxHead}>สรุปตาม Grade</Text>
          <View style={[po.th, { borderTopWidth: 0 }]}>
            <Text style={[po.cell, po.hCell, { fontSize: 7, width: 120 }]}>GRADE</Text>
            <Text style={[po.cell, po.hCell, { fontSize: 7, width: 60, textAlign: "right" }]}>รายการ</Text>
            <Text style={[po.cell, po.hCell, { fontSize: 7, width: 60, textAlign: "right" }]}>จำนวน</Text>
          </View>
          {grades.map(([g, v]) => (
            <View key={g} style={po.tr}>
              <Text style={[po.cell, { fontSize: 8, width: 120, fontWeight: "bold" }]}>{g}</Text>
              <Text style={[po.cell, { fontSize: 8, width: 60, textAlign: "right" }]}>{v.lines}</Text>
              <Text style={[po.cell, { fontSize: 8, width: 60, textAlign: "right" }]}>{v.qty}</Text>
            </View>
          ))}
          <View style={[po.foot, { marginTop: 0 }]}>
            <Text style={[po.cell, { fontSize: 8, width: 120, fontWeight: "bold" }]}>รวมทั้งสิ้น</Text>
            <Text style={[po.cell, { fontSize: 8, width: 60, textAlign: "right", fontWeight: "bold" }]}>{all.length}</Text>
            <Text style={[po.cell, { fontSize: 8, width: 60, textAlign: "right", fontWeight: "bold" }]}>{total}</Text>
          </View>
        </View>
        <View style={po.box}>
          <Text style={po.boxHead}>หมายเหตุ</Text>
          <Text style={[po.cell, { fontSize: 8, minHeight: 60 }]}>{order.note || ""}</Text>
        </View>
      </View>

      {/* signatures — ผู้เบิก / ผู้จ่าย / ผู้รับ (ไม่มีผู้ตรวจ) */}
      <View style={po.signRow}>
        {["ผู้เบิก", "ผู้จ่ายสินค้า", "ผู้รับ"].map((lbl) => (
          <View key={lbl} style={po.sign}>
            <View style={po.signLine} />
            <Text style={po.signLabel}>{`( ${lbl} )`}</Text>
            <Text style={po.signDate}>____ / ____ / ____</Text>
          </View>
        ))}
      </View>
    </Page>
  );
}

// ค้าส่ง (CTW/Eveandboy/King Power) = ใบเบิกแบบ PO เต็มแผ่น · อื่นๆ = 2 ชุดต่อหน้า
function OrderPage({ order }: { order: OrderWithItems }) {
  return isWholesalePlatform(order.platform) ? <WholesalePage order={order} /> : <OrderPageHalf order={order} />;
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
