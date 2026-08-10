import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Check, Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, type Bundle, type Shipment } from "@/lib/api";
import { ApiError } from "@/lib/http";
import { isAcceptableImageFile } from "@/lib/image-file";
import { cn } from "@/lib/utils";

type BundleField = keyof Pick<
  Bundle,
  "material_name" | "batch_no" | "bundle_no" | "ingot_count" | "gross_weight" | "net_weight"
>;

type BundleCardState = {
  id: string;
  fields: Record<BundleField, string>;
  ocrNullFields: Set<BundleField>;
  thumbnailUrl: string;
  loading: boolean;
  saving: boolean;
  saved: boolean;
  error: string | null;
};

const FIELD_LABELS: Record<BundleField, string> = {
  material_name: "Material Name",
  batch_no: "Batch No.",
  bundle_no: "Bundle No.",
  ingot_count: "Number of Ingots",
  gross_weight: "Gross Weight",
  net_weight: "Net Weight",
};

const NUMERIC_FIELDS = new Set<BundleField>(["ingot_count", "gross_weight", "net_weight"]);

function bundleToFields(bundle: Bundle): Record<BundleField, string> {
  return {
    material_name: bundle.material_name ?? "",
    batch_no: bundle.batch_no ?? "",
    bundle_no: bundle.bundle_no ?? "",
    ingot_count: bundle.ingot_count != null ? String(bundle.ingot_count) : "",
    gross_weight: bundle.gross_weight != null ? String(bundle.gross_weight) : "",
    net_weight: bundle.net_weight != null ? String(bundle.net_weight) : "",
  };
}

function ocrNullFieldsFromBundle(bundle: Bundle): Set<BundleField> {
  const nulls = new Set<BundleField>();
  if (bundle.material_name == null) nulls.add("material_name");
  if (bundle.batch_no == null) nulls.add("batch_no");
  if (bundle.bundle_no == null) nulls.add("bundle_no");
  if (bundle.ingot_count == null) nulls.add("ingot_count");
  if (bundle.gross_weight == null) nulls.add("gross_weight");
  if (bundle.net_weight == null) nulls.add("net_weight");
  return nulls;
}

function fieldsToUpdate(fields: Record<BundleField, string>) {
  const trim = (value: string) => value.trim();
  return {
    material_name: trim(fields.material_name) || null,
    batch_no: trim(fields.batch_no) || null,
    bundle_no: trim(fields.bundle_no) || null,
    ingot_count: trim(fields.ingot_count) ? Number(fields.ingot_count) : null,
    gross_weight: trim(fields.gross_weight) ? Number(fields.gross_weight) : null,
    net_weight: trim(fields.net_weight) ? Number(fields.net_weight) : null,
  };
}

function isComplete(fields: Record<BundleField, string>): boolean {
  return Object.values(fields).every((value) => value.trim() !== "");
}

function cardFromBundle(bundle: Bundle, thumbnailUrl: string): BundleCardState {
  return {
    id: bundle.id,
    fields: bundleToFields(bundle),
    ocrNullFields: ocrNullFieldsFromBundle(bundle),
    thumbnailUrl,
    loading: false,
    saving: false,
    saved: false,
    error: null,
  };
}

export default function OcrPage() {
  const { id: shipmentId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [cards, setCards] = useState<BundleCardState[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (!shipmentId) return;

    Promise.all([api.getShipment(shipmentId), api.getBundles(shipmentId)])
      .then(([shipmentData, bundles]) => {
        setShipment(shipmentData);
        setCards(
          bundles.map((bundle) =>
            cardFromBundle(bundle, bundle.image_url ?? ""),
          ),
        );
      })
      .catch(() => setPageError("Failed to load shipment"))
      .finally(() => setPageLoading(false));
  }, [shipmentId]);

  const totals = useMemo(() => {
    let totalIngots = 0;
    let totalGross = 0;
    let totalNet = 0;

    for (const card of cards) {
      if (card.loading) continue;
      const ingots = Number(card.fields.ingot_count);
      const gross = Number(card.fields.gross_weight);
      const net = Number(card.fields.net_weight);
      if (!Number.isNaN(ingots)) totalIngots += ingots;
      if (!Number.isNaN(gross)) totalGross += gross;
      if (!Number.isNaN(net)) totalNet += net;
    }

    return {
      bundles: cards.filter((c) => !c.loading).length,
      ingots: totalIngots,
      gross: totalGross,
      net: totalNet,
    };
  }, [cards]);

  const canProceed = useMemo(() => {
    const savedCards = cards.filter((c) => !c.loading && c.saved);
    return savedCards.length > 0 && savedCards.every((c) => isComplete(c.fields));
  }, [cards]);

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      if (!shipmentId) return;

      const imageFiles = Array.from(files).filter(isAcceptableImageFile);
      if (imageFiles.length === 0) {
        setUploadError("No JPG or PNG images found. Select image files from the folder.");
        return;
      }
      setUploadError(null);

      for (const file of imageFiles) {
        const tempId = `pending-${crypto.randomUUID()}`;
        const thumbnailUrl = URL.createObjectURL(file);

        setCards((prev) => [
          ...prev,
          {
            id: tempId,
            fields: {
              material_name: "",
              batch_no: "",
              bundle_no: "",
              ingot_count: "",
              gross_weight: "",
              net_weight: "",
            },
            ocrNullFields: new Set(),
            thumbnailUrl,
            loading: true,
            saving: false,
            saved: false,
            error: null,
          },
        ]);

        try {
          const bundle = await api.uploadBundle(shipmentId, file);
          setCards((prev) =>
            prev.map((card) =>
              card.id === tempId
                ? {
                    ...cardFromBundle(bundle, thumbnailUrl),
                    thumbnailUrl: bundle.image_url ?? thumbnailUrl,
                  }
                : card,
            ),
          );
        } catch (err) {
          const message = err instanceof ApiError ? err.message : "Upload failed";
          setCards((prev) =>
            prev.map((card) =>
              card.id === tempId ? { ...card, loading: false, error: message } : card,
            ),
          );
        }
      }
    },
    [shipmentId],
  );

  function updateField(cardId: string, field: BundleField, value: string) {
    setCards((prev) =>
      prev.map((card) =>
        card.id === cardId
          ? { ...card, fields: { ...card.fields, [field]: value }, saved: false }
          : card,
      ),
    );
  }

  async function saveCard(cardId: string) {
    if (!shipmentId) return;

    const card = cards.find((c) => c.id === cardId);
    if (!card || card.loading) return;

    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, saving: true, error: null } : c)),
    );

    try {
      const updated = await api.updateBundle(shipmentId, cardId, fieldsToUpdate(card.fields));
      setCards((prev) =>
        prev.map((c) =>
          c.id === cardId
            ? {
                ...c,
                fields: bundleToFields(updated),
                saving: false,
                saved: true,
                ocrNullFields: new Set(),
              }
            : c,
        ),
      );
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Save failed";
      setCards((prev) =>
        prev.map((c) => (c.id === cardId ? { ...c, saving: false, error: message } : c)),
      );
    }
  }

  async function removeCard(cardId: string) {
    if (!shipmentId) return;

    const card = cards.find((c) => c.id === cardId);
    if (!card) return;

    if (card.loading || cardId.startsWith("pending-")) {
      setCards((prev) => prev.filter((c) => c.id !== cardId));
      if (card.thumbnailUrl.startsWith("blob:")) URL.revokeObjectURL(card.thumbnailUrl);
      return;
    }

    try {
      await api.deleteBundle(shipmentId, cardId);
      setCards((prev) => prev.filter((c) => c.id !== cardId));
      if (card.thumbnailUrl.startsWith("blob:")) URL.revokeObjectURL(card.thumbnailUrl);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Delete failed";
      setCards((prev) =>
        prev.map((c) => (c.id === cardId ? { ...c, error: message } : c)),
      );
    }
  }

  function handleDrop(event: React.DragEvent) {
    event.preventDefault();
    setDragOver(false);
    if (event.dataTransfer.files.length > 0) {
      void uploadFiles(event.dataTransfer.files);
    }
  }

  if (pageLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (pageError || !shipment || !shipmentId) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-destructive">{pageError ?? "Shipment not found"}</p>
        <Button asChild variant="outline">
          <Link to="/">Dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Bundle OCR</h1>
        <Button asChild variant="outline">
          <Link to="/">Dashboard</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Shipment summary</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-1 text-sm">
          <p>
            <span className="text-muted-foreground">Type:</span>{" "}
            {shipment.type === "export" ? "Export" : "Domestic"}
          </p>
          <p>
            <span className="text-muted-foreground">Shipper:</span> {shipment.shipper.name}
          </p>
          {shipment.consignee && (
            <p>
              <span className="text-muted-foreground">Consignee:</span>{" "}
              {shipment.consignee.name}
            </p>
          )}
        </CardContent>
      </Card>

      <div
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-10 transition-colors",
          dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/30",
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
        }}
      >
        <p className="font-medium">Drop bundle photos here</p>
        <p className="text-sm text-muted-foreground">
          or click to browse — JPG and PNG (extension optional)
        </p>
        {uploadError && <p className="mt-2 text-sm text-destructive">{uploadError}</p>}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) void uploadFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      <div className="space-y-4">
        {cards.map((card) => (
          <Card key={card.id} className={cn(card.saved && "border-green-500/50")}>
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <div className="shrink-0">
                  {card.thumbnailUrl ? (
                    <img
                      src={card.thumbnailUrl}
                      alt="Bundle tag"
                      className="h-24 w-24 rounded-md border object-cover"
                    />
                  ) : (
                    <div className="flex h-24 w-24 items-center justify-center rounded-md border bg-muted">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {card.loading && (
                        <span className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Running OCR…
                        </span>
                      )}
                      {card.saved && (
                        <span className="flex items-center gap-1 text-sm text-green-600">
                          <Check className="h-4 w-4" />
                          Saved
                        </span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={card.loading}
                      onClick={() => void removeCard(card.id)}
                      aria-label="Delete bundle"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {!card.loading && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {(Object.keys(FIELD_LABELS) as BundleField[]).map((field) => {
                        const isEmpty = card.fields[field].trim() === "";
                        const needsAttention =
                          isEmpty && (card.ocrNullFields.has(field) || !card.saved);

                        return (
                          <div key={field} className="space-y-1">
                            <Label htmlFor={`${card.id}-${field}`}>{FIELD_LABELS[field]}</Label>
                            <Input
                              id={`${card.id}-${field}`}
                              type={NUMERIC_FIELDS.has(field) ? "number" : "text"}
                              step={field === "ingot_count" ? "1" : "0.01"}
                              value={card.fields[field]}
                              onChange={(e) => updateField(card.id, field, e.target.value)}
                              className={cn(needsAttention && "border-destructive")}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {card.error && <p className="text-sm text-destructive">{card.error}</p>}

                  {!card.loading && (
                    <Button
                      size="sm"
                      disabled={card.saving}
                      onClick={() => void saveCard(card.id)}
                    >
                      {card.saving ? "Saving…" : "Save"}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="sticky bottom-0 bg-background/95 backdrop-blur">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
          <div className="flex flex-wrap gap-4 text-sm">
            <span>
              <span className="text-muted-foreground">Bundles:</span> {totals.bundles}
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
            onClick={() => navigate(`/shipments/${shipmentId}/stickers`)}
          >
            Proceed to Stickers
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
