import Link from "next/link";
import { notFound } from "next/navigation";
import { getProducts, getSizes, getProvinces, getPostcodes, getProductCodes, getProductTypes, getBlockedSizesForOrder } from "@/lib/queries";
import { resolvePlatform, platformBase, canCreatePlatform, platformColor, platformTint } from "@/lib/config";
import OrderForm from "@/components/OrderForm";
import { ChevronLeft } from "lucide-react";
import { requireCreator } from "@/lib/auth/require-user";

export const dynamic = "force-dynamic";

export default async function NewOrderPage({ params }: { params: Promise<{ platform: string }> }) {
  await requireCreator();
  const pf = resolvePlatform((await params).platform);
  if (!pf) notFound();
  if (!canCreatePlatform(pf.code)) notFound();   // เฉพาะแพลตฟอร์มที่ canCreate:true (CTW = คลังกลางสร้างเอง)
  const base = platformBase(pf.code);
  const [products, sizes, provinces, postcodes, productCodes, productTypes, discontinued] = await Promise.all([
    getProducts(), getSizes(), getProvinces(), getPostcodes(), getProductCodes(), getProductTypes(), getBlockedSizesForOrder(),
  ]);

  const pfColor = platformColor(pf.code);
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">
      <div className="mb-5 h-1 w-full rounded-full" style={{ backgroundColor: pfColor }} />
      <Link href={base} className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ChevronLeft size={16} /> กลับ
      </Link>
      <div className="mb-6 flex items-center gap-2">
        <h1 className="text-xl font-bold text-ink">สร้างใบเบิก</h1>
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold"
          style={{ color: pfColor, backgroundColor: platformTint(pf.code) }}>
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: pfColor }} /> {pf.name}
        </span>
      </div>
      <OrderForm platform={pf.code} products={products} sizes={sizes} provinces={provinces} postcodes={postcodes} productCodes={productCodes} productTypes={productTypes} discontinued={discontinued} />
    </div>
  );
}
