// Typed API methods. Add endpoints here as each phase is built.
import { demoApi, isDemoMode } from "./demo-api";
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
  material_name: string | null;
  customer_code: string | null;
  coa_specifications: Record<string, string> | null;
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
  container_no: string | null;
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
  StickerBatchCreateInput & {
    container_no: string | null;
    sticker_file_url: string | null;
    status: string;
  }
>;

export type BundleMaterial = Pick<
  Material,
  "id" | "material_name" | "hs_code" | "sticker_display_name" | "goods_description"
>;

export type Bundle = {
  id: string;
  sticker_batch_id: string;
  material_id: string | null;
  batch_no: string | null;
  bundle_no: string | null;
  ingot_count: number | null;
  gross_weight: number | null;
  net_weight: number | null;
  image_path: string | null;
  image_url: string | null;
  created_at: string;
  material: BundleMaterial | null;
};

export type BundleUpdateInput = {
  material_id?: string | null;
  batch_no?: string | null;
  bundle_no?: string | null;
  ingot_count?: number | null;
  gross_weight?: number | null;
  net_weight?: number | null;
};

export type ExportParty = {
  name: string;
  lines: string[];
};

export type ExportDocumentCreateInput = {
  batch_ids: string[];
  consignee: ExportParty;
  notify1?: ExportParty | null;
  notify2?: ExportParty | null;
  invoice_no?: string | null;
  invoice_date: string;
  contract_no?: string | null;
  bill_of_lading_no?: string | null;
  port_of_discharge?: string | null;
  term_of_delivery?: string | null;
  payment_terms?: string | null;
  unit_price_usd_t: number;
  shipping_mark?: string | null;
  production_date?: string | null;
  customer_material_name?: string | null;
  coa_specifications?: Record<string, string> | null;
};

export type ExportDocument = ExportDocumentCreateInput & {
  id: string;
  shipper_id: string;
  created_at: string;
  shipper: StickerBatchShipper;
  batches: { sticker_batch_id: string; position: number }[];
  coa_actuals: Record<string, Record<string, number | null>> | null;
  status: string;
  rejection_comment: string | null;
};

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

const productionApi = {
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
  uploadBundle: (batchId: string, file: File) =>
    http.upload<Bundle[]>(`/batches/${batchId}/bundles`, file),
  getBundles: (batchId: string) => http.get<Bundle[]>(`/batches/${batchId}/bundles`),
  updateBundle: (batchId: string, bundleId: string, data: BundleUpdateInput) =>
    http.patch<Bundle>(`/batches/${batchId}/bundles/${bundleId}`, data),
  deleteBundle: (batchId: string, bundleId: string) =>
    http.delete<void>(`/batches/${batchId}/bundles/${bundleId}`),
  downloadStickers: (batchId: string) => http.download(`/batches/${batchId}/stickers`),
  createExportDocument: (data: ExportDocumentCreateInput) =>
    http.post<ExportDocument>("/export-documents", data),
  getExportDocuments: (status?: string) =>
    http.get<ExportDocument[]>(status ? `/export-documents?status=${encodeURIComponent(status)}` : "/export-documents"),
  getExportDocument: (id: string) => http.get<ExportDocument>(`/export-documents/${id}`),
  downloadInvoicePacking: (id: string) => http.download(`/export-documents/${id}/invoice-packing`),
  downloadCoa: (id: string) => http.download(`/export-documents/${id}/coa`),
  uploadCoaActuals: (id: string, batchNo: string, file: File) =>
    http.upload<ExportDocument>(`/export-documents/${id}/coa-actuals/${encodeURIComponent(batchNo)}`, file),
  submitExportDocument: (id: string) => http.patch<ExportDocument>(`/export-documents/${id}/submit-approval`, {}),
  approveExportDocument: (id: string) => http.patch<ExportDocument>(`/export-documents/${id}/approve`, {}),
  rejectExportDocument: (id: string, comment: string) =>
    http.patch<ExportDocument>(`/export-documents/${id}/reject`, { comment }),
  updateCoaSpecifications: (id: string, coaSpecifications: Record<string, string>) =>
    http.patch<ExportDocument>(`/export-documents/${id}/coa-specifications`, { coa_specifications: coaSpecifications }),
};

export const api: typeof productionApi = new Proxy(productionApi, {
  get(target, property, receiver) {
    if (isDemoMode()) {
      return Reflect.get(demoApi, property, receiver);
    }
    return Reflect.get(target, property, receiver);
  },
});
