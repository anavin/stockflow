import Link from "next/link";
import { requireUser } from "@/lib/auth/require-user";
import { topProducts } from "@/lib/queries";
import { ChevronLeft, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ScentsPage() {
  await requireUser();
  const all = await topProducts(500);
  const max = all[0]?.qty || 1;
  const total = all.reduce((s, p) => s + Number(p.qty), 0);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-8">
      <Link href="/" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ChevronLeft size={16} /> กลับหน้าหลัก
      </Link>
      <div className="mb-5">
        <h1 className="flex items-center gap-2 text-xl font-bold text-ink"><Sparkles size={18} className="text-brand" /> กลิ่นที่เบิกมากที่สุด</h1>
        <p className="mt-0.5 text-sm text-muted">ทั้งหมด {all.length.toLocaleString()} กลิ่น · รวม {total.toLocaleString()} ชิ้น (ทุกใบเบิกที่ยังไม่ลบ)</p>
      </div>

      <section className="card p-5">
        {all.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">ยังไม่มีข้อมูล</p>
        ) : (
          <div className="space-y-2.5">
            {all.map((p, i) => {
              const pct = Math.max(3, (Number(p.qty) / max) * 100);
              return (
                <div key={p.product} className="flex items-center gap-3">
                  <span className="w-6 text-right text-xs font-medium text-faint">{i + 1}</span>
                  <span className="w-40 shrink-0 truncate text-sm text-ink md:w-52" title={p.product}>{p.product}</span>
                  <div className="h-4 flex-1 overflow-hidden rounded-full bg-soft">
                    <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-16 shrink-0 text-right text-xs font-semibold text-ink">{Number(p.qty).toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
