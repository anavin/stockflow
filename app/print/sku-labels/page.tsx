import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import Barcode from "@/components/Barcode";
import PrintNow from "@/components/PrintNow";

export const dynamic = "force-dynamic";

/** พิมพ์ป้าย SKU (Code128) — /print/sku-labels?skus=A,B,C (นอก layout แอป = หน้าขาว พิมพ์นิ่ง) */
export default async function SkuLabelsPage({ searchParams }: { searchParams: Promise<{ skus?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { skus } = await searchParams;
  const list = (skus || "").split(",").map((s) => decodeURIComponent(s.trim())).filter(Boolean).slice(0, 500);

  return (
    <div className="print-area" style={{ background: "#fff", padding: "8mm", minHeight: "100vh" }}>
      <PrintNow title={`ป้าย SKU (${list.length})`} />
      {list.length === 0 ? (
        <p style={{ color: "#888" }}>ไม่มี SKU</p>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4mm" }}>
          {list.map((sku) => (
            <div key={sku} style={{ width: "45mm", border: "1px solid #ccc", borderRadius: 4, padding: "3mm", textAlign: "center", breakInside: "avoid" }}>
              <Barcode value={sku} height={32} width={1.1} displayValue={false} />
              <div style={{ fontFamily: "monospace", fontSize: 10, marginTop: 2, letterSpacing: 0.3 }}>{sku}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
