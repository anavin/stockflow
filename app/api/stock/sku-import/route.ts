import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/roles";
import { parseSkuWorkbook } from "@/lib/import/parse-sku";
import { receiveUnits } from "@/lib/actions/stock";
import { q } from "@/lib/db";
import { productKey } from "@/lib/config";

export const runtime = "nodejs";
export const maxDuration = 60;

type RowErr = { row: number; sku: string; reason: string };

/** นำเข้า SKU รายชิ้นจาก Excel — 1 แถว = 1 ชิ้น (Barcode+SKU) → จัดกลุ่มกลิ่น/ขนาด → receiveUnits */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  if (!can.manageStock(user.role)) return NextResponse.json({ ok: false, error: "เฉพาะผู้ดูแลระบบ / ฝ่ายคลัง" }, { status: 403 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "ไม่พบไฟล์" }, { status: 400 });
  if (file.size > 12 * 1024 * 1024) return NextResponse.json({ ok: false, error: "ไฟล์ใหญ่เกิน 12MB" }, { status: 413 });

  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf as any);
    const { rows, sheet } = parseSkuWorkbook(wb);
    if (!rows.length) return NextResponse.json({ ok: false, error: "ไม่พบชีตที่มีคอลัมน์ SKU/Barcode ในไฟล์" }, { status: 400 });

    // map: barcode → {product(master), size} ; และ set ชื่อ master สำหรับ normalize กลิ่นที่กรอกเอง
    const bcRows = await q<{ barcode: string; product: string; size: string }>(
      `select pb.barcode, coalesce(p.name, pb.scent) as product, pb.size
         from product_barcodes pb
         left join products p on regexp_replace(lower(btrim(p.name)),'[^a-z0-9ก-๙]','','g') = regexp_replace(lower(btrim(pb.scent)),'[^a-z0-9ก-๙]','','g')`,
    );
    const byBarcode = new Map(bcRows.map((r) => [r.barcode.trim(), { product: r.product, size: r.size }]));
    const master = await q<{ name: string }>(`select name from products`);
    const canon = new Map(master.map((m) => [productKey(m.name), m.name]));

    // resolve แต่ละแถว + จัดกลุ่ม + กันซ้ำในไฟล์
    const groups = new Map<string, { product: string; size: string; barcode: string; skus: string[] }>();
    const errors: RowErr[] = [];
    const seen = new Set<string>();
    let dupInFile = 0;

    for (const r of rows) {
      const sku = r.sku.trim();
      if (!sku) { errors.push({ row: r.row, sku: "", reason: "ไม่มี SKU" }); continue; }
      if (seen.has(sku)) { dupInFile++; continue; }
      seen.add(sku);

      let product = "", size = "", barcode = "";
      const hit = r.barcode ? byBarcode.get(r.barcode.trim()) : undefined;
      if (hit) { product = hit.product; size = hit.size; barcode = r.barcode.trim(); }
      else if (r.product && r.size) { product = canon.get(productKey(r.product)) ?? r.product; size = r.size; }
      else {
        errors.push({ row: r.row, sku, reason: r.barcode ? "ไม่พบบาร์โค้ดในระบบ (กรอกกลิ่น/ขนาดแทนได้)" : "ไม่ได้กรอกบาร์โค้ด หรือ กลิ่น+ขนาด" });
        continue;
      }
      const gkey = `${productKey(product)}|${size.trim().toLowerCase()}`;
      const g = groups.get(gkey) ?? { product, size, barcode, skus: [] };
      if (!g.barcode && barcode) g.barcode = barcode;
      g.skus.push(sku);
      groups.set(gkey, g);
    }

    // รับเข้าแต่ละกลุ่ม (receiveUnits จัดการ dedup กับ DB + ยอดรวม + moves เอง)
    let added = 0, dbDupes = 0;
    const summary: { product: string; size: string; added: number; balance?: number }[] = [];
    for (const g of groups.values()) {
      const res = await receiveUnits(g.product, g.size, g.skus, g.barcode);
      if (!res.ok) { errors.push({ row: 0, sku: g.skus.join(","), reason: `${g.product} ${g.size}: ${res.error}` }); continue; }
      added += res.added ?? 0;
      dbDupes += res.dupes?.length ?? 0;
      summary.push({ product: g.product, size: g.size, added: res.added ?? 0, balance: res.balance });
    }

    return NextResponse.json({
      ok: true, sheet, added, groups: summary.length,
      dupInFile, dbDupes, errors, summary,
      totalRows: rows.length,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "นำเข้าไม่สำเร็จ" }, { status: 400 });
  }
}
