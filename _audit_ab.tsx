import { Document, Page, Text, Font, renderToBuffer } from "@react-pdf/renderer";
import { writeFileSync } from "fs";
import { NOTO_SANS_THAI_REGULAR, NOTO_SANS_THAI_BOLD } from "@/lib/pdf/fonts";

Font.register({ family: "NotoSansThai", fonts: [
  { src: NOTO_SANS_THAI_REGULAR, fontWeight: "normal" },
  { src: NOTO_SANS_THAI_BOLD, fontWeight: "bold" },
]});
Font.registerHyphenationCallback((w) => [w]);

// literals actually used unprotected in the document
const strings = [
  "บริษัท ทัช ไดเวอร์เจนซ์ จำกัด", // COMPANY_NAME L184
  "จำกัด",
  "หมายเหตุ",      // field label, ends ุ
  "ที่อยู่",        // ends ู+่
  "ผู้ใช้",         // ends ้
  "ซื้อครั้งที่",    // ends ่
  "ฉีดกลิ่นกล่อง",  // ends ง
  "แคมเปญ",        // ends ญ
  "หน่วย",         // header, ends ย
  "รวมทั้งสิ้น",    // ends น
  "เลขที่ใบเบิก",   // ends ก
  "วันที่",         // ends ่
  "ลูกค้าเก่า",     // ends า
  "ลูกค้าใหม่",     // ends ่
  "ส่งด่วน",        // chip ends น
  "ส่งทันที",       // chip ends ี
  "ตัดสต๊อกแล้ว",
];

const mk = (arr: string[]) => (
  <Document><Page size="A4" style={{ padding: 30, fontFamily: "NotoSansThai" }}>
    {arr.map((s2, i) => <Text key={i} style={{ fontSize: 11, fontFamily: "NotoSansThai" }}>{"|"+s2+"|"}</Text>)}
  </Page></Document>
);

async function main() {
  writeFileSync("_audit_nospace.pdf", await renderToBuffer(mk(strings) as any));
  writeFileSync("_audit_space.pdf", await renderToBuffer(mk(strings.map(x=>x+" ")) as any));
  console.log("done");
}
main().catch((e) => { console.error(e); process.exit(1); });
