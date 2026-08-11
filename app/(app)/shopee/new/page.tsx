import Link from "next/link";
import { getProducts, getSizes, getProvinces, getPostcodes } from "@/lib/queries";
import OrderForm from "@/components/OrderForm";
import { ChevronLeft } from "lucide-react";
import { requireCreator } from "@/lib/auth/require-user";

export const dynamic = "force-dynamic";

export default async function NewOrderPage() {
  await requireCreator();
  const [products, sizes, provinces, postcodes] = await Promise.all([
    getProducts(), getSizes(), getProvinces(), getPostcodes(),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-8">
      <Link href="/shopee" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ChevronLeft size={16} /> กลับ
      </Link>
      <h1 className="mb-6 text-xl font-bold text-ink">สร้างใบเบิก Shopee</h1>
      <OrderForm products={products} sizes={sizes} provinces={provinces} postcodes={postcodes} />
    </div>
  );
}
