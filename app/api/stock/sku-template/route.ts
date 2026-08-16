import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/roles";
import { q } from "@/lib/db";

export const runtime = "nodejs";

/** เทมเพลต Excel นำเข้า SKU รายชิ้น — 1 แถว = 1 ชิ้น (Barcode + SKU ต่อชิ้น)
 *  Barcode = EAN ต่อกลิ่น/ขนาด (คงที่, ใช้เดากลิ่น/ขนาด) · SKU = เลขรายชิ้น (ไม่ซ้ำ, user กำหนดเอง) */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!can.manageStock(user.role)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const wb = new ExcelJS.Workbook();
  wb.creator = "Lab Parfumo";

  // ── ชีตนำเข้า ──
  const ws = wb.addWorksheet("นำเข้า SKU");
  ws.columns = [
    { header: "Barcode", key: "barcode", width: 20 },
    { header: "SKU", key: "sku", width: 20 },
    { header: "กลิ่น (เว้นได้ถ้ามี Barcode)", key: "product", width: 30 },
    { header: "ขนาด (เว้นได้ถ้ามี Barcode)", key: "size", width: 24 },
  ];
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF5F3EF" } };
  ws.views = [{ state: "frozen", ySplit: 1 }];
  ws.getColumn("barcode").font = { name: "Consolas" };
  ws.getColumn("sku").font = { name: "Consolas" };

  // ตัวอย่าง 3 แถว (ใช้บาร์โค้ดจริงจากระบบถ้ามี)
  let ex: { barcode: string; product: string; size: string }[] = [];
  try {
    ex = await q(
      `select pb.barcode, coalesce(p.name, pb.scent) as product, pb.size
         from product_barcodes pb
         left join products p on regexp_replace(lower(btrim(p.name)),'[^a-z0-9ก-๙]','','g') = regexp_replace(lower(btrim(pb.scent)),'[^a-z0-9ก-๙]','','g')
        order by pb.barcode limit 2`,
    );
  } catch { /* ไม่มี product_barcodes → ใช้ placeholder */ }
  const sample = ex.length ? ex : [{ barcode: "8857128011188", product: "1000 Thousand", size: "50 ml." }];
  sample.forEach((s, i) => ws.addRow({ barcode: s.barcode, sku: `ตัวอย่าง-${String(i + 1).padStart(4, "0")}`, product: "", size: "" }));
  ws.addRow({ barcode: "", sku: "", product: "Aqua", size: "30 ml." }); // ตัวอย่างกรอกกลิ่น/ขนาดเองแบบไม่มีบาร์โค้ด

  // แถวตัวอย่างจางลง (ให้ user ลบทิ้งแล้วกรอกจริง)
  for (let r = 2; r <= ws.rowCount; r++) ws.getRow(r).font = { color: { argb: "FF9CA3AF" }, name: "Consolas" };

  // ── ชีตวิธีใช้ ──
  const help = wb.addWorksheet("วิธีใช้");
  help.columns = [{ header: "", key: "a", width: 100 }];
  [
    "วิธีนำเข้า SKU รายชิ้น",
    "",
    "• 1 แถว = สินค้า 1 ชิ้น (SKU ต้องไม่ซ้ำกันทั้งไฟล์และในระบบ — ถ้าซ้ำจะถูกข้าม)",
    "• Barcode = เลข EAN ประจำกลิ่น/ขนาด (เลขเดียวกันได้หลายชิ้น) → ระบบจะเดากลิ่น/ขนาด/Grade ให้เอง",
    "• ถ้ากลิ่น/ขนาดนั้นไม่มีบาร์โค้ดในระบบ ให้เว้น Barcode แล้วกรอกคอลัมน์ 'กลิ่น' + 'ขนาด' แทน",
    "• ลบแถวตัวอย่าง (สีเทา) ออกก่อนกรอกจริง",
    "• ดูบาร์โค้ด/กลิ่น/ขนาดที่มีในระบบได้ที่ชีต 'รายการบาร์โค้ด (อ้างอิง)'",
    "",
    "หลังกรอกเสร็จ: หน้าสต๊อก → รับสินค้าเข้าสต๊อก → นำเข้า SKU (Excel) → เลือกไฟล์นี้",
  ].forEach((t) => help.addRow({ a: t }));
  help.getRow(1).font = { bold: true, size: 13 };

  // ── ชีตอ้างอิงบาร์โค้ด ──
  const ref = wb.addWorksheet("รายการบาร์โค้ด (อ้างอิง)");
  ref.columns = [
    { header: "Barcode", key: "b", width: 20 },
    { header: "กลิ่น", key: "p", width: 32 },
    { header: "ขนาด", key: "s", width: 14 },
    { header: "Grade", key: "g", width: 10 },
  ];
  ref.getRow(1).font = { bold: true };
  ref.views = [{ state: "frozen", ySplit: 1 }];
  ref.getColumn("b").font = { name: "Consolas" };
  try {
    const rows = await q<{ b: string; p: string; s: string; g: string | null }>(
      `select pb.barcode as b, coalesce(p.name, pb.scent) as p, pb.size as s, coalesce(p.ptype, pb.grade) as g
         from product_barcodes pb
         left join products p on regexp_replace(lower(btrim(p.name)),'[^a-z0-9ก-๙]','','g') = regexp_replace(lower(btrim(pb.scent)),'[^a-z0-9ก-๙]','','g')
        order by coalesce(p.ptype, pb.grade) nulls last, p,
                 coalesce(nullif(regexp_replace(pb.size,'[^0-9.]','','g'),'')::numeric,0) desc`,
    );
    for (const r of rows) ref.addRow({ b: r.b, p: r.p, s: r.s, g: r.g ?? "" });
  } catch { /* ไม่มีตาราง → ชีตว่าง */ }

  const buf = await wb.xlsx.writeBuffer();
  return new NextResponse(buf as any, {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent("เทมเพลตนำเข้า-SKU.xlsx")}`,
      "cache-control": "no-store",
    },
  });
}
