"use client";
import { useEffect, useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { WithdrawalDocument, WithdrawalDocumentMulti, type QrMatrix, type WsData } from "@/lib/pdf/withdrawal-sp-document";
import type { OrderWithItems } from "@/lib/types";

/** สร้าง PDF ใบเบิกในเบราว์เซอร์ (client-side) — เลี่ยงบั๊ก fontkit shape ไทยเพี้ยนบน Cloudflare Workers
 *  ws / wsByPlatform = ข้อมูลค้าส่ง (catalog+สาขา) ที่ server ดึงจาก DB ส่งมา */
export default function PdfClient({ order, orders, filename, ws, wsByPlatform, packingQr }: { order?: OrderWithItems; orders?: OrderWithItems[]; filename: string; ws?: WsData; wsByPlatform?: Record<string, WsData>; packingQr?: QrMatrix | null }) {
  const [url, setUrl] = useState<string | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let objectUrl: string | null = null;
    let alive = true;
    (async () => {
      try {
        const doc = orders ? <WithdrawalDocumentMulti orders={orders} wsByPlatform={wsByPlatform} /> : <WithdrawalDocument order={order!} ws={ws} packingQr={packingQr} />;
        const blob = await pdf(doc).toBlob();
        if (!alive) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      } catch (e: any) {
        if (alive) setErr(e?.message || "สร้าง PDF ไม่สำเร็จ");
      }
    })();
    return () => { alive = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [order, orders, packingQr]);

  if (err) return <div className="p-8 text-center text-sm text-red-600">สร้าง PDF ไม่สำเร็จ: {err}</div>;
  if (!url) return <div className="flex h-screen items-center justify-center text-sm text-muted">กำลังสร้าง PDF…</div>;

  return (
    <div className="flex h-screen flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-line bg-white px-4 py-2 text-sm">
        <span className="font-medium text-ink">{filename}</span>
        <a href={url} download={filename.endsWith(".pdf") ? filename : `${filename}.pdf`}
          className="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
          style={{ backgroundColor: "rgb(var(--brand))" }}>ดาวน์โหลด PDF</a>
      </div>
      <iframe src={url} className="w-full flex-1 border-0" title={filename} />
    </div>
  );
}
