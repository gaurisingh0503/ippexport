// Typed API methods. Add endpoints here as each phase is built.
import { http } from "./http";

export type Customer = {
  id: string;
  name: string;
  consignee_l1: string | null;
  consignee_l2: string | null;
  consignee_l3: string | null;
  consignee_l4: string | null;
  consignee_l5: string | null;
  notify1_l1: string | null;
  notify1_l2: string | null;
  notify1_l3: string | null;
  notify1_l4: string | null;
  notify1_l5: string | null;
  notify2_l1: string | null;
  notify2_l2: string | null;
  notify2_l3: string | null;
  notify2_l4: string | null;
  notify3_l1: string | null;
  notify3_l2: string | null;
  notify3_l3: string | null;
  notify4_l1: string | null;
  notify4_l2: string | null;
  notify4_l3: string | null;
  notify5_l1: string | null;
  notify5_l2: string | null;
  notify5_l3: string | null;
  port_of_discharge: string | null;
  payment_terms: string | null;
  status: string;
  created_at: string;
};

export type CustomerInput = Omit<Customer, "id" | "created_at" | "status">;

export type Material = {
  id: string;
  material_name: string;
  hs_code: string;
  sticker_display_name: string;
  goods_description: string | null;
  created_at: string;
};

export type Shipper = {
  id: string;
  slug: string;
  name: string;
  address_line1: string;
  address_line2: string;
  tax_id: string;
  email: string;
  brand_color: string;
  created_at: string;
};

export type AuthUser = {
  id: string;
  email: string;
  role: string | null;
};

export type StickerBatchShipper = Pick<Shipper, "id" | "slug" | "name" | "brand_color">;
export type StickerBatchMaterial = Pick<
  Material,
  "id" | "material_name" | "hs_code" | "sticker_display_name" | "goods_description"
>;

export type StickerBatch = {
  id: string;
  shipper_id: string;
  material_id: string;
  type: string;
  sticker_file_url: string | null;
  status: string;
  created_at: string;
  shipper: StickerBatchShipper;
  material: StickerBatchMaterial;
};

export type StickerBatchCreateInput = {
  type: string;
  shipper_id: string;
  material_id: string;
};

export type StickerBatchUpdateInput = Partial<
  StickerBatchCreateInput & { sticker_file_url: string | null; status: string }
>;

function customerQuery(status?: string): string {
  return status ? `/customers?status=${encodeURIComponent(status)}` : "/customers";
}

function batchQuery(params?: { type?: string; status?: string }): string {
  if (!params) return "/batches";
  const search = new URLSearchParams();
  if (params.type) search.set("type", params.type);
  if (params.status) search.set("status", params.status);
  const query = search.toString();
  return query ? `/batches?${query}` : "/batches";
}

export const api = {
  health: () => http.get<{ status: string }>("/health"),
  me: () => http.get<AuthUser>("/auth/me"),
  getCustomers: (status?: string) => http.get<Customer[]>(customerQuery(status)),
  createCustomer: (data: CustomerInput) => http.post<Customer>("/customers", data),
  updateCustomer: (id: string, data: Partial<CustomerInput>) =>
    http.patch<Customer>(`/customers/${id}`, data),
  approveCustomer: (id: string) => http.patch<Customer>(`/customers/${id}/approve`, {}),
  rejectCustomer: (id: string) => http.patch<Customer>(`/customers/${id}/reject`, {}),
  getMaterials: () => http.get<Material[]>("/materials"),
  getShippers: () => http.get<Shipper[]>("/shippers"),
  createBatch: (data: StickerBatchCreateInput) => http.post<StickerBatch>("/batches", data),
  getBatches: (params?: { type?: string; status?: string }) =>
    http.get<StickerBatch[]>(batchQuery(params)),
  getBatch: (id: string) => http.get<StickerBatch>(`/batches/${id}`),
  updateBatch: (id: string, data: StickerBatchUpdateInput) =>
    http.patch<StickerBatch>(`/batches/${id}`, data),
};
