export type OrderItem = {
  id?: number;
  line_no: number;
  product: string;
  size: string;
  is_free: boolean;
  qty: number;
  unit: string;
  product_label?: string;
  sku?: string | null;
};

export type Order = {
  order_no: string;
  platform: string;
  doc_no?: string | null;
  doc_date?: string | null;
  month_label?: string | null;
  channel?: string | null;
  shop_name?: string | null;
  username?: string | null;
  receiver?: string | null;
  phone?: string | null;
  customer_type?: string | null;
  purchase_count?: number | null;
  district?: string | null;
  province?: string | null;
  postcode?: string | null;
  address?: string | null;
  campaign?: string | null;
  note?: string | null;
  box_scent?: string | null;
  order_date?: string | null;
  created_by?: number | null;
  created_at?: string;
  updated_at?: string;
  stock_issued_at?: string | null;
  issued_by?: string | null;
};

export type OrderWithItems = Order & { items: OrderItem[] };

export type OrderRow = Order & { item_count: number; total_qty: number };

/** Build the display label used in the Excel "ชื่อสินค้า" column. */
export function buildProductLabel(product: string, size: string, isFree: boolean): string {
  const base = [product, size].filter(Boolean).join(" ").trim();
  return isFree ? `${base}-Free` : base;
}
