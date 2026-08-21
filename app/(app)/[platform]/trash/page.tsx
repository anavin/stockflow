import Link from "next/link";
import { notFound } from "next/navigation";
import { listDeletedOrders, countDeleted } from "@/lib/queries";
import { resolvePlatform, platformBase } from "@/lib/config";
import TrashTable from "@/components/TrashTable";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { requireCreator } from "@/lib/auth/require-user";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 100;

export default async function TrashPage({ params, searchParams }: { params: Promise<{ platform: string }>; searchParams: Promise<{ page?: string }> }) {
  await requireCreator();
  const pf = resolvePlatform((await params).platform);
  if (!pf) notFound();
  const base = platformBase(pf.code);
  const pageNum = Math.max(1, Number((await searchParams).page) || 1);
  const offset = (pageNum - 1) * PAGE_SIZE;
  const [orders, total] = await Promise.all([listDeletedOrders(pf.code, PAGE_SIZE, offset), countDeleted(pf.code)]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rowFrom = total === 0 ? 0 : offset + 1;
  const rowTo = offset + orders.length;
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">
      <Link href={base} className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ChevronLeft size={16} /> กลับ
      </Link>
      <h1 className="mb-1 text-xl font-bold text-ink">ถังขยะ · {pf.name}</h1>
      <p className="mb-6 text-sm text-muted">
        {total.toLocaleString()} รายการที่ถูกลบ — กู้คืนได้ หรือลบถาวร
        {total > 0 && <span className="text-faint"> · แสดง {rowFrom.toLocaleString()}–{rowTo.toLocaleString()}</span>}
      </p>
      <TrashTable orders={orders} />
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-muted">หน้า {pageNum} / {totalPages.toLocaleString()}</span>
          <div className="flex gap-2">
            {pageNum > 1 ? <Link href={`${base}/trash?page=${pageNum - 1}`} className="btn-ghost"><ChevronLeft size={16} /> ก่อนหน้า</Link>
              : <span className="btn-ghost pointer-events-none opacity-40"><ChevronLeft size={16} /> ก่อนหน้า</span>}
            {pageNum < totalPages ? <Link href={`${base}/trash?page=${pageNum + 1}`} className="btn-ghost">ถัดไป <ChevronRight size={16} /></Link>
              : <span className="btn-ghost pointer-events-none opacity-40">ถัดไป <ChevronRight size={16} /></span>}
          </div>
        </div>
      )}
    </div>
  );
}
