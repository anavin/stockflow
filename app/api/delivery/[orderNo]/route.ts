import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getOrder } from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/roles";
import { isWholesalePlatform } from "@/lib/config";
import { DeliveryNoteDocument } from "@/lib/pdf/withdrawal-sp-document";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** ใบส่งของ (Delivery Note) — ค้าส่ง (Eveandboy/CTW/King Power) */
export async function GET(_req: Request, ctx: { params: Promise<{ orderNo: string }> }) {
  const user = await getCurrentUser();
  if (!user || !(can.createOrders(user.role) || can.issueStock(user.role))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { orderNo } = await ctx.params;
  const order = await getOrder(decodeURIComponent(orderNo));
  if (!order) return NextResponse.json({ error: "not found" }, { status: 404 });
  // ใบส่งของมีเฉพาะค้าส่ง (CTW/Eveandboy/King Power) — กันเรียก URL ตรงกับออเดอร์ปลีก
  if (!isWholesalePlatform(order.platform))
    return NextResponse.json({ error: "ใบส่งของมีเฉพาะแพลตฟอร์มค้าส่ง" }, { status: 400 });
  // กันออกใบส่งของก่อนของออกจริง — ต้องตัดสต๊อกหรือส่งแล้วเท่านั้น
  if (!order.stock_issued_at && !order.shipped_at)
    return NextResponse.json({ error: "ออกใบส่งของได้หลังตัดสต๊อกหรือส่งแล้วเท่านั้น" }, { status: 409 });

  try {
    const buffer = await renderToBuffer(DeliveryNoteDocument({ order }) as any);
    const filename = `ใบส่งของ-${order.order_no}.pdf`;
    return new NextResponse(buffer as any, {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `inline; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "cache-control": "no-store",
      },
    });
  } catch (e: any) {
    console.error("[delivery] render failed:", e?.message);
    return NextResponse.json({ error: "สร้าง PDF ไม่สำเร็จ", detail: e?.message }, { status: 500 });
  }
}
