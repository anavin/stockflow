import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getCurrentUser } from "@/lib/auth/session";
import { getProducts, getSizes } from "@/lib/queries";
import { q } from "@/lib/db";

export const runtime = "nodejs";

/** ดาวน์โหลดเทมเพลต Excel สำหรับนำเข้าสต๊อก — pre-fill ทุก SKU จากระบบ (SKU/กลิ่น/ขนาด/Grade) ให้กรอกแค่จำนวน */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const wb = new ExcelJS.Workbook();
  wb.creator = "Lab Parfumo";
  const ws = wb.addWorksheet("สต๊อก");
  ws.columns = [
    { header: "SKU", key: "sku", width: 18 },
    { header: "กลิ่น", key: "product", width: 32 },
    { header: "ขนาด", key: "size", width: 12 },
    { header: "Grade", key: "grade", width: 10 },
    { header: "จำนวนคงเหลือ", key: "qty", width: 15 },
  ];
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF5F3EF" } };
  ws.views = [{ state: "frozen", ySplit: 1 }];   // ตรึงหัวตารางไว้ตอนเลื่อน

  // pre-fill ทุก SKU จาก product_barcodes → map ชื่อกลิ่นเข้ากับ products master (ถ้าตรง)
  let rows: { sku: string; product: string; size: string; grade: string | null }[] = [];
  try {
    rows = await q(
      `select pb.barcode as sku,
              coalesce(p.name, pb.scent) as product,
              pb.size as size,
              coalesce(p.ptype, pb.grade) as grade
         from product_barcodes pb
         left join products p on regexp_replace(lower(btrim(p.name)),'[^a-z0-9ก-๙]','','g') = regexp_replace(lower(btrim(pb.scent)),'[^a-z0-9ก-๙]','','g')
        order by coalesce(p.ptype, pb.grade) nulls last, product,
                 coalesce(nullif(regexp_replace(pb.size,'[^0-9.]','','g'),'')::numeric,0) desc`,
    );
  } catch { /* ตาราง product_barcodes ยังไม่มี → เทมเพลตว่าง (มีตัวอย่าง) */ }

  if (rows.length) {
    for (const r of rows) ws.addRow({ sku: r.sku, product: r.product, size: r.size, grade: r.grade ?? "", qty: "" });
  } else {
    ws.addRow({ sku: "8857128011188", product: "1000 Thousand", size: "50 ml.", grade: "EDP", qty: "" });
    ws.addRow({ sku: "", product: "Aqua", size: "30 ml.", grade: "EDP", qty: "" });
  }

  ws.getColumn("qty").numFmt = "0";        // กรอกได้เฉพาะจำนวนเต็ม
  ws.getColumn("sku").font = { name: "Consolas" };

  // ชีตอ้างอิงกลิ่น/ขนาด
  const [products, sizes] = await Promise.all([getProducts(), getSizes()]);
  const ref = wb.addWorksheet("รายการอ้างอิง");
  ref.columns = [{ header: "กลิ่นทั้งหมด", key: "p", width: 34 }, { header: "ขนาดที่ใช้", key: "s", width: 14 }];
  ref.getRow(1).font = { bold: true };
  const max = Math.max(products.length, sizes.length);
  for (let i = 0; i < max; i++) ref.addRow({ p: products[i] ?? "", s: sizes[i] ?? "" });

  const buf = await wb.xlsx.writeBuffer();
  return new NextResponse(buf as any, {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent("เทมเพลตนำเข้าสต๊อก.xlsx")}`,
      "cache-control": "no-store",
    },
  });
}
