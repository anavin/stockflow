/**
 * รายงานสรุปประจำวัน Shopee (ขาว A4 ดำ-บน-ขาว) — ลอกสไตล์จากโครงการ CTW
 * (lab-parfumo-central/components/DailyReportSheet) แต่ปรับเนื้อหาเป็นระบบใบเบิก:
 * ไม่มีราคา/ช่องทางจ่าย/สัญชาติ → ใช้ ออเดอร์ / ชิ้น / สถานะตัด-ส่ง / กลิ่นเบิกมากสุด แทน.
 */
import type { DayOrderRow } from "@/lib/queries";

const nf = (n: number) => Math.round(n || 0).toLocaleString("en-US");
const thaiDate = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const statusText = (r: DayOrderRow) => (r.shipped ? "ส่งแล้ว" : r.issued ? "ตัดสต๊อกแล้ว" : "รอตัดสต๊อก");
const returnText = (s: string | null) => (s === "full" ? "คืนแล้ว" : s === "partial" ? "คืนบางส่วน" : "");

const Kpi = ({ label, value, primary = false }: { label: string; value: string; primary?: boolean }) => (
  <div className={`border rounded-lg px-3 py-2.5 ${primary ? "border-black border-2" : "border-neutral-400"}`}>
    <div className="text-[10px] uppercase tracking-wide text-neutral-500">{label}</div>
    <div className={`tabular-nums font-bold leading-tight ${primary ? "text-[22px]" : "text-lg"}`}>{value}</div>
  </div>
);
const SecTitle = ({ children }: { children: React.ReactNode }) => (
  <div className="text-[11px] font-bold uppercase tracking-wide text-neutral-500 border-b border-black pb-1 mb-2">{children}</div>
);
const KV = ({ k, v }: { k: string; v: string }) => (
  <div className="flex justify-between items-baseline py-1 border-b border-dashed border-neutral-300 text-[13px]">
    <span>{k}</span><span className="font-semibold tabular-nums">{v}</span>
  </div>
);

export function DailyReportSheet({ date, rows, showDetail = true, generatedAt }: {
  date: string; rows: DayOrderRow[]; showDetail?: boolean; generatedAt: string;
}) {
  const ready = rows.length > 0;
  const orders = rows.length;
  const totalQty = rows.reduce((s, r) => s + (r.qty || 0), 0);
  const issued = rows.filter((r) => r.issued).length;
  const shipped = rows.filter((r) => r.shipped).length;
  const pending = rows.filter((r) => !r.issued).length;
  const returned = rows.filter((r) => r.return_status && r.return_status !== "none").length;
  const freeQty = rows.reduce((s, r) => s + (r.items || []).filter((i) => i.is_free).reduce((x, i) => x + (i.qty || 0), 0), 0);

  // กลิ่นที่เบิกมากสุด (นับเฉพาะที่ขาย ไม่รวมของแถม)
  const top = (() => {
    const m = new Map<string, number>();
    for (const r of rows) for (const i of r.items || []) if (!i.is_free) m.set(i.product, (m.get(i.product) || 0) + (i.qty || 0));
    return [...m.entries()].map(([product, qty]) => ({ product, qty })).sort((a, b) => b.qty - a.qty).slice(0, 5);
  })();
  const creators = [...new Set(rows.map((r) => r.created_by_name).filter(Boolean))] as string[];

  return (
    <div className="daily-sheet mx-auto w-full max-w-[760px] rounded-xl border border-line bg-white text-black shadow-sm px-10 py-8">
      <div className="flex items-start justify-between gap-6 border-b-2 border-black pb-3 mb-5">
        <div>
          <div className="text-[22px] font-extrabold tracking-tight leading-none">Lab Parfumo</div>
          <div className="text-[13px] text-neutral-600 mt-1.5">รายงานสรุปประจำวัน · Shopee</div>
          {creators.length > 0 && (
            <div className="text-[13px] text-neutral-700 mt-1">ผู้ทำใบเบิก: <span className="font-semibold">{creators.join(" · ")}</span></div>
          )}
        </div>
        <div className="text-right shrink-0">
          <div className="text-[15px] font-bold leading-tight">{thaiDate(date)}</div>
          <div className="text-[11px] text-neutral-500 mt-1">ออกรายงานเมื่อ {generatedAt} น.</div>
        </div>
      </div>

      {!ready ? (
        <div className="py-12 text-center text-sm text-neutral-500">ยังไม่มีใบเบิกของวันนี้</div>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-3 mb-6">
            <Kpi label="ออเดอร์" value={`${orders}`} primary />
            <Kpi label="ชิ้นรวม" value={`${nf(totalQty)}`} />
            <Kpi label="ตัดสต๊อกแล้ว" value={`${issued}/${orders}`} />
            <Kpi label="ส่งแล้ว" value={`${shipped}/${orders}`} />
          </div>

          <div className="grid grid-cols-2 gap-x-10 mb-6">
            <div>
              <SecTitle>สถานะการทำงาน</SecTitle>
              <KV k="รอตัดสต๊อก" v={`${pending} ใบ`} />
              <KV k="ตัดสต๊อกแล้ว" v={`${issued} ใบ`} />
              <KV k="ส่งแล้ว" v={`${shipped} ใบ`} />
              {returned > 0 && <KV k="มีการคืน" v={`${returned} ใบ`} />}
              {freeQty > 0 && <KV k="ของแถม (ชิ้น)" v={`${nf(freeQty)}`} />}
            </div>
            <div>
              <SecTitle>กลิ่นที่เบิกมากสุด (Top {top.length})</SecTitle>
              {top.map((t) => <KV key={t.product} k={t.product} v={`${nf(t.qty)} ชิ้น`} />)}
            </div>
          </div>

          {showDetail && (
            <div className="mb-6">
              <SecTitle>รายละเอียดแต่ละใบเบิก</SecTitle>
              <table className="w-full text-[12px] border-collapse">
                <thead>
                  <tr className="text-left text-neutral-500 text-[11px] uppercase tracking-wide">
                    <th className="pb-1.5 pr-2 w-7 font-semibold">#</th>
                    <th className="pb-1.5 pr-2 w-28 font-semibold">เลขที่ใบเบิก</th>
                    <th className="pb-1.5 pr-2 font-semibold">ผู้รับ / รายการ</th>
                    <th className="pb-1.5 pr-2 w-14 text-right font-semibold">ชิ้น</th>
                    <th className="pb-1.5 pr-2 w-24 font-semibold">สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => {
                    const ret = returnText(r.return_status);
                    return (
                      <tr key={r.order_no} className="border-t border-neutral-200 align-top">
                        <td className="py-2 pr-2 font-semibold tabular-nums">{i + 1}</td>
                        <td className="py-2 pr-2">
                          <div className="font-mono text-[11px]">{r.doc_no || "-"}</div>
                          <div className="font-mono text-[10px] text-neutral-500">{r.order_no}</div>
                        </td>
                        <td className="py-2 pr-2">
                          <div className="font-medium">{r.receiver || "-"}{r.province ? <span className="text-neutral-500 font-normal"> · {r.province}</span> : null}</div>
                          <ul className="mt-0.5 text-[11px] text-neutral-700 space-y-0.5">
                            {(r.items || []).map((it, k) => (
                              <li key={k}>{Math.round(it.qty || 0)}× {it.product}{it.size ? ` ${it.size}` : ""}{it.is_free ? <span className="text-neutral-500"> (แถม)</span> : ""}</li>
                            ))}
                          </ul>
                        </td>
                        <td className="py-2 pr-2 text-right font-semibold tabular-nums">{nf(r.qty)}</td>
                        <td className="py-2 pr-2">{statusText(r)}{ret ? <span className="block text-[10px] text-neutral-500">↩ {ret}</span> : null}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-black">
                    <td colSpan={3} className="py-2 font-bold">รวม {orders} ใบเบิก</td>
                    <td className="py-2 text-right font-bold text-[13px] tabular-nums">{nf(totalQty)}</td>
                    <td className="py-2" />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          <div className="grid grid-cols-2 gap-12 pt-12 text-[13px]">
            <div className="text-center"><div className="border-t border-black pt-1.5">ผู้จัดทำ</div></div>
            <div className="text-center"><div className="border-t border-black pt-1.5">ผู้ตรวจสอบ</div></div>
          </div>
        </>
      )}
    </div>
  );
}
