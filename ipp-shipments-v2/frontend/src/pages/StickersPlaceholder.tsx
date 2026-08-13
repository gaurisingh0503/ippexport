import { useEffect, useMemo, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { api, type Bundle, type StickerBatch } from "@/lib/api";
import { isBundleComplete } from "@/lib/bundle-utils";
import { apiErrorMessage } from "@/lib/http";

export default function StickersPlaceholder() {
  const { id: batchId } = useParams<{ id: string }>();
  const [batch, setBatch] = useState<StickerBatch | null>(null);
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!batchId) return;
    Promise.all([api.getBatch(batchId), api.getBundles(batchId)])
      .then(([batchData, bundleData]) => {
        setBatch(batchData);
        setBundles(bundleData);
      })
      .catch((err) => setError(apiErrorMessage(err, "Failed to load sticker preview")))
      .finally(() => setLoading(false));
  }, [batchId]);

  const ready = useMemo(
    () => bundles.length > 0 && bundles.every(isBundleComplete),
    [bundles],
  );

  async function handleDownload() {
    if (!batchId || !ready) return;
    setDownloading(true);
    setError(null);
    try {
      const { blob, filename } = await api.downloadStickers(batchId);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(apiErrorMessage(err, "Failed to generate sticker Excel"));
    } finally {
      setDownloading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
        <p className="text-destructive">{error ?? "Batch not found"}</p>
        <Button asChild variant="outline">
          <Link to="/">Back to Dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-5xl space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Sticker preview</p>
          <h1 className="text-2xl font-semibold">{batch.shipper.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {batch.type === "export"
              ? "Export sticker template"
              : `Domestic ${batch.shipper.slug === "ipp" ? "IPP" : "Rich-Siri"} template`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to={`/batches/${batchId}/ocr`}>Back to bundles</Link>
          </Button>
          {batch.type === "export" && (
            <Button asChild variant="outline" disabled={!ready}>
              <Link to={`/export-documents/new?batchId=${batchId}`}>Create export documents</Link>
            </Button>
          )}
          <Button disabled={!ready || downloading} onClick={() => void handleDownload()}>
            {downloading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Download Excel
          </Button>
        </div>
      </div>

      {error && <p className="rounded-md border border-destructive p-3 text-sm text-destructive">{error}</p>}

      {!ready && (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          Complete every bundle on the Bundle Details page before generating stickers.
        </p>
      )}

      <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
        <span>{bundles.length} sticker{bundles.length === 1 ? "" : "s"}</span>
        <span>•</span>
        <span>Default material: {batch.material.sticker_display_name}</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {bundles.map((bundle) => (
          <article
            key={bundle.id}
            className="rounded-md border border-l-4 bg-card p-5"
            style={{ borderLeftColor: `#${batch.shipper.brand_color}` }}
          >
            <h2 className="font-semibold">{batch.shipper.name}</h2>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div className="col-span-2">
                <dt className="text-muted-foreground">Material</dt>
                <dd>{bundle.material?.sticker_display_name ?? "Not set"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Batch No.</dt>
                <dd>{bundle.batch_no ?? "Not set"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Bundle No.</dt>
                <dd>{bundle.bundle_no ?? "Not set"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Ingots</dt>
                <dd>{bundle.ingot_count ?? "Not set"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Gross / Net</dt>
                <dd>
                  {bundle.gross_weight ?? "—"} / {bundle.net_weight ?? "—"} kg
                </dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </div>
  );
}
