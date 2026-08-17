// แคตตาล็อกชิ้นส่วนสติ๊กเกอร์/การ์ด ต่อ Grade + helper ร่วม (client + server)
export type LabelComp = { key: string; label: string };

const EDP_PLUS: LabelComp[] = [
  { key: "box_10", label: "สติ๊กเกอร์กล่อง 10ml" },
  { key: "box_30", label: "สติ๊กเกอร์กล่อง 30ml" },
  { key: "box_50", label: "สติ๊กเกอร์กล่อง 50ml" },
  { key: "scb_4", label: "สคบ. 4ml" },
  { key: "scb_10", label: "สคบ. 10ml" },
  { key: "scb_30", label: "สคบ. 30ml" },
  { key: "scb_50", label: "สคบ. 50ml" },
  { key: "card", label: "การ์ดน้ำหอม" },
  { key: "s_12", label: "สติ๊กเกอร์ 1.2ml" },
];

export const LABEL_COMPONENTS: Record<string, LabelComp[]> = {
  EDP: [
    { key: "box_edp", label: "สติ๊กเกอร์กล่อง EDP" },
    { key: "box_edp_10", label: "สติ๊กเกอร์กล่อง EDP 10ml" },
    { key: "scb_4", label: "สคบ. 4ml" },
    { key: "scb_10", label: "สคบ. 10ml" },
    { key: "scb_30", label: "สคบ. 30ml" },
    { key: "scb_50", label: "สคบ. 50ml" },
    { key: "card", label: "การ์ดน้ำหอม" },
    { key: "s_12", label: "สติ๊กเกอร์ 1.2ml" },
  ],
  "EDP+": EDP_PLUS,
  PARFUM: EDP_PLUS,
  EDT: [
    { key: "box_edt", label: "สติ๊กเกอร์กล่อง EDT" },
    { key: "scb_10", label: "สคบ. 10ml" },
    { key: "scb_30", label: "สคบ. 30ml" },
    { key: "scb_90", label: "สคบ. 90ml" },
    { key: "bottle_30", label: "สติ๊กเกอร์ขวด 30ml" },
    { key: "bottle_90", label: "สติ๊กเกอร์ขวด 90ml" },
  ],
};

/** ptype ของกลิ่น → กลุ่ม Grade ในแคตตาล็อกสติ๊กเกอร์ (null = ไม่เข้าเกณฑ์ เช่น Car Perfume) */
export function gradeToLabelKey(ptype?: string | null): string | null {
  const g = (ptype || "").trim().toUpperCase();
  if (g === "EDP") return "EDP";
  if (g === "EDP+") return "EDP+";
  if (g.includes("PARFUM")) return "PARFUM";   // Le Parfum / Parfum
  if (g === "EDT") return "EDT";
  return null;
}

export const mnorm = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9ก-๙]/g, "");
export const bulkRef = (scent: string, brand: string) => `${mnorm(scent)}|${mnorm(brand)}`;
export const labelRef = (scent: string, compKey: string) => `${mnorm(scent)}|${compKey}`;
