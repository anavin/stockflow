import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/roles";
import { rowsToOrders as parseShopee, SCENT_ALIASES, suggestScents } from "@/lib/import/parse-shopee";
import { rowsToOrders as parseLazada } from "@/lib/import/parse-lazada";
import { rowsToOrders as parseTiktok } from "@/lib/import/parse-tiktok";
import { readXlsxRaw } from "@/lib/import/read-xlsx";
import { getProducts, getScentAliases } from "@/lib/queries";
import { canImportPlatform } from "@/lib/config";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Parse an uploaded .xlsx/.xls/.csv into grouped orders (preview only). */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  if (!can.createOrders(user.role)) return NextResponse.json({ ok: false, error: "ไม่มีสิทธิ์นำเข้าใบเบิก" }, { status: 403 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "ไม่พบไฟล์" }, { status: 400 });
  if (file.size > 12 * 1024 * 1024) return NextResponse.json({ ok: false, error: "ไฟล์ใหญ่เกิน 12MB" }, { status: 413 });
  const platform = String(form.get("platform") || "Shopee");
  if (!canImportPlatform(platform)) return NextResponse.json({ ok: false, error: `ยังไม่รองรับนำเข้าไฟล์ของ ${platform} (ยังไม่มีตัวอ่านไฟล์)` }, { status: 400 });

  const buf = Buffer.from(await file.arrayBuffer());
  const isCsv = /\.csv$/i.test(file.name);

  try {
    let rows: Record<string, any>[] = [];

    // TikTok Shop export เขียนทุกเซลล์เป็น t="str" แบบไม่มีสูตร → ExcelJS อ่านไม่ออก
    // ต้องอ่านด้วย reader ที่แกะ XML เอง (readXlsxRaw)
    if (platform === "Tiktok" && !isCsv) {
      rows = readXlsxRaw(buf).rows;
    } else {
      const wb = new ExcelJS.Workbook();
      if (isCsv) {
        const { Readable } = await import("node:stream");
        await wb.csv.read(Readable.from(buf.toString("utf8")) as any);
      } else {
        await wb.xlsx.load(buf as any);
      }

      // Prefer a sheet named after the platform, else the first sheet with data.
      const ws = wb.getWorksheet(platform) ?? wb.worksheets.find((w) => w.rowCount > 1) ?? wb.worksheets[0];
      if (!ws) return NextResponse.json({ ok: false, error: "ไม่พบข้อมูลในไฟล์" }, { status: 400 });

      // header = first row; build array-of-objects
      const headerRow = ws.getRow(1);
      const headers: string[] = [];
      headerRow.eachCell({ includeEmpty: true }, (cell, col) => { headers[col] = String(cell.value ?? "").trim(); });

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
          // บาง export มีหัวตารางซ้ำ (เช่น "จังหวัด"/"เขต/อำเภอ" ของที่อยู่ใบกำกับภาษี ที่มักว่าง)
          // → เก็บค่าแรกที่ไม่ว่างไว้ อย่าให้คอลัมน์ซ้ำที่ว่างมาทับค่าจริง
          if (obj[h] == null || obj[h] === "") obj[h] = v;
        });
        if (hasData) rows.push(obj);
      });

      // fallback: บาง xlsx (เซลล์ t="str") ExcelJS อ่านได้ 0 แถว → ลอง reader ดิบ
      if (rows.length === 0 && !isCsv) { try { rows = readXlsxRaw(buf).rows; } catch { /* keep empty */ } }
    }

    // ส่งรายชื่อกลิ่น + ชื่อพ้อง (alias จาก DB) ไปช่วยเดา "กลิ่น" จากชื่อสินค้า/SKU/ตัวเลือก/itemName
    const [products, dbAliases] = await Promise.all([getProducts(), getScentAliases()]);
    const aliases = { ...SCENT_ALIASES, ...dbAliases };
    const parse = platform === "Lazada" ? parseLazada : platform === "Tiktok" ? parseTiktok : parseShopee;
    const result = parse(rows, products, aliases);

    // รายการที่จับกลิ่นไม่ตรง (product ไม่อยู่ใน master) → รวม + แนะนำกลิ่นใกล้เคียงให้เลือก/จำเป็น alias
    const known = new Set(products);
    const unmap = new Map<string, { name: string; sample: string; size: string; count: number }>();
    for (const o of result.orders) for (const it of o.items) {
      if (!it.product || known.has(it.product)) continue;
      const e = unmap.get(it.product) ?? { name: it.product, sample: it.product_label || it.product, size: it.size, count: 0 };
      e.count += 1; unmap.set(it.product, e);
    }
    const unmatched = [...unmap.values()].map((u) => ({ ...u, suggestions: suggestScents(u.name, products) }));

    // เตือนไฟล์ถูกปิดบัง: TikTok ปิดบัง PII (ผู้รับ/เบอร์/ที่อยู่/ตำบล/ไปรษณีย์) ในไฟล์ export ทุกแบบ
    // (Shopee/Lazada บางไฟล์ก็ปิด) → ต้องกรอกที่อยู่เองตอนแพ็ค (ดูจากใบปะหน้า/หน้าออเดอร์)
    const maskRe = /\*{2,}/;
    let maskedOrders = 0;
    for (const o of result.orders) {
      if (maskRe.test(o.receiver || "") || maskRe.test(o.phone || "") || maskRe.test(o.address || "") || maskRe.test(o.postcode || "")) maskedOrders += 1;
    }
    const warnings: string[] = [];
    if (result.orders.length > 0 && (maskedOrders >= 2 || maskedOrders / result.orders.length >= 0.3)) {
      const tt = platform === "Tiktok";
      warnings.push(`ข้อมูลผู้รับ/เบอร์/ที่อยู่ถูกปิดบัง (***) ${maskedOrders} จาก ${result.orders.length} ออร์เดอร์` +
        (tt ? ` — TikTok ปิดบังข้อมูลนี้ในไฟล์ export ทุกแบบ (แก้ที่ต้นทางไม่ได้) กลิ่น/จำนวน/จังหวัดยังใช้ได้ ส่วนผู้รับ/ที่อยู่ให้กรอกเองตอนแพ็ค (ดูจากใบปะหน้าหรือหน้าออเดอร์ TikTok)`
           : ` — ถ้ามีไฟล์ export ที่ไม่ปิดบังให้ใช้ไฟล์นั้นแทน มิฉะนั้นต้องกรอกที่อยู่เองทุกใบ`));
    }
    return NextResponse.json({ ok: true, ...result, unmatched, products, warnings });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "อ่านไฟล์ไม่สำเร็จ" }, { status: 400 });
  }
}
