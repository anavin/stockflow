import Link from "next/link";
import { notFound } from "next/navigation";
import { getProducts, getSizes, getProvinces, getPostcodes, getProductCodes, getProductTypes, getBlockedSizesForOrder } from "@/lib/queries";
import { resolvePlatform, platformBase } from "@/lib/config";
import OrderForm from "@/components/OrderForm";
import { ChevronLeft } from "lucide-react";
import { requireCreator } from "@/lib/auth/require-user";

export const dynamic = "force-dynamic";

export default async function NewOrderPage({ params }: { params: Promise<{ platform: string }> }) {
  await requireCreator();
  const pf = resolvePlatform((await params).platform);
  if (!pf) notFound();
  const base = platformBase(pf.code);
  const [products, sizes, provinces, postcodes, productCodes, productTypes, discontinued] = await Promise.all([
    getProducts(), getSizes(), getProvinces(), getPostcodes(), getProductCodes(), getProductTypes(), getBlockedSizesForOrder(),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">
      <Link href={base} className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ChevronLeft size={16} /> กลับ
      </Link>
      <h1 className="mb-6 text-xl font-bold text-ink">สร้างใบเบิก {pf.name}</h1>
      <OrderForm platform={pf.code} products={products} sizes={sizes} provinces={provinces} postcodes={postcodes} productCodes={productCodes} productTypes={productTypes} discontinued={discontinued} />
    </div>
  );
}
