import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { Loader2 } from "lucide-react";

import DropZone from "@/components/DropZone";
import ShipperCard from "@/components/ShipperCard";
import { BuilderLayout } from "@/components/builder/builder-layout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { api, type Material, type Shipper } from "@/lib/api";
import { ApiError } from "@/lib/http";
import { cn } from "@/lib/utils";

type BatchBuilderProps = {
  type: "domestic" | "export";
  title: string;
  subtitle?: string;
};

export default function BatchBuilder({ type, title, subtitle }: BatchBuilderProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const shipmentId = type === "export" ? searchParams.get("shipmentId") : null;
  const shipmentShipperId = searchParams.get("shipperId");
  const [shippers, setShippers] = useState<Shipper[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [droppedShipper, setDroppedShipper] = useState<Shipper | null>(null);
  const [materialId, setMaterialId] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  useEffect(() => {
    Promise.all([api.getShippers(), api.getMaterials()])
      .then(([shipperList, materialList]) => {
        setShippers(shipperList);
        setMaterials(materialList);
        const locked = shipmentShipperId && shipperList.find((shipper) => shipper.id === shipmentShipperId);
        if (locked) setDroppedShipper(locked);
      })
      .catch(() => setError("Failed to load shippers and materials"))
      .finally(() => setLoading(false));
  }, [shipmentShipperId]);

  const selectedMaterial = materials.find((m) => m.id === materialId) ?? null;

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || over.id !== "shipper-zone" || shipmentShipperId) return;

    const data = active.data.current;
    if (data?.type === "shipper") {
      setDroppedShipper(data.shipper as Shipper);
    }
  }

  async function handleConfirm() {
    if (!droppedShipper || !materialId) return;
    setSubmitting(true);
    setError(null);

    try {
      const batch = await api.createBatch({
        type,
        shipper_id: droppedShipper.id,
        material_id: materialId,
      });
      if (shipmentId) await api.attachBatch(shipmentId, batch.id);
      navigate(`/batches/${batch.id}/ocr`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create batch");
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <BuilderLayout
        title={title}
        backTo={shipmentId ? `/export-documents/${shipmentId}` : "/"}
        sourcePanel={
          <div className="space-y-3">
            <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Shippers
            </h2>
            <div className="space-y-2">
              {shippers.map((shipper) => (
                <ShipperCard
                  key={shipper.id}
                  shipper={{
                    id: shipper.id,
                    name: shipper.name,
                    brand_color: shipper.brand_color,
                  }}
                  disabled={droppedShipper?.id === shipper.id}
                />
              ))}
            </div>
          </div>
        }
        canvasPanel={
          <div className="space-y-6">
            <div>
              <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                Build Your Batch
              </h2>
              {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
            </div>

            <DropZone
              id="shipper-zone"
              label="Shipper"
              item={
                droppedShipper
                  ? {
                      id: droppedShipper.id,
                      name: droppedShipper.name,
                      brand_color: droppedShipper.brand_color,
                    }
                  : null
              }
              onRemove={shipmentShipperId ? undefined : () => setDroppedShipper(null)}
            />

            <div className="space-y-2">
              <Label htmlFor="material">Material</Label>
              <select
                id="material"
                value={materialId}
                onChange={(e) => setMaterialId(e.target.value)}
                className={cn(
                  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
                  "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
              >
                <option value="">Select a material</option>
                {materials.map((material) => (
                  <option key={material.id} value={material.id}>
                    {material.material_name}
                  </option>
                ))}
              </select>

              {selectedMaterial && (
                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="rounded-full bg-muted px-3 py-1 text-sm">
                    HS: {selectedMaterial.hs_code}
                  </span>
                  <span className="rounded-full bg-muted px-3 py-1 text-sm">
                    {selectedMaterial.sticker_display_name}
                  </span>
                </div>
              )}
            </div>
          </div>
        }
        footer={
          <div className="flex flex-col items-end gap-3 sm:flex-row sm:items-center sm:justify-end">
            {error && (
              <Alert variant="destructive" className="flex-1">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button
              disabled={!droppedShipper || !materialId || submitting}
              onClick={handleConfirm}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating batch…
                </>
              ) : (
                "Confirm Batch"
              )}
            </Button>
          </div>
        }
      />
    </DndContext>
  );
}
