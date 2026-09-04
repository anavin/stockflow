import { requireUser } from "@/lib/auth/require-user";
import { can } from "@/lib/auth/roles";
import { getOrder, getWsData } from "@/lib/queries";
import { isWholesalePlatform } from "@/lib/config";
import { notFound } from "next/navigation";
import type { OrderWithItems } from "@/lib/types";
import type { WsData } from "@/lib/pdf/withdrawal-sp-document";
import PdfClient from "@/components/PdfClient";

export const dynamic = "force-dynamic";

/** พิมพ์ใบเบิกหลายใบเป็น PDF เดียว (client-side) — /print/pdf-bulk?orders=A,B,C */
export default async function PrintBulkPage({ searchParams }: { searchParams: Promise<{ orders?: string }> }) {
  const me = await requireUser();
  if (!can.createOrders(me.role) && !can.issueStock(me.role)) notFound();   // PII gating เท่ากับ API
  const { orders: raw } = await searchParams;
  const nos = (raw || "").split(",").map((s) => decodeURIComponent(s.trim())).filter(Boolean).slice(0, 200);
  if (!nos.length) notFound();
  const fetched = await Promise.all(nos.map((n) => getOrder(n)));
  const orders = fetched.filter((o): o is OrderWithItems => !!o);
  if (!orders.length) notFound();
  // ดึง catalog/สาขา ต่อแพลตฟอร์มค้าส่งที่มีในชุด (กัน key ชนข้ามแพลตฟอร์ม)
  const platforms = [...new Set(orders.map((o) => o.platform).filter((p): p is string => !!p && isWholesalePlatform(p)))];
  const wsByPlatform: Record<string, WsData> = {};
  await Promise.all(platforms.map(async (p) => { wsByPlatform[p] = await getWsData(p); }));
  return <PdfClient orders={orders} wsByPlatform={wsByPlatform} filename={`ใบเบิก-${orders.length}ใบ.pdf`} />;
}
