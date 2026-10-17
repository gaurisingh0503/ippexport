import type {
  Bundle,
  BundleUpdateInput,
  Customer,
  CustomerInput,
  ExportDocument,
  ExportDocumentCreateInput,
  Material,
  Shipper,
  StickerBatch,
  StickerBatchCreateInput,
  StickerBatchUpdateInput,
} from "./api";
import { ApiError } from "./http";

let demoMode = false;

export function setDemoMode(enabled: boolean): void {
  demoMode = enabled;
}

export function isDemoMode(): boolean {
  return demoMode;
}

const createdAt = "2026-08-10T08:30:00.000Z";

const materials: Material[] = [
  {
    id: "demo-material-lead",
    material_name: "Pure Lead Ingots",
    hs_code: "7801.10.00",
    sticker_display_name: "PURE LEAD INGOTS",
    goods_description: "Pure lead ingots, 99.97% minimum",
    created_at: createdAt,
  },
];

const shippers: Shipper[] = [
  {
    id: "demo-shipper-ipp",
    slug: "ipp",
    name: "IPP Lead And Metals Co., Ltd.",
    address_line1: "99 Demo Industrial Estate",
    address_line2: "Samut Prakan 10280, Thailand",
    tax_id: "0105567000000",
    email: "exports@example.test",
    brand_color: "1D4ED8",
    created_at: createdAt,
  },
  {
    id: "demo-shipper-richsiri",
    slug: "richsiri",
    name: "Rich-Siri Metal And Trading Co., Ltd.",
    address_line1: "18 Demo Road",
    address_line2: "Bangkok 10110, Thailand",
    tax_id: "0105567000001",
    email: "exports@example.test",
    brand_color: "B45309",
    created_at: createdAt,
  },
];

const customers: Customer[] = [
  {
    id: "demo-customer-busan",
    name: "Demo Metals Co., Ltd.",
    consignee_l1: "DEMO METALS CO., LTD.",
    consignee_l2: "25 Harbor Avenue",
    consignee_l3: "Busan 48938, Republic of Korea",
    consignee_l4: null,
    consignee_l5: null,
    notify1_l1: "DEMO LOGISTICS KOREA",
    notify1_l2: "1 Port Road, Busan 48938",
    notify1_l3: null,
    notify1_l4: null,
    notify1_l5: null,
    notify2_l1: null,
    notify2_l2: null,
    notify2_l3: null,
    notify2_l4: null,
    notify3_l1: null,
    notify3_l2: null,
    notify3_l3: null,
    notify4_l1: null,
    notify4_l2: null,
    notify4_l3: null,
    notify5_l1: null,
    notify5_l2: null,
    notify5_l3: null,
    port_of_discharge: "Busan, Korea",
    payment_terms: "FOB",
    material_name: "Refined Lead Ingot",
    customer_code: "DM",
    coa_specifications: { Pb: "99.97 min", Sb: "0.002 max", Sn: "0.001 max" },
    status: "approved",
    created_at: createdAt,
  },
];

const batches: StickerBatch[] = [
  {
    id: "demo-export-batch",
    shipper_id: shippers[0].id,
    material_id: materials[0].id,
    type: "export",
    container_no: "DEMO-001",
    sticker_file_url: null,
    status: "ready",
    created_at: createdAt,
    shipper: shippers[0],
    material: materials[0],
  },
  {
    id: "demo-domestic-batch",
    shipper_id: shippers[1].id,
    material_id: materials[0].id,
    type: "domestic",
    container_no: null,
    sticker_file_url: null,
    status: "ready",
    created_at: "2026-08-09T08:30:00.000Z",
    shipper: shippers[1],
    material: materials[0],
  },
  {
    id: "demo-draft-batch",
    shipper_id: shippers[0].id,
    material_id: materials[0].id,
    type: "export",
    container_no: "DEMO-002",
    sticker_file_url: null,
    status: "draft",
    created_at: "2026-08-08T08:30:00.000Z",
    shipper: shippers[0],
    material: materials[0],
  },
];

const bundle = (id: string, stickerBatchId: string, batchNo: string, bundleNo: string): Bundle => ({
  id,
  sticker_batch_id: stickerBatchId,
  material_id: materials[0].id,
  batch_no: batchNo,
  bundle_no: bundleNo,
  ingot_count: 30,
  gross_weight: 1200,
  net_weight: 1198,
  image_path: null,
  image_url: null,
  created_at: createdAt,
  material: materials[0],
});

const bundles: Record<string, Bundle[]> = {
  "demo-export-batch": [
    bundle("demo-bundle-1", "demo-export-batch", "R2-54", "1"),
    bundle("demo-bundle-2", "demo-export-batch", "R2-54", "2"),
  ],
  "demo-domestic-batch": [bundle("demo-bundle-3", "demo-domestic-batch", "D-103", "1")],
  "demo-draft-batch": [bundle("demo-bundle-4", "demo-draft-batch", "R2-55", "1")],
};

const documents: ExportDocument[] = [
  {
    id: "demo-export-document",
    batch_ids: ["demo-export-batch"],
    consignee: { name: "DEMO METALS CO., LTD.", lines: ["25 Harbor Avenue", "Busan 48938, Republic of Korea"] },
    notify1: { name: "DEMO LOGISTICS KOREA", lines: ["1 Port Road, Busan 48938"] },
    notify2: null,
    invoice_no: "DEMO-INV-2026-001",
    invoice_date: "2026-08-10",
    contract_no: "DEMO-CONTRACT-001",
    bill_of_lading_no: "DEMO-BL-001",
    port_of_discharge: "Busan, Korea",
    term_of_delivery: "FOB",
    payment_terms: "FOB",
    unit_price_usd_t: 2000,
    shipping_mark: "IPP",
    production_date: "2026-08-09",
    customer_material_name: "Refined Lead Ingot",
    coa_specifications: { Pb: "99.97 min", Sb: "0.002 max", Sn: "0.001 max" },
    shipper_id: shippers[0].id,
    created_at: createdAt,
    shipper: shippers[0],
    batches: [{ sticker_batch_id: "demo-export-batch", position: 0 }],
    coa_actuals: { "R2-54": { Pb: 99.98, Sb: 0.0005, Sn: 0.0004 } },
    status: "draft",
    rejection_comment: null,
    packing_list_net_weight: 2400,
    stickers_net_weight: 2400,
    net_weight_matches: true,
    net_weight_cleared: true,
    net_weight_override_by: null,
    net_weight_override_at: null,
  },
];

function blockWrite(): never {
  throw new ApiError(403, "Demo mode is read-only. No changes were saved.");
}

function getBatch(id: string): StickerBatch {
  const batch = batches.find((item) => item.id === id);
  if (!batch) throw new ApiError(404, "Demo batch not found.");
  return batch;
}

function getDocument(id: string): ExportDocument {
  const document = documents.find((item) => item.id === id);
  if (!document) throw new ApiError(404, "Demo export document not found.");
  return document;
}

function sampleWorkbook(filename: string): { blob: Blob; filename: string } {
  const workbook = `<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Worksheet ss:Name="Demo"><Table>
<Row><Cell><Data ss:Type="String">IPP Shipments Demo</Data></Cell></Row>
<Row><Cell><Data ss:Type="String">This sample export is generated locally and contains no production data.</Data></Cell></Row>
</Table></Worksheet></Workbook>`;
  return {
    blob: new Blob([workbook], { type: "application/vnd.ms-excel" }),
    filename,
  };
}

export const demoApi = {
  health: async () => ({ status: "demo" }),
  me: async () => ({ id: "demo-user", email: "demo@example.test", role: "admin" }),
  getCustomers: async (status?: string) => customers.filter((customer) => !status || customer.status === status),
  createCustomer: async (_data: CustomerInput) => customers[0],
  updateCustomer: async (id: string, _data: Partial<CustomerInput>) =>
    customers.find((customer) => customer.id === id) ?? customers[0],
  approveCustomer: async (id: string) => customers.find((customer) => customer.id === id) ?? customers[0],
  rejectCustomer: async (id: string) => customers.find((customer) => customer.id === id) ?? customers[0],
  getMaterials: async () => materials,
  getShippers: async () => shippers,
  createBatch: async (_data: StickerBatchCreateInput) => getBatch("demo-draft-batch"),
  getBatches: async (params?: { type?: string; status?: string }) =>
    batches.filter((batch) => (!params?.type || batch.type === params.type) && (!params?.status || batch.status === params.status)),
  getBatch: async (id: string) => getBatch(id),
  updateBatch: async (id: string, _data: StickerBatchUpdateInput) => getBatch(id),
  uploadBundle: async (batchId: string, _file: File) => bundles[batchId] ?? [],
  getBundles: async (batchId: string) => bundles[batchId] ?? [],
  updateBundle: async (batchId: string, bundleId: string, _data: BundleUpdateInput) =>
    (bundles[batchId] ?? []).find((bundle) => bundle.id === bundleId) ?? blockWrite(),
  deleteBundle: async (_batchId: string, _bundleId: string) => undefined,
  downloadStickers: async (_batchId: string) => sampleWorkbook("demo-stickers.xls"),
  createExportDocument: async (_data: ExportDocumentCreateInput) => getDocument("demo-export-document"),
  getExportDocuments: async (status?: string) => documents.filter((document) => !status || document.status === status),
  getExportDocument: async (id: string) => getDocument(id),
  downloadInvoicePacking: async (_id: string) => sampleWorkbook("demo-invoice-packing.xls"),
  downloadCoa: async (_id: string) => sampleWorkbook("demo-coa.xls"),
  uploadCoaActuals: async (id: string, _batchNo: string, _file: File) => getDocument(id),
  attachBatch: async (id: string, _batchId: string) => getDocument(id),
  detachBatch: async (id: string, _batchId: string) => getDocument(id),
  updatePackingList: async (id: string, _netWeight: number) => getDocument(id),
  overrideNetWeight: async (id: string) => getDocument(id),
  submitExportDocument: async (id: string) => getDocument(id),
  approveExportDocument: async (id: string) => getDocument(id),
  rejectExportDocument: async (id: string, _comment: string) => getDocument(id),
  updateCoaSpecifications: async (id: string, _specifications: Record<string, string>) => getDocument(id),
};
