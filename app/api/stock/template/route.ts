import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getCurrentUser } from "@/lib/auth/session";
import { getProducts, getSizes } from "@/lib/queries";

export const runtime = "nodejs";

/** ดาวน์โหลดเทมเพลต Excel สำหรับนำเข้าสต๊อก (สินค้า / ขนาด / จำนวนคงเหลือ) */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const wb = new ExcelJS.Workbook();
  wb.creator = "Lab Parfumo";
  const ws = wb.addWorksheet("สต๊อก");

  ws.columns = [
    { header: "สินค้า (EDP)", key: "product", width: 34 },
    { header: "ขนาด", key: "size", width: 14 },
    { header: "จำนวนคงเหลือ", key: "qty", width: 16 },
  ];
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF5F3EF" } };

  // ตัวอย่างข้อมูล
  ws.addRow({ product: "DionysusX", size: "50 ml", qty: 10 });
  ws.addRow({ product: "Aqua", size: "30 ml", qty: 8 });
  ws.addRow({ product: "Legend of OUD", size: "10 ml", qty: 20 });

  // ชีตอ้างอิงรายชื่อกลิ่น + ขนาดที่ใช้ได้ (ไว้ก๊อป)
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
