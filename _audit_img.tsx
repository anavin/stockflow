import { Document, Page, Text, Font, renderToBuffer } from "@react-pdf/renderer";
import { writeFileSync } from "fs";
import { NOTO_SANS_THAI_REGULAR, NOTO_SANS_THAI_BOLD } from "@/lib/pdf/fonts";

Font.register({ family: "NotoSansThai", fonts: [
  { src: NOTO_SANS_THAI_REGULAR, fontWeight: "normal" },
  { src: NOTO_SANS_THAI_BOLD, fontWeight: "bold" },
]});
Font.registerHyphenationCallback((w) => [w]);

const rows = ["รายการ", "ราชาเทวะ", "รวมทั้งสิ้น", "หมายเหตุ", "ที่อยู่", "ผู้รับ อนาวิน"];
const doc = (
  <Document><Page size="A4" style={{ padding: 40, fontFamily: "NotoSansThai" }}>
    {rows.map((s2, i) => <Text key={i} style={{ fontSize: 26, fontFamily: "NotoSansThai", marginBottom: 14 }}>{s2}</Text>)}
  </Page></Document>
);
async function main(){ writeFileSync("_audit_img.pdf", await renderToBuffer(doc as any)); console.log("done"); }
main().catch((e)=>{console.error(e);process.exit(1);});
