import { Document, Page, Text, View, Font, renderToBuffer } from "@react-pdf/renderer";
import { writeFileSync } from "fs";
import { NOTO_SANS_THAI_REGULAR, NOTO_SANS_THAI_BOLD } from "@/lib/pdf/fonts";

Font.register({ family: "NotoSansThai", fonts: [
  { src: NOTO_SANS_THAI_REGULAR, fontWeight: "normal" },
  { src: NOTO_SANS_THAI_BOLD, fontWeight: "bold" },
]});
Font.registerHyphenationCallback((w) => [w]);

const S = { fontSize: 20, fontFamily: "NotoSansThai" };
// target word ends the FIRST line; a Latin token follows and wraps to line 2.
const cases = [
  { w: "ไปรษณีย์", pre: "12 34" },   // ends karan ์
  { w: "สิ้น", pre: "12 3456" },     // ends น with ้ above ิ
  { w: "เก่า", pre: "12 3456 78" },  // ends า
  { w: "ที่", pre: "123 456 78" },   // ends ่ over ี
];
const doc = (
  <Document><Page size="A4" style={{ padding: 30, fontFamily: "NotoSansThai" }}>
    <Text style={{ fontSize: 11, marginBottom: 6 }}>Target word ENDS line 1 (width 170), compare final mark vs standalone:</Text>
    {cases.map((c, i) => (
      <View key={i} style={{ flexDirection: "row", marginBottom: 10, alignItems: "flex-start" }}>
        <View style={{ width: 170, borderWidth: 0.5, marginRight: 14 }}>
          <Text style={S}>{`${c.pre} ${c.w} 999999999`}</Text>
        </View>
        <Text style={S}>{`ref: ${c.w}`}</Text>
      </View>
    ))}
  </Page></Document>
);
async function main(){ writeFileSync("_audit_wrap.pdf", await renderToBuffer(doc as any)); console.log("done"); }
main().catch((e)=>{console.error(e);process.exit(1);});
