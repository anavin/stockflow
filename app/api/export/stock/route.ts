import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getCurrentUser } from "@/lib/auth/session";
import { listStock } from "@/lib/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const rows = await listStock({ search: url.searchParams.get("q") || undefined, lowOnly: url.searchParams.get("low") === "1", limit: 5000 });

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("สต๊อก");
  ws.columns = [
    { header: "สินค้า (EDP)", key: "product", width: 34 },
    { header: "ขนาด", key: "size", width: 12 },
    { header: "จำนวนคงเหลือ", key: "qty", width: 16 },
  ];
  ws.getRow(1).font = { bold: true };
  rows.forEach((r) => ws.addRow({ product: r.product, size: r.size, qty: r.qty }));

  const buf = await wb.xlsx.writeBuffer();
  const fn = `สต๊อกคงเหลือ-${new Date().toISOString().slice(0, 10)}.xlsx`;
  return new NextResponse(buf as any, {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fn)}`,
      "cache-control": "no-store",
    },
  });
}
