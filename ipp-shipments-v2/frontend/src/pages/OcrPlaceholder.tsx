import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { api, type StickerBatch } from "@/lib/api";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function OcrPlaceholder() {
  const { id } = useParams<{ id: string }>();
  const [batch, setBatch] = useState<StickerBatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api
      .getBatch(id)
      .then(setBatch)
      .catch(() => setError("Failed to load batch"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !batch) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-destructive">{error ?? "Batch not found"}</p>
        <Button asChild variant="outline">
          <Link to="/">Back to Dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-6">
      <div className="space-y-4">
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

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Material</p>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-muted px-3 py-1 text-sm">{batch.material.material_name}</span>
            <span className="rounded-full bg-muted px-3 py-1 text-sm">
              HS: {batch.material.hs_code}
            </span>
            <span className="rounded-full bg-muted px-3 py-1 text-sm">
              {batch.material.sticker_display_name}
            </span>
          </div>
        </div>

        <div className="flex gap-4 text-sm">
          <span>
            <span className="text-muted-foreground">Status:</span>{" "}
            <span className="capitalize">{batch.status.replace(/_/g, " ")}</span>
          </span>
          <span>
            <span className="text-muted-foreground">Created:</span> {formatDate(batch.created_at)}
          </span>
        </div>
      </div>

      <p className="text-muted-foreground">Phase 4 — Bundle upload and OCR coming next</p>

      <Button asChild variant="outline" className="w-fit">
        <Link to="/">Back to Dashboard</Link>
      </Button>
    </div>
  );
}
