import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";

import BundleCard from "@/components/BundleCard";
import BundleUploadZone from "@/components/BundleUploadZone";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, type Bundle, type Material, type StickerBatch } from "@/lib/api";
import { formDataToUpdate, isBundleComplete } from "@/lib/bundle-utils";
import { apiErrorMessage } from "@/lib/http";

type BundleState = Bundle & { saved: boolean };

function initialSaved(bundle: Bundle): boolean {
  return isBundleComplete(bundle);
}

export default function OcrPage() {
  const { id: batchId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [batch, setBatch] = useState<StickerBatch | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [bundles, setBundles] = useState<BundleState[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [containerNo, setContainerNo] = useState("");
  const [savingContainer, setSavingContainer] = useState(false);

  useEffect(() => {
    if (!batchId) return;

    Promise.all([api.getBatch(batchId), api.getBundles(batchId), api.getMaterials()])
      .then(([batchData, bundleList, materialList]) => {
        setBatch(batchData);
        setContainerNo(batchData.container_no ?? "");
        setMaterials(materialList);
        setBundles(bundleList.map((b) => ({ ...b, saved: initialSaved(b) })));
      })
      .catch(() => setPageError("Failed to load batch"))
      .finally(() => setLoading(false));
  }, [batchId]);

  const totals = useMemo(() => {
    const completeSaved = bundles.filter((b) => b.saved && isBundleComplete(b));
    return {
      count: completeSaved.length,
      ingots: completeSaved.reduce((sum, b) => sum + (b.ingot_count ?? 0), 0),
      gross: completeSaved.reduce((sum, b) => sum + (b.gross_weight ?? 0), 0),
      net: completeSaved.reduce((sum, b) => sum + (b.net_weight ?? 0), 0),
    };
  }, [bundles]);

  const canProceed = useMemo(() => {
    return bundles.length > 0 && bundles.every((b) => b.saved && isBundleComplete(b));
  }, [bundles]);

  async function saveDetectedContainer() {
    if (!batchId || !batch) return;
    const value = containerNo.trim();
    if (!value || value === batch.container_no) return;

    setSavingContainer(true);
    try {
      const updated = await api.updateBatch(batchId, { container_no: value });
      setBatch(updated);
      setContainerNo(updated.container_no ?? "");
    } catch (err) {
      setUploadError(apiErrorMessage(err, "Failed to update container number"));
    } finally {
      setSavingContainer(false);
    }
  }

  async function handleUpload(file: File) {
    if (!batchId) return;
    setUploading(true);
    setUploadError(null);

    try {
      const created = await api.uploadBundle(batchId, file);
      setBundles((prev) => [...prev, ...created.map((bundle) => ({ ...bundle, saved: false }))]);
      const updatedBatch = await api.getBatch(batchId);
      setBatch(updatedBatch);
      setContainerNo(updatedBatch.container_no ?? "");
    } catch (err) {
      const detail = apiErrorMessage(err, "Upload failed — try again");
      setUploadError(`${file.name}: ${detail}`);
    } finally {
      setUploading(false);
    }
  }

  async function handleSave(bundleId: string, data: ReturnType<typeof formDataToUpdate>) {
    if (!batchId) return;
    const updated = await api.updateBundle(batchId, bundleId, data);
    setBundles((prev) =>
      prev.map((b) => (b.id === bundleId ? { ...updated, saved: true } : b)),
    );
  }

  async function handleDelete(bundleId: string) {
    if (!batchId) return;
    await api.deleteBundle(batchId, bundleId);
    setBundles((prev) => prev.filter((b) => b.id !== bundleId));
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (pageError || !batch || !batchId) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-destructive">{pageError ?? "Batch not found"}</p>
        <Button asChild variant="outline">
          <Link to="/">Dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 p-6 pb-32">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Review Bundle Details</h1>
        <Button asChild variant="outline">
          <Link to="/">Dashboard</Link>
        </Button>
      </div>

      <div className="space-y-3">
        <span className="inline-block rounded-full bg-muted px-3 py-1 text-sm capitalize">
          {batch.type} batch
        </span>

        <div
          className="rounded-md border border-l-4 bg-card p-4"
          style={{ borderLeftColor: `#${batch.shipper.brand_color}` }}
        >
          <p className="text-sm text-muted-foreground">Shipper</p>
          <p className="font-semibold">{batch.shipper.name}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-muted px-3 py-1 text-sm">
            Batch material: {batch.material.material_name}
          </span>
        </div>

        {batch.container_no && (
          <span className="inline-block rounded-full bg-muted px-3 py-1 text-sm">
            Container No.: {batch.container_no}
          </span>
        )}
      </div>

      <BundleUploadZone onUpload={handleUpload} loading={uploading} />

      {batch.container_no && (
        <div className="max-w-md space-y-2 rounded-md border bg-card p-4">
          <Label htmlFor="container-no">Container No. (detected from uploaded register)</Label>
          <div className="flex gap-2">
            <Input
              id="container-no"
              value={containerNo}
              onChange={(event) => setContainerNo(event.target.value)}
              onBlur={() => void saveDetectedContainer()}
            />
            <Button
              type="button"
              variant="outline"
              disabled={savingContainer || containerNo.trim() === batch.container_no}
              onClick={() => void saveDetectedContainer()}
            >
              {savingContainer ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save correction"}
            </Button>
          </div>
        </div>
      )}

      {uploadError && (
        <Alert variant="destructive">
          <AlertDescription>{uploadError}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4">
        {bundles.map((bundle) => (
          <BundleCard
            key={bundle.id}
            bundle={bundle}
            batchMaterialId={batch.material_id}
            materials={materials}
            saved={bundle.saved}
            onSave={handleSave}
            onDelete={handleDelete}
          />
        ))}
      </div>

      <div className="fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex flex-wrap gap-4 text-sm">
            <span>
              <span className="text-muted-foreground">Total bundles:</span> {totals.count}
            </span>
            <span>
              <span className="text-muted-foreground">Total ingots:</span> {totals.ingots}
            </span>
            <span>
              <span className="text-muted-foreground">Total gross:</span>{" "}
              {totals.gross.toFixed(2)} kg
            </span>
            <span>
              <span className="text-muted-foreground">Total net:</span> {totals.net.toFixed(2)} kg
            </span>
          </div>
          <Button
            disabled={!canProceed}
            onClick={async () => {
              if (!batchId) return;
              await api.updateBatch(batchId, { status: "ready" });
              navigate(`/batches/${batchId}/stickers`);
            }}
          >
            Proceed to Stickers
          </Button>
        </div>
      </div>
    </div>
  );
}
