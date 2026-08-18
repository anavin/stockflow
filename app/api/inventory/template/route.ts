import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/roles";
import { q } from "@/lib/db";
import { listBulkStock, listLabelStock, listPackagingStock } from "@/lib/queries";
import { bulkRef, labelRef } from "@/lib/materials";

export const runtime = "nodejs";

const HEAD_FILL = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFF5F3EF" } };
const NOTE_FILL = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFFFF7E6" } };

/** เทมเพลตอัปเดตยอดสต๊อก — 1 ไฟล์ 4 ชีต pre-fill ทุก SKU · กรอกแค่ช่อง "นับได้จริง" */
export async function GET() {
  const user = await getCurrentUser();
  if (!user || !can.manageStock(user.role)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const wb = new ExcelJS.Workbook();
  wb.creator = "Lab Parfumo";

  const styleHead = (ws: ExcelJS.Worksheet, countCol: string) => {
    ws.getRow(1).font = { bold: true };
    ws.getRow(1).eachCell((c) => { c.fill = HEAD_FILL; });
    ws.getCell(`${countCol}1`).fill = NOTE_FILL;   // เน้นช่องที่ต้องกรอก
    ws.views = [{ state: "frozen", ySplit: 1 }];
  };

  // ── (1) สินค้าสำเร็จรูป — จาก product_barcodes (SKU จริง) + ยอดปัจจุบันจาก stock ──
  const fg = wb.addWorksheet("สำเร็จรูป");
  fg.columns = [
    { header: "กลิ่น", key: "product", width: 32 },
    { header: "ขนาด", key: "size", width: 12 },
    { header: "Grade", key: "grade", width: 10 },
    { header: "คงเหลือปัจจุบัน", key: "cur", width: 15 },
    { header: "นับได้จริง (กรอก)", key: "count", width: 18 },
  ];
  let fgRows: { product: string; size: string; grade: string | null; cur: number }[] = [];
  try {
    fgRows = await q(
      `select coalesce(p.name, pb.scent) as product, pb.size as size,
              coalesce(p.ptype, pb.grade) as grade,
              coalesce(s.qty, 0)::float8 as cur
         from product_barcodes pb
         left join products p on regexp_replace(lower(btrim(p.name)),'[^a-z0-9ก-๙]','','g') = regexp_replace(lower(btrim(pb.scent)),'[^a-z0-9ก-๙]','','g')
         left join stock s on s.product = coalesce(p.name, pb.scent) and regexp_replace(lower(s.size),'[^0-9a-z]','','g') = regexp_replace(lower(pb.size),'[^0-9a-z]','','g')
        order by coalesce(p.ptype, pb.grade) nulls last, product,
                 coalesce(nullif(regexp_replace(pb.size,'[^0-9.]','','g'),'')::numeric,0)`);
  } catch { /* ไม่มีตาราง → เว้นว่าง */ }
  for (const r of fgRows) fg.addRow({ product: r.product, size: r.size, grade: r.grade ?? "", cur: r.cur, count: "" });
  styleHead(fg, "E");

  // helper: ชีตวัตถุดิบ มีคอลัมน์ "รหัส (ห้ามแก้)" ท้ายสุด = category|ref_key
  const [bulk, labels, packaging] = await Promise.all([listBulkStock(), listLabelStock(), listPackagingStock()]);
  // จัดเรียงตามเกรดให้ตรงกับหน้าใหม่: EDP → EDP+ → PARFUM → EDT → อื่นๆ (น้ำปรุง ฯลฯ) → OEM ล่างสุด
  const GRADE_ORDER = ["EDP", "EDP+", "PARFUM", "EDT"];
  const grank = (g: string | null) => { const i = GRADE_ORDER.indexOf((g || "").toUpperCase()); return i < 0 ? GRADE_ORDER.length : i; };
  const bulkSorted = [...bulk].sort((a, b) =>
    (a.brand === "Lab Parfumo" ? 0 : 1) - (b.brand === "Lab Parfumo" ? 0 : 1) ||   // OEM ล่างสุด
    grank(a.grade) - grank(b.grade) || (a.grade || "").localeCompare(b.grade || "") || a.scent.localeCompare(b.scent, "en"));
  const labelsSorted = [...labels].sort((a, b) => grank(a.grade) - grank(b.grade) || a.grade.localeCompare(b.grade) || a.scent.localeCompare(b.scent, "en"));

  // ── (2) น้ำหอม (ml) ──
  const bw = wb.addWorksheet("น้ำหอม");
  bw.columns = [
    { header: "กลิ่น", key: "scent", width: 30 }, { header: "Brand", key: "brand", width: 14 },
    { header: "Grade", key: "grade", width: 10 }, { header: "คงเหลือ (ml)", key: "cur", width: 14 },
    { header: "นับได้จริง (กรอก)", key: "count", width: 18 }, { header: "รหัส (ห้ามแก้)", key: "key", width: 26 },
  ];
  for (const r of bulkSorted) bw.addRow({ scent: r.scent, brand: r.brand, grade: r.grade ?? "", cur: r.qty, count: "", key: `bulk|${bulkRef(r.scent, r.brand)}` });
  styleHead(bw, "E");

  // ── (3) สติ๊กเกอร์ & การ์ด ──
  const lw = wb.addWorksheet("สติ๊กเกอร์");
  lw.columns = [
    { header: "กลิ่น", key: "scent", width: 28 }, { header: "Grade", key: "grade", width: 10 },
    { header: "ชิ้นส่วน", key: "comp", width: 26 }, { header: "คงเหลือ", key: "cur", width: 12 },
    { header: "นับได้จริง (กรอก)", key: "count", width: 18 }, { header: "รหัส (ห้ามแก้)", key: "key", width: 30 },
  ];
  for (const s of labelsSorted) for (const c of s.components) lw.addRow({ scent: s.scent, grade: s.grade, comp: c.label, cur: c.qty, count: "", key: `label|${labelRef(s.scent, c.key)}` });
  styleHead(lw, "E");

  // ── (4) ขวด & แพ็คเกจ ──
  const pw = wb.addWorksheet("ขวดและแพ็คเกจ");
  pw.columns = [
    { header: "รายการ", key: "label", width: 34 }, { header: "หมวด", key: "cat", width: 16 },
    { header: "คงเหลือ", key: "cur", width: 12 }, { header: "นับได้จริง (กรอก)", key: "count", width: 18 },
    { header: "รหัส (ห้ามแก้)", key: "key", width: 20 },
  ];
  for (const r of packaging) pw.addRow({ label: r.label, cat: r.category, cur: r.qty, count: "", key: `packaging|${r.ref_key}` });
  styleHead(pw, "D");

  const buf = await wb.xlsx.writeBuffer();
  const today = new Date().toISOString().slice(0, 10);
  return new NextResponse(buf as any, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="stock-count-template-${today}.xlsx"`,
    },
  });
}
