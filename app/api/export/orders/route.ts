import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/roles";
import { q } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = {
  doc_no: string | null; order_no: string; doc_date: any; channel: string | null;
  product: string | null; size: string | null; is_free: boolean; qty: number; product_label: string | null;
  username: string | null; receiver: string | null; phone: string | null; customer_type: string | null; purchase_count: number | null;
  district: string | null; province: string | null; postcode: string | null; address: string | null;
  campaign: string | null; note: string | null; stock_issued_at: any;
};

/** Export orders (one row per item) as xlsx — respects q / month filters. */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!can.createOrders(user.role)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const url = new URL(req.url);
  const search = url.searchParams.get("q") || undefined;
  const month = url.searchParams.get("month") || undefined;

  const params: any[] = ["Shopee"];
  const where = ["o.deleted_at is null", "o.platform = $1"];
  if (month) { params.push(month); where.push(`o.month_label = $${params.length}`); }
  if (search) { params.push(`%${search}%`); const p = `$${params.length}`; where.push(`(o.order_no ilike ${p} or o.doc_no ilike ${p} or o.receiver ilike ${p} or o.username ilike ${p})`); }

  const rows = await q<Row>(
    `select o.doc_no, o.order_no, o.doc_date::text as doc_date, o.channel,
            i.product, i.size, i.is_free, i.qty::float8 as qty, i.product_label,
            o.username, o.receiver, o.phone, o.customer_type, o.purchase_count,
            o.district, o.province, o.postcode, o.address, o.campaign, o.note,
            o.stock_issued_at::text as stock_issued_at
     from orders o join order_items i on i.order_no = o.order_no
     where ${where.join(" and ")}
     order by o.doc_date desc nulls last, o.order_no, i.line_no
     limit 100000`,
    params,
  );

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Shopee");
  ws.columns = [
    { header: "เลขที่ใบเบิก", key: "doc_no", width: 18 },
    { header: "Order No.", key: "order_no", width: 18 },
    { header: "วันที่", key: "doc_date", width: 12 },
    { header: "Perfume", key: "product", width: 22 },
    { header: "Size", key: "size", width: 10 },
    { header: "Free", key: "free", width: 7 },
    { header: "จำนวน", key: "qty", width: 8 },
    { header: "ชื่อสินค้า", key: "product_label", width: 24 },
    { header: "ชื่อผู้ใช้", key: "username", width: 16 },
    { header: "ชื่อผู้รับ", key: "receiver", width: 18 },
    { header: "เบอร์โทร", key: "phone", width: 14 },
    { header: "ลูกค้า", key: "customer_type", width: 12 },
    { header: "ซื้อครั้งที่", key: "purchase_count", width: 10 },
    { header: "อำเภอ/เขต", key: "district", width: 16 },
    { header: "จังหวัด", key: "province", width: 14 },
    { header: "PostCode", key: "postcode", width: 10 },
    { header: "Address", key: "address", width: 30 },
    { header: "Campaign", key: "campaign", width: 16 },
    { header: "Note", key: "note", width: 16 },
    { header: "ตัดสต๊อกแล้ว", key: "issued", width: 14 },
  ];
  ws.getRow(1).font = { bold: true };
  for (const r of rows) {
    ws.addRow({
      doc_no: r.doc_no, order_no: r.order_no, doc_date: r.doc_date, product: r.product, size: r.size,
      free: r.is_free ? "Free" : "", qty: r.qty, product_label: r.product_label, username: r.username,
      receiver: r.receiver, phone: r.phone, customer_type: r.customer_type, purchase_count: r.purchase_count,
      district: r.district, province: r.province, postcode: r.postcode, address: r.address,
      campaign: r.campaign, note: r.note, issued: r.stock_issued_at ? "✓" : "",
    });
  }

  const buf = await wb.xlsx.writeBuffer();
  const fn = `ใบเบิก-Shopee-${new Date().toISOString().slice(0, 10)}.xlsx`;
  return new NextResponse(buf as any, {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fn)}`,
      "cache-control": "no-store",
    },
  });
}
