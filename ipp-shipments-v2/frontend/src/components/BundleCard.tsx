import { useState } from "react";
import { Check, Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Bundle, Material } from "@/lib/api";
import {
  bundleToFormData,
  fieldIsMissing,
  formDataToUpdate,
  isFormComplete,
  type BundleFormData,
} from "@/lib/bundle-utils";
import { cn } from "@/lib/utils";

type BundleCardProps = {
  bundle: Bundle;
  batchMaterialId: string;
  materials: Material[];
  saved: boolean;
  onSave: (bundleId: string, data: ReturnType<typeof formDataToUpdate>) => Promise<void>;
  onDelete: (bundleId: string) => Promise<void>;
};

const FIELD_CONFIG: { key: keyof BundleFormData; label: string; type: "text" | "number"; step?: string }[] = [
  { key: "batch_no", label: "Batch No.", type: "text" },
  { key: "bundle_no", label: "Bundle No.", type: "text" },
  { key: "ingot_count", label: "Number of Ingots", type: "number", step: "1" },
  { key: "gross_weight", label: "Gross Weight (kg)", type: "number", step: "0.01" },
  { key: "net_weight", label: "Net Weight (kg)", type: "number", step: "0.01" },
];

export default function BundleCard({
  bundle,
  batchMaterialId,
  materials,
  saved,
  onSave,
  onDelete,
}: BundleCardProps) {
  const [form, setForm] = useState<BundleFormData>(() => bundleToFormData(bundle));
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const selectedMaterial = materials.find((m) => m.id === form.material_id) ?? null;
  const complete = isFormComplete(form);
  const borderClass = saved && complete
    ? "border-l-4 border-l-green-500"
    : !complete
      ? "border-l-4 border-l-destructive"
      : "";

  function updateField(key: keyof BundleFormData, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!complete) return;
    setSaving(true);
    try {
      await onSave(bundle.id, formDataToUpdate(form));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await onDelete(bundle.id);
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <>
      <Card className={cn(borderClass)}>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="shrink-0">
              {bundle.image_url ? (
                <img
                  src={bundle.image_url}
                  alt="Bundle tag"
                  className="h-24 w-24 rounded-md border object-cover"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-md border bg-muted text-xs text-muted-foreground">
                  No photo
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  {saved && complete && (
                    <span className="flex items-center gap-1 text-sm text-green-600">
                      <Check className="h-4 w-4" />
                      Saved
                    </span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setConfirmDelete(true)}
                  aria-label="Delete bundle"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor={`material-${bundle.id}`}>Material</Label>
                  {form.material_id && form.material_id !== batchMaterialId && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                      Overridden
                    </span>
                  )}
                </div>
                <select
                  id={`material-${bundle.id}`}
                  value={form.material_id}
                  onChange={(e) => updateField("material_id", e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select a material</option>
                  {materials.map((material) => (
                    <option key={material.id} value={material.id}>
                      {material.material_name}
                    </option>
                  ))}
                </select>
                {selectedMaterial && (
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-muted px-3 py-1 text-sm">
                      HS: {selectedMaterial.hs_code}
                    </span>
                    <span className="rounded-full bg-muted px-3 py-1 text-sm">
                      {selectedMaterial.sticker_display_name}
                    </span>
                  </div>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {FIELD_CONFIG.map(({ key, label, type, step }) => (
                  <div key={key} className="space-y-1">
                    <Label htmlFor={`${bundle.id}-${key}`}>{label}</Label>
                    <Input
                      id={`${bundle.id}-${key}`}
                      type={type}
                      step={step}
                      value={form[key]}
                      onChange={(e) => updateField(key, e.target.value)}
                      placeholder={fieldIsMissing(form[key]) ? "Not detected — enter manually" : undefined}
                      className={cn(fieldIsMissing(form[key]) && "border-destructive")}
                    />
                  </div>
                ))}
              </div>

              <Button size="sm" disabled={!complete || saving} onClick={handleSave}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Save"
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-lg border bg-background p-6 shadow-lg">
            <h3 className="text-lg font-semibold">Delete this bundle?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              This removes the bundle and its uploaded photo.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirmDelete(false)} disabled={deleting}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                {deleting ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
