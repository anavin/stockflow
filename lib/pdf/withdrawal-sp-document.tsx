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
import { code39 } from "./code39";
import { COMPANY_NAME, COMPANY_NAME_EN } from "@/lib/config";
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

const T = (s: any) => (s == null || s === "" ? "-" : String(s));
const C = { ink: "#1a1614", muted: "#6b645d", faint: "#9a938c", border: "#cfc9c1", soft: "#f5f3ef", brand: "#ee4d2d", line: "#e6e1da" };

const s = StyleSheet.create({
  // A4 landscape content height = 595.28 - padding(40) ≈ 555 → ล็อกกล่องใบ = 552 (ทุกใบสูงเท่ากัน ขอบบน/ล่างตรงกัน)
  page: { fontFamily: "NotoSansThai", fontSize: 8, color: C.ink, paddingVertical: 20, paddingHorizontal: 20 },
  pageRow: { flexDirection: "row", alignItems: "stretch" },
  panel: { flex: 1, height: 552, borderWidth: 1, borderColor: C.ink, padding: 9, flexDirection: "column" },
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

// column widths for a ~378pt panel (# / สินค้า / ขนาด / จำนวน / Free / หน่วย / SKU)
const COL = [18, 138, 44, 36, 30, 34, 62];

function Barcode({ value, width = 250, height = 50 }: { value: string; width?: number; height?: number }) {
  const bc = code39(value);
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
      <Text style={s.fLabel}>{label}</Text>
      <Text style={s.fVal}>{T(value)}</Text>
    </View>
  );
}

function Sign({ label }: { label: string }) {
  return (
    <View style={s.sign}>
      <View style={s.signLine} />
      <Text style={s.signLabel}>{`( ${label} )`}</Text>
    </View>
  );
}

function fmtDate(d?: any) {
  if (!d) return "-";
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return String(d).slice(0, 10);
}

function Panel({ order, copyLabel }: { order: OrderWithItems; copyLabel: string }) {
  const items = order.items ?? [];
  const total = items.reduce((sum, it) => sum + (Number(it.qty) || 0), 0);
  const addr = [order.address, order.subdistrict, order.district, order.province, order.postcode].filter(Boolean).join(" ");

  // Density: shrink rows/fonts for big orders so it all fits ONE landscape page.
  // เพิ่มระดับย่อสำหรับใบใหญ่มาก (40–50 รายการ) กันตกขอบเงียบๆ.
  const n = items.length;
  const rowH = n > 40 ? 6.3 : n > 31 ? 7.4 : n > 22 ? 9.5 : n > 14 ? 11 : 14;
  const cfs = n > 40 ? 5.4 : n > 31 ? 6 : n > 22 ? 6.6 : n > 14 ? 7 : 7.5;
  const pv = n > 31 ? 0.8 : n > 14 ? 1.3 : 2.5;
  const signGap = n > 31 ? 3 : n > 14 ? 6 : 14;
  const bcH = n > 31 ? 22 : n > 14 ? 26 : 34;   // barcode เล็กลงเมื่อออร์เดอร์ใหญ่ กันล้น
  const rowStyle = { minHeight: rowH };
  const cStyle = { fontSize: cfs, paddingVertical: pv };

  return (
    <View style={s.panel}>
      {/* header */}
      <View style={s.head}>
        <View>
          <Text style={s.company}>{COMPANY_NAME}</Text>
          <Text style={s.companyEn}>{COMPANY_NAME_EN}</Text>
        </View>
        <View style={s.titleWrap}>
          <Text style={s.docTitle}>ใบเบิกสินค้า</Text>
          <Text style={s.docSub}>Goods Issue Form</Text>
          <Text style={s.badge}>{copyLabel}</Text>
        </View>
      </View>

      {/* band: shop / doc no / date */}
      <View style={s.band}>
        <View style={s.bandCell}><Text style={s.bandLabel}>Shop</Text><Text style={s.bandVal}>{T(order.platform)}</Text></View>
        <View style={s.bandCell}><Text style={s.bandLabel}>เลขที่ใบเบิก</Text><Text style={s.bandVal}>{T(order.doc_no)}</Text></View>
        <View style={[s.bandCell, { borderRightWidth: 0 }]}><Text style={s.bandLabel}>วันที่</Text><Text style={s.bandVal}>{fmtDate(order.doc_date)}</Text></View>
      </View>

      {/* Order No. + barcode (แนวนอน: เลขซ้าย บาร์โค้ดขวา) */}
      <View style={s.bcRow}>
        <View style={s.bcLeft}>
          <Text style={s.bcLabel}>Order No.</Text>
          <Text style={s.bcValue}>{T(order.order_no)}</Text>
        </View>
        <View style={s.bcRight}>
          <Barcode value={order.order_no} width={185} height={bcH} />
          <Text style={s.bcText}>{`*${order.order_no}*`}</Text>
        </View>
      </View>

      {/* info fields */}
      <View style={s.grid}>
        <Field label="ชื่อลูกค้า" value={order.shop_name} />
        <Field label="ชื่อผู้ใช้" value={order.username} />
        <Field label="ผู้รับ" value={order.receiver} />
        <Field label="เบอร์โทร" value={order.phone} />
        <Field label="ลูกค้า" value={order.customer_type} />
        <Field label="ซื้อครั้งที่" value={order.purchase_count} />
        <Field label="ที่อยู่" value={addr} full />
        <Field label="แคมเปญ" value={order.campaign} />
        <Field label="ฉีดกลิ่นกล่อง" value={order.box_scent} />
        {order.note ? <Field label="หมายเหตุ" value={order.note} full /> : null}
      </View>

      {/* items table */}
      <View>
        <View style={s.th}>
          {["#", "สินค้า (EDP)", "ขนาด", "จำนวน", "Free", "หน่วย", "SKU"].map((h, i) => (
            <Text key={i} style={[s.cell, s.hCell, { width: COL[i], textAlign: i === 3 ? "right" : "left" }]}>{h}</Text>
          ))}
        </View>
        {items.map((it, i) => (
          <View key={i} style={[s.tr, rowStyle]} wrap={false}>
            <Text style={[s.cell, cStyle, { width: COL[0], color: C.faint }]}>{i + 1}</Text>
            <Text style={[s.cell, cStyle, { width: COL[1], fontWeight: "bold" }]}>{T(it.product)}</Text>
            <Text style={[s.cell, cStyle, { width: COL[2] }]}>{T(it.size)}</Text>
            <Text style={[s.cell, cStyle, { width: COL[3], textAlign: "right", fontWeight: "bold" }]}>{Number(it.qty) || 0}</Text>
            <Text style={[s.cell, cStyle, { width: COL[4], color: it.is_free ? C.brand : C.faint }]}>{it.is_free ? "Free" : "-"}</Text>
            <Text style={[s.cell, cStyle, { width: COL[5] }]}>{T(it.unit)}</Text>
            <Text style={[s.cell, cStyle, { width: COL[6], fontSize: cfs - 0.8 }]}>{T(it.sku)}</Text>
          </View>
        ))}
        <View style={s.foot}>
          <Text style={[s.cell, cStyle, { width: COL[0] + COL[1] + COL[2], textAlign: "right", fontWeight: "bold" }]}>รวมทั้งสิ้น</Text>
          <Text style={[s.cell, cStyle, { width: COL[3], textAlign: "right", fontWeight: "bold" }]}>{total}</Text>
          <Text style={[s.cell, cStyle, { width: COL[4] + COL[5] + COL[6] }]}> </Text>
        </View>
      </View>

      {/* เว้นว่างตรงกลาง (ไม่มีเส้น/เลข) ดันลายเซ็นไปล่างสุด — กล่องใบสูงคงที่ ขอบบน/ล่างตรงกันทุกใบ */}
      <View style={s.spacer} />

      {/* signatures — ล็อกอยู่ท้ายเอกสาร (ตำแหน่งเดิมทุกใบ) */}
      <View style={[s.signRow, { marginTop: signGap }]}>
        <Sign label="ผู้เบิก" />
        <Sign label="ผู้ตรวจ" />
        <Sign label="ผู้รับสินค้า" />
      </View>
    </View>
  );
}

export function WithdrawalDocument({ order }: { order: OrderWithItems }) {
  registerFontOnce();
  return (
    <Document title={`ใบเบิก ${order.doc_no || order.order_no}`} author="Lab Parfumo">
      <Page size="A4" orientation="landscape" style={s.page}>
        <View style={s.pageRow}>
          <Panel order={order} copyLabel="ต้นฉบับ · ORIGINAL" />
          <View style={s.divider}>
            <View style={s.dividerLine} />
            <Text style={s.cutLabel}>ตัด</Text>
            <View style={s.dividerLine} />
          </View>
          <Panel order={order} copyLabel="สำเนา · COPY" />
        </View>
      </Page>
    </Document>
  );
}
