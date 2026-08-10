import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { api, type Shipper } from "@/lib/api";
import { ApiError } from "@/lib/http";

type ShipperBuilderProps = {
  type: "domestic" | "export";
  title: string;
};

export default function ShipperBuilder({ type, title }: ShipperBuilderProps) {
  const navigate = useNavigate();
  const [shippers, setShippers] = useState<Shipper[]>([]);
  const [droppedShipper, setDroppedShipper] = useState<Shipper | null>(null);
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

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || over.id !== "shipper-zone") return;

    const data = active.data.current;
    if (data?.kind === "shipper") {
      setDroppedShipper(data.shipper as Shipper);
    }
  }

  async function handleConfirm() {
    if (!droppedShipper) return;
    setSubmitting(true);
    setError(null);

    try {
      const shipment = await api.createShipment({ type, shipper_id: droppedShipper.id });
      navigate(`/shipments/${shipment.id}/ocr`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create shipment");
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
        backTo="/shipments/new"
        sourcePanel={
          <div className="space-y-3">
            <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Shippers
            </h2>
            <div className="space-y-2">
              {shippers.map((shipper) => (
                <ShipperCard
                  key={shipper.id}
                  shipper={shipper}
                  disabled={droppedShipper?.id === shipper.id}
                />
              ))}
            </div>
          </div>
        }
        canvasPanel={
          <div className="space-y-4">
            <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Build Your Shipment
            </h2>
            <DropZone
              id="shipper-zone"
              label="Shipper"
              accepts="shipper"
              item={
                droppedShipper
                  ? {
                      id: droppedShipper.id,
                      name: droppedShipper.name,
                      brand_color: droppedShipper.brand_color,
                    }
                  : null
              }
              onRemove={() => setDroppedShipper(null)}
            />
          </div>
        }
        footer={
          <div className="flex flex-col items-end gap-3 sm:flex-row sm:items-center sm:justify-end">
            {error && (
              <Alert variant="destructive" className="flex-1">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button disabled={!droppedShipper || submitting} onClick={handleConfirm}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating shipment…
                </>
              ) : (
                "Confirm Shipment"
              )}
            </Button>
          </div>
        }
      />
    </DndContext>
  );
}
