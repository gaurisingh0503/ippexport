import { useEffect, useMemo, useState } from "react";
import { Download, Loader2, Plus } from "lucide-react";
import { Link, useLocation, useParams } from "react-router-dom";

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
  const location = useLocation();
  const newBundleIds = (location.state as { newBundleIds?: string[] } | null)?.newBundleIds ?? null;
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!batchId) return;
    Promise.all([api.getBatch(batchId), api.getBundles(batchId)])
      .then(([batchData, bundleData]) => {
        setBatch(batchData);
        setBundles(bundleData);
        const preselect = newBundleIds?.filter((id) => bundleData.some((bundle) => bundle.id === id));
        setSelectedIds(new Set(preselect?.length ? preselect : bundleData.map((bundle) => bundle.id)));
      })
      .catch((err) => setError(apiErrorMessage(err, "Failed to load sticker preview")))
      .finally(() => setLoading(false));
  }, [batchId, newBundleIds]);

  const allSelected = bundles.length > 0 && selectedIds.size === bundles.length;

  function toggle(bundleId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(bundleId)) next.delete(bundleId);
      else next.add(bundleId);
      return next;
    });
  }

  const ready = useMemo(
    () => bundles.length > 0 && bundles.every(isBundleComplete),
    [bundles],
  );

  async function handleDownload() {
    if (!batchId || !ready || selectedIds.size === 0) return;
    setDownloading(true);
    setError(null);
    try {
      const { blob, filename } = await api.downloadStickers(
        batchId,
        allSelected ? undefined : bundles.filter((bundle) => selectedIds.has(bundle.id)).map((bundle) => bundle.id),
      );
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
    <div className="mx-auto min-h-screen max-w-5xl space-y-6 p-6 pt-16">
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
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link to={`/batches/${batchId}/ocr`}>
              <Plus className="mr-2 h-4 w-4" />
              Add more stickers
            </Link>
          </Button>
          <Button disabled={!ready || downloading || selectedIds.size === 0} onClick={() => void handleDownload()}>
            {downloading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            {allSelected ? "Download all stickers" : `Download ${selectedIds.size} selected`}
          </Button>
        </div>
      </div>

      {error && <p className="rounded-md border border-destructive p-3 text-sm text-destructive">{error}</p>}

      {!ready && (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          Complete every bundle on the Bundle Details page before generating stickers.
        </p>
      )}

      {newBundleIds && newBundleIds.length > 0 && !allSelected && (
        <p className="rounded-md border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
          {newBundleIds.length} new sticker{newBundleIds.length === 1 ? " is" : "s are"} selected, so you only print the
          extra bundles. Tick more below or select all to reprint everything.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <label className="flex cursor-pointer items-center gap-2 text-foreground">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={() =>
              setSelectedIds(allSelected ? new Set() : new Set(bundles.map((bundle) => bundle.id)))
            }
          />
          Select all
        </label>
        <span>•</span>
        <span>
          {selectedIds.size} of {bundles.length} sticker{bundles.length === 1 ? "" : "s"} selected
        </span>
        <span>•</span>
        <span>Default material: {batch.material.sticker_display_name}</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {bundles.map((bundle) => (
          <article
            key={bundle.id}
            className={
              "rounded-md border border-l-4 bg-card p-5 transition-opacity " +
              (selectedIds.has(bundle.id) ? "" : "opacity-50")
            }
            style={{ borderLeftColor: `#${batch.shipper.brand_color}` }}
          >
            <label className="flex cursor-pointer items-start justify-between gap-3">
              <h2 className="font-semibold">{batch.shipper.name}</h2>
              <span className="flex items-center gap-2 text-sm">
                {newBundleIds?.includes(bundle.id) && (
                  <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs text-sky-900">New</span>
                )}
                <input
                  type="checkbox"
                  aria-label={`Print sticker for bundle ${bundle.bundle_no ?? ""}`}
                  checked={selectedIds.has(bundle.id)}
                  onChange={() => toggle(bundle.id)}
                />
              </span>
            </label>
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
