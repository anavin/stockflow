import Link from "next/link";
import { listDeletedOrders } from "@/lib/queries";
import TrashTable from "@/components/TrashTable";
import { ChevronLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TrashPage() {
  const orders = await listDeletedOrders("Shopee");
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">
      <Link href="/shopee" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ChevronLeft size={16} /> กลับ
      </Link>
      <h1 className="mb-1 text-xl font-bold text-ink">ถังขยะ</h1>
      <p className="mb-6 text-sm text-muted">{orders.length} รายการที่ถูกลบ — กู้คืนได้ หรือลบถาวร</p>
      <TrashTable orders={orders} />
    </div>
  );
}
