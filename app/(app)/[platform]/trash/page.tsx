import Link from "next/link";
import { notFound } from "next/navigation";
import { listDeletedOrders } from "@/lib/queries";
import { resolvePlatform, platformBase } from "@/lib/config";
import TrashTable from "@/components/TrashTable";
import { ChevronLeft } from "lucide-react";
import { requireCreator } from "@/lib/auth/require-user";

export const dynamic = "force-dynamic";

export default async function TrashPage({ params }: { params: Promise<{ platform: string }> }) {
  await requireCreator();
  const pf = resolvePlatform((await params).platform);
  if (!pf) notFound();
  const base = platformBase(pf.code);
  const orders = await listDeletedOrders(pf.code);
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">
      <Link href={base} className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ChevronLeft size={16} /> กลับ
      </Link>
      <h1 className="mb-1 text-xl font-bold text-ink">ถังขยะ · {pf.name}</h1>
      <p className="mb-6 text-sm text-muted">{orders.length} รายการที่ถูกลบ — กู้คืนได้ หรือลบถาวร</p>
      <TrashTable orders={orders} />
    </div>
  );
}
