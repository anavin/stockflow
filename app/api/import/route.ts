import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getCurrentUser } from "@/lib/auth/session";
import { rowsToOrders } from "@/lib/import/parse-shopee";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Parse an uploaded .xlsx/.xls/.csv into grouped orders (preview only). */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "ไม่พบไฟล์" }, { status: 400 });

  const buf = Buffer.from(await file.arrayBuffer());
  const isCsv = /\.csv$/i.test(file.name);

  try {
    const wb = new ExcelJS.Workbook();
    if (isCsv) {
      const { Readable } = await import("node:stream");
      await wb.csv.read(Readable.from(buf.toString("utf8")) as any);
    } else {
      await wb.xlsx.load(buf as any);
    }

    // Prefer a sheet named "Shopee", else the first sheet with data.
    const ws = wb.getWorksheet("Shopee") ?? wb.worksheets.find((w) => w.rowCount > 1) ?? wb.worksheets[0];
    if (!ws) return NextResponse.json({ ok: false, error: "ไม่พบข้อมูลในไฟล์" }, { status: 400 });

    // header = first row; build array-of-objects
    const headerRow = ws.getRow(1);
    const headers: string[] = [];
    headerRow.eachCell({ includeEmpty: true }, (cell, col) => { headers[col] = String(cell.value ?? "").trim(); });

    const rows: Record<string, any>[] = [];
    ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return;
      const obj: Record<string, any> = {};
      let hasData = false;
      row.eachCell({ includeEmpty: true }, (cell, col) => {
        const h = headers[col];
        if (!h) return;
        let v: any = cell.value;
        if (v && typeof v === "object") {
          if ("text" in v) v = (v as any).text;            // rich text / hyperlink
          else if ("result" in v) v = (v as any).result;   // formula
        }
        if (v != null && v !== "") hasData = true;
        obj[h] = v;
      });
      if (hasData) rows.push(obj);
    });

    const result = rowsToOrders(rows);
    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "อ่านไฟล์ไม่สำเร็จ" }, { status: 400 });
  }
}
