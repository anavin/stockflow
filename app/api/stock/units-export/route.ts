import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/roles";
import { listUnits } from "@/lib/queries";
import { platformName } from "@/lib/config";

export const runtime = "nodejs";

/** Export ติดตาม SKU เป็น Excel — ตามฟิลเตอร์ปัจจุบัน (q/status/product/size) */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!can.viewStock(user.role)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const sp = new URL(req.url).searchParams;
  const units = await listUnits({
    search: sp.get("q") || undefined, status: sp.get("status") || undefined,
    product: sp.get("product") || undefined, size: sp.get("size") || undefined,
    platform: sp.get("platform") || undefined, limit: 10000,
  });

  const wb = new ExcelJS.Workbook();
  wb.creator = "Lab Parfumo";
  const ws = wb.addWorksheet("ติดตาม SKU");
  ws.columns = [
    { header: "Barcode", key: "barcode", width: 18 },
    { header: "SKU", key: "sku", width: 20 },
    { header: "กลิ่น", key: "product", width: 30 },
    { header: "ขนาด", key: "size", width: 12 },
    { header: "Grade", key: "grade", width: 10 },
    { header: "วันที่รับเข้า", key: "received", width: 14 },
    { header: "สถานะ", key: "status", width: 12 },
    { header: "ช่องทาง", key: "platform", width: 12 },
    { header: "Order No.", key: "order", width: 20 },
    { header: "ผู้ซื้อ", key: "buyer", width: 22 },
    { header: "ผู้รับ", key: "receiver", width: 22 },
    { header: "เบอร์", key: "phone", width: 14 },
    { header: "วันที่ตัดออก", key: "issued", width: 14 },
    { header: "แหล่ง", key: "source", width: 12 },
  ];
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF5F3EF" } };
  ws.views = [{ state: "frozen", ySplit: 1 }];
  ws.getColumn("barcode").font = { name: "Consolas" };
  ws.getColumn("sku").font = { name: "Consolas" };

  const stLabel = (s: string) => s === "issued" ? "ตัดออกแล้ว" : s === "void" ? "ยกเลิก" : "อยู่คลัง";
  const d = (x: string | null) => (x ? String(x).slice(0, 10) : "");
  for (const u of units) {
    ws.addRow({
      barcode: u.barcode || "", sku: u.sku, product: u.product, size: u.size, grade: u.grade || "",
      received: d(u.received_at), status: stLabel(u.status), platform: platformName(u.platform || undefined), order: u.order_no || "",
      buyer: u.buyer || "", receiver: u.receiver || "", phone: u.phone || "",
      issued: d(u.issued_at), source: u.source === "order" ? "จากใบเบิก" : "รับเข้า",
    });
  }

  const buf = await wb.xlsx.writeBuffer();
  const today = new Date().toISOString().slice(0, 10);
  return new NextResponse(buf as any, {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(`ติดตาม-SKU-${today}.xlsx`)}`,
      "cache-control": "no-store",
    },
  });
}
