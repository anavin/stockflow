"use client";
import { Fragment, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { bulkSaveOrders, matchOrders, customersSummary, customerHistory, type MatchResult, type CustomerHistory } from "@/lib/actions/orders";
import type { OrderWithItems } from "@/lib/types";
import { UploadCloud, FileSpreadsheet, CheckCircle2, AlertTriangle, Printer, Link2, History, ChevronDown } from "lucide-react";

type CustSummary = { total_orders: number; last_address: string | null; last_date: string | null };

type Preview = {
  orders: OrderWithItems[];
  totalRows: number;
  itemCount: number;
  errors: { row: number; message: string }[];
  noItemOrders: number;
  orderNos: string[];
  unmatchedItems: number;
};

export default function ImportWizard() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [match, setMatch] = useState<MatchResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [savedMsg, setSavedMsg] = useState("");
  const [cust, setCust] = useState<CustSummary[] | null>(null);              // สรุปลูกค้าเก่า/ใหม่ ต่อออร์เดอร์
  const [expanded, setExpanded] = useState<Record<number, CustomerHistory | "loading">>({});  // ประวัติที่กางดู

  async function runMatch() {
    if (!preview) return;
    setBusy(true); setError("");
    const res = await matchOrders(preview.orderNos);
    setBusy(false);
    if (!res.ok) { setError(res.error || "จับคู่ไม่สำเร็จ"); return; }
    setMatch({ found: res.found || [], missing: res.missing || [] });
  }

  async function onFile(file: File) {
    setError(""); setSavedMsg(""); setPreview(null); setMatch(null); setCust(null); setExpanded({}); setFileName(file.name);
    setBusy(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/import", { method: "POST", body: fd });
      const data = await res.json();
      if (!data.ok) { setError(data.error || "อ่านไฟล์ไม่สำเร็จ"); setBusy(false); return; }
      setPreview(data);
      // ตรวจว่าออร์เดอร์ไหนเป็นลูกค้าเก่า (จับจากเบอร์/username/ชื่อ)
      if (data.orders?.length) {
        customersSummary(data.orders.map((o: OrderWithItems) => ({ phone: o.phone, username: o.username, receiver: o.receiver })))
          .then(setCust).catch(() => {});
      }
    } catch {
      setError("อัปโหลดไม่สำเร็จ");
    }
    setBusy(false);
  }

  // กด "ดูประวัติ" ในหน้า import → โหลดประวัติรายออร์เดอร์ของลูกค้าคนนั้น
  async function toggleHistory(idx: number, o: OrderWithItems) {
    if (expanded[idx]) { setExpanded((p) => { const n = { ...p }; delete n[idx]; return n; }); return; }
    setExpanded((p) => ({ ...p, [idx]: "loading" }));
    const h = await customerHistory({ phone: o.phone, username: o.username, receiver: o.receiver }, { limit: 6 });
    setExpanded((p) => ({ ...p, [idx]: h }));
  }

  async function confirmImport() {
    if (!preview) return;
    setBusy(true); setError("");
    const res = await bulkSaveOrders(preview.orders);
    setBusy(false);
    if (!res.ok) { setError(`${res.error} (บันทึกสำเร็จ ${res.saved} ออร์เดอร์ก่อนหยุด)`); return; }
    setSavedMsg(`นำเข้าสำเร็จ ${res.saved} ออร์เดอร์`);
    setTimeout(() => { router.push("/shopee"); router.refresh(); }, 900);
  }

  return (
    <div className="space-y-5">
      {/* dropzone */}
      <div
        className="card flex cursor-pointer flex-col items-center gap-3 border-dashed py-12 text-center hover:border-brand"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) onFile(f); }}
      >
        <UploadCloud size={36} className="text-brand" />
        <div className="text-sm font-medium text-ink">คลิกเพื่อเลือกไฟล์ หรือ ลากไฟล์มาวาง</div>
        <div className="text-xs text-muted">รองรับไฟล์ Shopee “Order.toship / Orders” (.xlsx, .xls, .csv) — ระบบเดากลิ่น/ขนาดให้อัตโนมัติ</div>
        {fileName && <div className="mt-1 inline-flex items-center gap-1 text-xs text-muted"><FileSpreadsheet size={14} /> {fileName}</div>}
        <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
      </div>

      {busy && !preview && <p className="text-sm text-muted">กำลังอ่านไฟล์…</p>}
      {error && <div className="flex items-start gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600"><AlertTriangle size={16} className="mt-0.5" /> {error}</div>}
      {savedMsg && <div className="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700"><CheckCircle2 size={16} /> {savedMsg}</div>}

      {preview && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Stat label="ออร์เดอร์" value={preview.orders.length} />
            <Stat label="รายการสินค้า" value={preview.itemCount} />
            <Stat label="แถวข้อมูล" value={preview.totalRows} />
            <Stat label="ข้อผิดพลาด" value={preview.errors.length} warn={preview.errors.length > 0} />
          </div>

          {preview.orders.length > 0 && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              <div className="flex items-start gap-2">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                <div>
                  ระบบเดา <b>กลิ่น + ขนาด</b> จากชื่อสินค้า/SKU ของ Shopee ให้อัตโนมัติ และเติมจังหวัด/อำเภอ/ไปรษณีย์แล้ว
                  <div className="mt-1 text-xs text-blue-700">
                    หลังนำเข้า ให้เปิดแต่ละใบเพื่อ<b>เติมชื่อผู้รับ / เบอร์ / ที่อยู่</b> (Shopee ปิดบังไว้)
                    {preview.unmatchedItems > 0 && <> และ<b>ตรวจกลิ่น {preview.unmatchedItems} รายการ</b>ที่เดาไม่ตรง (แสดงเป็นชื่อยาวผิดปกติในตารางด้านล่าง)</>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {preview.orders.length === 0 && preview.noItemOrders > 0 && (
            <div className="space-y-3">
              <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
                ไฟล์นี้มีแต่ <b>หมายเลขคำสั่งซื้อ {preview.noItemOrders} รายการ</b> (ไม่มีข้อมูลสินค้า) — สร้างใบเบิกใหม่ไม่ได้
                <div className="mt-1 text-xs text-amber-700">
                  แต่ถ้าออร์เดอร์เหล่านี้มีอยู่ในระบบแล้ว สามารถ<b>จับคู่แล้วสั่งพิมพ์</b>ได้เลย 👇
                </div>
              </div>
              {!match ? (
                <button className="btn-primary" disabled={busy} onClick={runMatch}>
                  <Link2 size={16} /> {busy ? "กำลังจับคู่…" : `จับคู่กับข้อมูลในระบบ (${preview.orderNos.length})`}
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-3">
                    <Stat label="พบในระบบ (พิมพ์ได้)" value={match.found.length} />
                    <Stat label="ไม่พบในระบบ" value={match.missing.length} warn={match.missing.length > 0} />
                  </div>
                  {match.found.length > 0 && (
                    <div className="overflow-hidden rounded-xl border border-line bg-white">
                      <div className="max-h-[380px] overflow-auto">
                        <table className="w-full text-sm">
                          <thead className="sticky top-0 bg-soft text-left text-xs text-muted">
                            <tr><th className="px-4 py-2">Order No.</th><th className="px-4 py-2">เลขที่ใบเบิก</th><th className="px-4 py-2">ผู้รับ</th><th className="px-4 py-2 text-right">พิมพ์</th></tr>
                          </thead>
                          <tbody>
                            {match.found.map((m) => (
                              <tr key={m.order_no} className="border-t border-line">
                                <td className="px-4 py-2 font-mono text-xs">{m.order_no}</td>
                                <td className="px-4 py-2 font-mono text-xs">{m.doc_no || "—"}</td>
                                <td className="px-4 py-2">{m.receiver || "—"}</td>
                                <td className="px-4 py-2 text-right">
                                  <a href={`/api/print/${encodeURIComponent(m.order_no)}`} target="_blank" rel="noreferrer"
                                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-brand-600 hover:bg-brand-50">
                                    <Printer size={14} /> พิมพ์
                                  </a>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  {match.missing.length > 0 && (
                    <div className="rounded-lg bg-amber-50 px-4 py-2 text-xs text-amber-700">
                      ไม่พบในระบบ {match.missing.length} รายการ (ต้องสร้างใบเบิกก่อน): {match.missing.slice(0, 10).join(", ")}{match.missing.length > 10 ? " …" : ""}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {preview.errors.length > 0 && (
            <div className="rounded-lg bg-amber-50 px-4 py-3 text-xs text-amber-700">
              {preview.errors.slice(0, 8).map((e, i) => <div key={i}>แถว {e.row}: {e.message}</div>)}
              {preview.errors.length > 8 && <div>… และอีก {preview.errors.length - 8} รายการ</div>}
            </div>
          )}

          <div className="overflow-hidden rounded-xl border border-line bg-white">
            <div className="max-h-[420px] overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-soft text-left text-xs text-muted">
                  <tr>
                    <th className="px-4 py-2">Order No.</th>
                    <th className="px-4 py-2">ผู้รับ</th>
                    <th className="px-4 py-2">ลูกค้า</th>
                    <th className="px-4 py-2">จังหวัด</th>
                    <th className="px-4 py-2">รายการ</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.orders.slice(0, 200).map((o, i) => {
                    const cs = cust?.[i];
                    const returning = cs && cs.total_orders > 0;
                    const exp = expanded[i];
                    return (
                      <Fragment key={o.order_no}>
                        <tr className="border-t border-line align-top">
                          <td className="px-4 py-2 font-mono text-xs">{o.order_no}</td>
                          <td className="px-4 py-2">{o.receiver || o.username || "—"}</td>
                          <td className="px-4 py-2">
                            {cs == null ? (
                              <span className="text-xs text-faint">…</span>
                            ) : returning ? (
                              <button type="button" onClick={() => toggleHistory(i, o)}
                                className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 hover:bg-amber-100">
                                <History size={12} /> เก่า ×{cs.total_orders}
                                <ChevronDown size={12} className={exp ? "rotate-180 transition" : "transition"} />
                              </button>
                            ) : (
                              <span className="chip bg-green-50 text-green-700">ใหม่</span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-muted">{o.province || "—"}</td>
                          <td className="px-4 py-2 text-xs text-muted">
                            {o.items.map((it, k) => (
                              <span key={k} className="mr-1 inline-block">
                                {it.product} {it.size}{it.is_free ? " (Free)" : ""} ×{it.qty}{k < o.items.length - 1 ? "," : ""}
                              </span>
                            ))}
                          </td>
                        </tr>
                        {exp && (
                          <tr className="border-t border-line bg-amber-50/30">
                            <td colSpan={5} className="px-4 py-2">
                              {exp === "loading" ? (
                                <span className="text-xs text-muted">กำลังโหลดประวัติ…</span>
                              ) : exp.orders.length === 0 ? (
                                <span className="text-xs text-muted">ไม่พบประวัติ</span>
                              ) : (
                                <div className="space-y-1">
                                  {exp.profile && (exp.profile.address || exp.profile.province) && (
                                    <div className="text-xs text-muted">ที่อยู่เดิม · {[exp.profile.address, [exp.profile.district, exp.profile.province].filter(Boolean).join(" "), exp.profile.postcode].filter(Boolean).join(" ")}</div>
                                  )}
                                  {exp.orders.map((po) => (
                                    <div key={po.order_no} className="text-xs text-ink">
                                      <span className="mr-2 font-medium text-muted">{po.doc_date || "-"}</span>
                                      {po.items.map((it) => `${it.product}${it.size ? ` ${it.size}` : ""} ×${it.qty}`).join(", ")}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {preview.orders.length > 200 && <div className="border-t border-line px-4 py-2 text-xs text-muted">แสดง 200 จาก {preview.orders.length} ออร์เดอร์</div>}
          </div>

          <div className="flex gap-3">
            <button className="btn-primary" disabled={busy || preview.orders.length === 0} onClick={confirmImport}>
              {busy ? "กำลังบันทึก…" : `ยืนยันนำเข้า ${preview.orders.length} ออร์เดอร์`}
            </button>
            <button className="btn-ghost" disabled={busy} onClick={() => { setPreview(null); setFileName(""); setCust(null); setExpanded({}); }}>เลือกไฟล์ใหม่</button>
          </div>
          <p className="text-xs text-faint">* ออร์เดอร์ที่มี Order No. ซ้ำกับในระบบจะถูกอัปเดตทับ</p>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div className={`card px-4 py-3 ${warn ? "border-amber-200" : ""}`}>
      <div className={`text-lg font-bold ${warn ? "text-amber-600" : "text-ink"}`}>{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}
