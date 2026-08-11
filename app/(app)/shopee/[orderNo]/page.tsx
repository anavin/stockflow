import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrder, getProducts, getSizes, getProvinces, getPostcodes } from "@/lib/queries";
import OrderForm from "@/components/OrderForm";
import { ChevronLeft, Printer, ScanLine, PackageCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function EditOrderPage({ params }: { params: Promise<{ orderNo: string }> }) {
  const { orderNo } = await params;
  const decoded = decodeURIComponent(orderNo);
  const [order, products, sizes, provinces, postcodes] = await Promise.all([
    getOrder(decoded), getProducts(), getSizes(), getProvinces(), getPostcodes(),
  ]);
  if (!order) notFound();

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-8">
      <div className="mb-4 flex items-center justify-between">
        <Link href="/shopee" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
          <ChevronLeft size={16} /> กลับ
        </Link>
        <div className="flex items-center gap-2">
          {order.stock_issued_at ? (
            <Link href="/stock/issued" className="inline-flex items-center gap-1 rounded-md bg-green-50 px-2.5 py-1.5 text-sm font-medium text-green-700">
              <PackageCheck size={16} /> ตัดสต๊อกแล้ว
            </Link>
          ) : (
            <Link href={`/stock/issue?order=${encodeURIComponent(decoded)}`}
              className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm font-medium text-white"
              style={{ backgroundColor: "rgb(37 99 235)" }}>
              <ScanLine size={16} /> ตัดสต๊อก
            </Link>
          )}
          <a href={`/api/print/${encodeURIComponent(decoded)}`} target="_blank" rel="noreferrer" className="btn-ghost">
            <Printer size={16} /> พิมพ์ใบเบิก
          </a>
        </div>
      </div>
      <h1 className="mb-1 text-xl font-bold text-ink">แก้ไขใบเบิก</h1>
      <p className="mb-6 font-mono text-sm text-muted">{order.doc_no} · {order.order_no}</p>
      <OrderForm products={products} sizes={sizes} provinces={provinces} postcodes={postcodes} initial={order} />
    </div>
  );
}
