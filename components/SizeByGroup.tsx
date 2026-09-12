import type { SizeByGroupRow, CustomerTypeSummaryRow } from "@/lib/queries";

const NEW = "#0d9488";    // teal — ลูกค้าใหม่
const REPEAT = "#6366f1"; // indigo — ลูกค้าเก่า (ให้ตรงกับกราฟใหม่/เก่ารายเดือน)
const BIG_ML = 30;        // ขวดใหญ่ = ตั้งแต่ 30 ml

/** วิเคราะห์ "ลูกค้าแต่ละกลุ่มซื้อขนาดไหน" — เทียบสัดส่วนขนาดที่ซื้อของลูกค้าใหม่ vs เก่า
 *  + สรุปพฤติกรรม (ออร์เดอร์ · ชิ้น/ออร์เดอร์ · %ขวดใหญ่) เพื่ออ่านทิศทาง upsell */
export default function SizeByGroup({ rows, summary }: { rows: SizeByGroupRow[]; summary: CustomerTypeSummaryRow[] }) {
  const ml = (s: string) => { const n = parseFloat(s); return Number.isFinite(n) ? n : 0; };
  const qtyOf = (grp: "new" | "repeat", size: string) => rows.find((r) => r.grp === grp && r.size === size)?.qty ?? 0;
  const totalOf = (grp: "new" | "repeat") => rows.filter((r) => r.grp === grp).reduce((a, r) => a + r.qty, 0);
  const bigOf = (grp: "new" | "repeat") => rows.filter((r) => r.grp === grp && ml(r.size) >= BIG_ML).reduce((a, r) => a + r.qty, 0);
  const sum = (grp: "new" | "repeat") => summary.find((s) => s.grp === grp);

  const newTotal = totalOf("new"), repTotal = totalOf("repeat");
  const pctNew = (size: string) => (newTotal ? (qtyOf("new", size) / newTotal) * 100 : 0);
  const pctRep = (size: string) => (repTotal ? (qtyOf("repeat", size) / repTotal) * 100 : 0);
  // เอาเฉพาะขนาดที่มีสัดส่วน >=1% ในกลุ่มใดกลุ่มหนึ่ง (ตัดตัวแปรขยะ 0% เช่น "4 ml." ออก) · สูงสุด 8
  const sizes = [...new Set(rows.map((r) => r.size))]
    .filter((s) => pctNew(s) >= 1 || pctRep(s) >= 1)
    .sort((a, b) => (qtyOf("new", b) + qtyOf("repeat", b)) - (qtyOf("new", a) + qtyOf("repeat", a)))
    .slice(0, 8);

  if (rows.length === 0) return <p className="px-5 py-10 text-center text-muted">ยังไม่มีข้อมูล (ต้องมี customer_type)</p>;

  const card = (grp: "new" | "repeat", label: string, color: string) => {
    const s = sum(grp); const total = grp === "new" ? newTotal : repTotal;
    const orders = s?.orders ?? 0; const qty = s?.qty ?? total;
    const perOrder = orders ? qty / orders : 0; const bigPct = total ? Math.round((bigOf(grp) / total) * 100) : 0;
    return (
      <div className="rounded-xl border border-line p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} /> {label}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div><div className="text-lg font-bold tabular-nums text-ink">{orders.toLocaleString()}</div><div className="text-[11px] text-muted">ออร์เดอร์</div></div>
          <div><div className="text-lg font-bold tabular-nums text-ink">{perOrder.toFixed(1)}</div><div className="text-[11px] text-muted">ชิ้น/ออร์เดอร์</div></div>
          <div><div className="text-lg font-bold tabular-nums" style={{ color }}>{bigPct}%</div><div className="text-[11px] text-muted">ขวดใหญ่ ≥{BIG_ML}ml</div></div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-5">
      {/* สรุปพฤติกรรมต่อกลุ่ม */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {card("new", "ลูกค้าใหม่", NEW)}
        {card("repeat", "ลูกค้าเก่า", REPEAT)}
      </div>

      {/* เทียบสัดส่วนขนาดที่ซื้อ (% ภายในกลุ่มตัวเอง) */}
      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between text-xs font-medium text-muted">
          <span>ขนาด</span>
          <span className="flex items-center gap-3">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: NEW }} /> ใหม่</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: REPEAT }} /> เก่า</span>
          </span>
        </div>
        <div className="space-y-2.5">
          {sizes.map((size) => {
            const np = pctNew(size), rp = pctRep(size);
            return (
              <div key={size} className="grid grid-cols-[4rem_1fr] items-center gap-3">
                <span className="text-sm font-medium text-ink">{size}</span>
                <div className="space-y-1">
                  <MiniBar pct={np} color={NEW} />
                  <MiniBar pct={rp} color={REPEAT} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="mt-4 border-t border-line pt-3 text-[11px] leading-relaxed text-faint">
        แถบ = สัดส่วน % ภายในกลุ่มตัวเอง (ไม่ใช่เทียบข้ามกลุ่ม) · "ขวดใหญ่" นับตั้งแต่ {BIG_ML} ml ขึ้นไป —
        ถ้าลูกค้าใหม่กระจุกที่ขนาดเล็กแต่ลูกค้าเก่าเน้นขวดใหญ่ = มีโอกาส upsell ให้ลูกค้าใหม่ขยับขนาด
      </p>
    </div>
  );
}

function MiniBar({ pct, color }: { pct: number; color: string }) {
  const w = Math.min(100, Math.max(0, pct));
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-soft">
        <div className="h-full rounded-full" style={{ width: `${w < 1.5 && w > 0 ? 1.5 : w}%`, backgroundColor: color }} />
      </div>
      <span className="w-9 shrink-0 text-right text-[11px] tabular-nums text-muted">{Math.round(w)}%</span>
    </div>
  );
}
