import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

import { BuilderLayout } from "@/components/builder/builder-layout";
import {
  DraggableShipperCard,
  DropZone,
  PlacedCard,
} from "@/components/builder/builder-cards";
import { Button } from "@/components/ui/button";
import { api, type Shipper } from "@/lib/api";
import { ApiError } from "@/lib/http";

export default function DomesticBuilder() {
  const navigate = useNavigate();
  const [shippers, setShippers] = useState<Shipper[]>([]);
  const [shipperId, setShipperId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  useEffect(() => {
    api
      .getShippers()
      .then(setShippers)
      .catch(() => setError("Failed to load shippers"))
      .finally(() => setLoading(false));
  }, []);

  const selectedShipper = shippers.find((s) => s.id === shipperId) ?? null;

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || over.id !== "zone-shipper") return;

    const data = active.data.current;
    if (data?.kind === "shipper") {
      setShipperId(data.shipper.id);
    }
  }

  async function handleConfirm() {
    if (!shipperId) return;
    setSubmitting(true);
    setError(null);

    try {
      const shipment = await api.createShipment({ type: "domestic", shipper_id: shipperId });
      navigate(`/shipments/${shipment.id}/ocr`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create shipment");
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <BuilderLayout
        title="Domestic Shipment"
        backTo="/shipments/new"
        sourcePanel={
          <div className="space-y-3">
            <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Shippers
            </h2>
            <div className="space-y-2">
              {shippers.map((shipper) => (
                <DraggableShipperCard
                  key={shipper.id}
                  shipper={shipper}
                  disabled={shipperId === shipper.id}
                />
              ))}
            </div>
          </div>
        }
        canvasPanel={
          <div className="space-y-4">
            <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Drop zones
            </h2>
            <DropZone id="zone-shipper" label="Shipper" placeholder="Drop shipper here">
              {selectedShipper && (
                <PlacedCard
                  title={selectedShipper.name}
                  borderColor={`#${selectedShipper.brand_color}`}
                  onRemove={() => setShipperId(null)}
                />
              )}
            </DropZone>
          </div>
        }
        footer={
          <div className="flex items-center gap-4">
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button disabled={!shipperId || submitting} onClick={handleConfirm}>
              {submitting ? "Creating shipment…" : "Confirm Shipment"}
            </Button>
          </div>
        }
      />
    </DndContext>
  );
}
