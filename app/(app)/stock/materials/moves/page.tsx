import { requireStock } from "@/lib/auth/require-user";
import { listMaterialMoves } from "@/lib/queries";
import MaterialMoves from "@/components/MaterialMoves";

export const dynamic = "force-dynamic";

export default async function MaterialMovesPage({ searchParams }: { searchParams: Promise<{ cat?: string; date?: string }> }) {
  await requireStock();
  const { cat, date } = await searchParams;
  const c = cat === "bulk" || cat === "label" || cat === "packaging" ? cat : "";
  const d = /^\d{4}-\d{2}-\d{2}$/.test(date || "") ? date! : "";
  const rows = await listMaterialMoves({ category: c || undefined, date: d || undefined });
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-ink">ประวัติวัตถุดิบ & บรรจุภัณฑ์</h1>
        <p className="text-sm text-muted">รับเข้า / จ่ายออก / ปรับยอด ตามวันที่</p>
      </div>
      <MaterialMoves rows={rows} cat={c} date={d} />
    </div>
  );
}
