import Link from "next/link";
import { requireCreator } from "@/lib/auth/require-user";
import { tryMeStats } from "@/lib/queries";
import { platformName, platformColor } from "@/lib/config";
import { FlaskConical, Gift } from "lucide-react";

export const dynamic = "force-dynamic";

// สถิติ Try Me (เทสเตอร์) — นับจากบรรทัด "TRY ME" ในใบเบิกค้าส่ง · การเบิกทำในหน้าใบเบิก (ปุ่ม + Try Me)
export default async function TryMePage() {
  await requireCreator();
  const { byPlatform, byScent, recent, total } = await tryMeStats();
  const maxP = Math.max(1, ...byPlatform.map((r) => r.qty));
  const fmt = (s: string) => new Date(s).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-8">
      <h1 className="mb-1 flex items-center gap-2 text-xl font-bold text-ink"><FlaskConical size={20} className="text-brand" /> Try Me · เทสเตอร์</h1>
      <p className="mb-5 flex items-center gap-1.5 text-sm text-muted">
        <Gift size={14} /> เทสเตอร์เบิกฟรีไปกับใบเบิกค้าส่ง — เบิกที่หน้า <b className="text-ink">ใบเบิก CTW / Eveandboy / King Power</b> (ปุ่ม “+ Try Me”)
      </p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* per platform */}
        <section className="card p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink"><Gift size={15} className="text-brand" /> เบิกแล้วต่อแพลตฟอร์ม <span className="text-xs font-normal text-muted">รวม {total.toLocaleString()} ชิ้น</span></h2>
          {byPlatform.length === 0 ? <p className="py-2 text-xs text-muted">ยังไม่มีการเบิก Try Me</p> : (
            <div className="space-y-2.5">
              {byPlatform.map((r) => (
                <div key={r.platform} className="flex items-center gap-3 text-sm">
                  <span className="w-24 shrink-0 truncate text-ink">{platformName(r.platform)}</span>
                  <div className="h-3 flex-1 overflow-hidden rounded-full bg-soft">
                    <div className="h-full rounded-full" style={{ width: `${Math.round((r.qty / maxP) * 100)}%`, backgroundColor: platformColor(r.platform) }} />
                  </div>
                  <span className="w-20 shrink-0 text-right tabular-nums text-ink">{r.qty.toLocaleString()} <span className="text-faint">ชิ้น</span></span>
                  <span className="w-16 shrink-0 text-right text-xs text-faint">{r.orders} ใบ</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* top scents */}
        <section className="card p-5">
          <h2 className="mb-3 text-sm font-semibold text-ink">กลิ่นที่เบิกมากสุด</h2>
          {byScent.length === 0 ? <p className="py-2 text-xs text-muted">—</p> : (
            <div className="max-h-64 space-y-1.5 overflow-y-auto">
              {byScent.map((r, i) => (
                <div key={`${r.scent}|${r.size}`} className="flex items-center gap-2 text-sm">
                  <span className="w-4 shrink-0 text-right text-xs text-faint">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-ink">{r.scent} <span className="text-faint">{r.size}</span></span>
                  <span className="shrink-0 tabular-nums text-brand-600">{r.qty.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* recent */}
      <section className="card mt-4 overflow-hidden">
        <div className="border-b border-line px-5 py-3 text-sm font-semibold text-ink">ประวัติล่าสุด</div>
        {recent.length === 0 ? <p className="p-5 text-center text-xs text-muted">ยังไม่มีประวัติ</p> : (
          <div className="max-h-96 divide-y divide-line/70 overflow-y-auto">
            {recent.map((r, i) => (
              <Link key={`${r.order_no}-${i}`} href={`/${(r.platform || "Shopee").toLowerCase()}/${encodeURIComponent(r.order_no)}`}
                className="flex items-center gap-2 px-4 py-2 text-xs hover:bg-soft">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: platformColor(r.platform) }} title={platformName(r.platform)} />
                <span className="min-w-0 flex-1 truncate text-ink"><b>{r.scent}</b> <span className="text-faint">{r.size}</span></span>
                <span className="shrink-0 tabular-nums text-brand-600">×{r.qty}</span>
                <span className="hidden shrink-0 font-mono text-faint sm:inline">{r.order_no}</span>
                <span className="shrink-0 text-faint">{fmt(r.created_at)}</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
