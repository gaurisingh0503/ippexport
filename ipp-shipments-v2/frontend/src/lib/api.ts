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

export type Shipment = {
  id: string;
  type: string;
  shipper_id: string;
  consignee_id: string | null;
  notify1_id: string | null;
  notify2_id: string | null;
  port_of_discharge: string | null;
  payment_terms: string | null;
  status: string;
  created_at: string;
  shipper: Shipper;
  consignee: Customer | null;
  notify1: Customer | null;
  notify2: Customer | null;
};

export type ShipmentCreateInput = {
  type: string;
  shipper_id: string;
  consignee_id?: string | null;
  notify1_id?: string | null;
  notify2_id?: string | null;
  port_of_discharge?: string | null;
  payment_terms?: string | null;
};

export type ShipmentUpdateInput = Partial<ShipmentCreateInput & { status: string }>;

export type Bundle = {
  id: string;
  shipment_id: string;
  material_name: string | null;
  batch_no: string | null;
  bundle_no: string | null;
  ingot_count: number | null;
  gross_weight: number | null;
  net_weight: number | null;
  image_path: string | null;
  image_url: string | null;
  created_at: string;
};

export type BundleUpdateInput = {
  material_name?: string | null;
  batch_no?: string | null;
  bundle_no?: string | null;
  ingot_count?: number | null;
  gross_weight?: number | null;
  net_weight?: number | null;
};

function customerQuery(status?: string): string {
  return status ? `/customers?status=${encodeURIComponent(status)}` : "/customers";
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
  createShipment: (data: ShipmentCreateInput) => http.post<Shipment>("/shipments", data),
  getShipments: () => http.get<Shipment[]>("/shipments"),
  getShipment: (id: string) => http.get<Shipment>(`/shipments/${id}`),
  updateShipment: (id: string, data: ShipmentUpdateInput) =>
    http.patch<Shipment>(`/shipments/${id}`, data),
  getBundles: (shipmentId: string) => http.get<Bundle[]>(`/shipments/${shipmentId}/bundles`),
  uploadBundle: (shipmentId: string, file: File) =>
    http.upload<Bundle>(`/shipments/${shipmentId}/bundles`, file),
  updateBundle: (shipmentId: string, bundleId: string, data: BundleUpdateInput) =>
    http.patch<Bundle>(`/shipments/${shipmentId}/bundles/${bundleId}`, data),
  deleteBundle: (shipmentId: string, bundleId: string) =>
    http.delete<void>(`/shipments/${shipmentId}/bundles/${bundleId}`),
};
