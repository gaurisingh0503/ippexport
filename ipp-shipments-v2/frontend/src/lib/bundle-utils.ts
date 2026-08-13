import type { Bundle } from "@/lib/api";

export type BundleFormData = {
  material_id: string;
  batch_no: string;
  bundle_no: string;
  ingot_count: string;
  gross_weight: string;
  net_weight: string;
};

export function bundleToFormData(bundle: Bundle): BundleFormData {
  return {
    material_id: bundle.material_id ?? "",
    batch_no: bundle.batch_no ?? "",
    bundle_no: bundle.bundle_no ?? "",
    ingot_count: bundle.ingot_count != null ? String(bundle.ingot_count) : "",
    gross_weight: bundle.gross_weight != null ? String(bundle.gross_weight) : "",
    net_weight: bundle.net_weight != null ? String(bundle.net_weight) : "",
  };
}

export function formDataToUpdate(data: BundleFormData) {
  return {
    material_id: data.material_id || null,
    batch_no: data.batch_no.trim() || null,
    bundle_no: data.bundle_no.trim() || null,
    ingot_count: data.ingot_count.trim() ? Number(data.ingot_count) : null,
    gross_weight: data.gross_weight.trim() ? Number(data.gross_weight) : null,
    net_weight: data.net_weight.trim() ? Number(data.net_weight) : null,
  };
}

export function isFormComplete(data: BundleFormData): boolean {
  return (
    data.material_id.trim() !== "" &&
    data.batch_no.trim() !== "" &&
    data.bundle_no.trim() !== "" &&
    data.ingot_count.trim() !== "" &&
    data.gross_weight.trim() !== "" &&
    data.net_weight.trim() !== ""
  );
}

export function isBundleComplete(bundle: Bundle): boolean {
  return isFormComplete(bundleToFormData(bundle));
}

export function fieldIsMissing(value: string): boolean {
  return value.trim() === "";
}
