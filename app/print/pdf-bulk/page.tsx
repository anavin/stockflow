import { requireUser } from "@/lib/auth/require-user";
import { getOrder } from "@/lib/queries";
import { notFound } from "next/navigation";
import type { OrderWithItems } from "@/lib/types";
import PdfClient from "@/components/PdfClient";

export const dynamic = "force-dynamic";

/** พิมพ์ใบเบิกหลายใบเป็น PDF เดียว (client-side) — /print/pdf-bulk?orders=A,B,C */
export default async function PrintBulkPage({ searchParams }: { searchParams: Promise<{ orders?: string }> }) {
  await requireUser();
  const { orders: raw } = await searchParams;
  const nos = (raw || "").split(",").map((s) => decodeURIComponent(s.trim())).filter(Boolean).slice(0, 200);
  if (!nos.length) notFound();
  const fetched = await Promise.all(nos.map((n) => getOrder(n)));
  const orders = fetched.filter((o): o is OrderWithItems => !!o);
  if (!orders.length) notFound();
  return <PdfClient orders={orders} filename={`ใบเบิก-${orders.length}ใบ.pdf`} />;
}
