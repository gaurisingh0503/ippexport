import { useEffect, useMemo, useState } from "react";
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
  DraggableCustomerCard,
  DraggableShipperCard,
  DropZone,
  PlacedCard,
} from "@/components/builder/builder-cards";
import { Button } from "@/components/ui/button";
import { api, type Customer, type Shipper } from "@/lib/api";
import {
  applyConsigneeSelection,
  formatConsigneeDetail,
  formatConsigneeLabel,
  formatNotify1Detail,
  formatNotify1Label,
  formatNotify2Detail,
  formatNotify2Label,
} from "@/lib/builder";
import { ApiError } from "@/lib/http";

type ZoneId = "zone-consignee" | "zone-shipper" | "zone-notify1" | "zone-notify2";

export default function ExportBuilder() {
  const navigate = useNavigate();
  const [shippers, setShippers] = useState<Shipper[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [shipperId, setShipperId] = useState<string | null>(null);
  const [consigneeId, setConsigneeId] = useState<string | null>(null);
  const [notify1Id, setNotify1Id] = useState<string | null>(null);
  const [notify2Id, setNotify2Id] = useState<string | null>(null);
  const [portOfDischarge, setPortOfDischarge] = useState<string | null>(null);
  const [paymentTerms, setPaymentTerms] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  useEffect(() => {
    Promise.all([api.getShippers(), api.getCustomers()])
      .then(([shipperList, customerList]) => {
        setShippers(shipperList);
        setCustomers(customerList);
      })
      .catch(() => setError("Failed to load shippers and customers"))
      .finally(() => setLoading(false));
  }, []);

  const customerById = useMemo(
    () => new Map(customers.map((customer) => [customer.id, customer])),
    [customers],
  );

  const selectedShipper = shippers.find((s) => s.id === shipperId) ?? null;
  const selectedConsignee = consigneeId ? (customerById.get(consigneeId) ?? null) : null;
  const selectedNotify1 = notify1Id ? (customerById.get(notify1Id) ?? null) : null;
  const selectedNotify2 = notify2Id ? (customerById.get(notify2Id) ?? null) : null;

  const placedCustomerIds = useMemo(
    () => new Set([consigneeId, notify1Id, notify2Id].filter(Boolean) as string[]),
    [consigneeId, notify1Id, notify2Id],
  );

  function applyConsignee(customer: Customer) {
    const selection = applyConsigneeSelection(customer);
    setConsigneeId(selection.consigneeId);
    setNotify1Id(selection.notify1Id);
    setNotify2Id(selection.notify2Id);
    setPortOfDischarge(selection.portOfDischarge);
    setPaymentTerms(selection.paymentTerms);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const zoneId = over.id as ZoneId;
    const data = active.data.current;
    if (!data) return;

    if (data.kind === "shipper" && zoneId === "zone-shipper") {
      setShipperId(data.shipper.id);
      return;
    }

    if (data.kind !== "customer") return;

    const customer = data.customer as Customer;

    if (zoneId === "zone-consignee") {
      applyConsignee(customer);
      return;
    }

    if (zoneId === "zone-notify1") {
      setNotify1Id(customer.id);
      return;
    }

    if (zoneId === "zone-notify2") {
      setNotify2Id(customer.id);
    }
  }

  async function handleConfirm() {
    if (!shipperId || !consigneeId) return;
    setSubmitting(true);
    setError(null);

    try {
      const shipment = await api.createShipment({
        type: "export",
        shipper_id: shipperId,
        consignee_id: consigneeId,
        notify1_id: notify1Id,
        notify2_id: notify2Id,
        port_of_discharge: portOfDischarge,
        payment_terms: paymentTerms,
      });
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
        title="Export Shipment"
        backTo="/shipments/new"
        sourcePanel={
          <div className="space-y-8">
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

            <div className="space-y-3">
              <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                Customers
              </h2>
              <div className="space-y-2">
                {customers.map((customer) => (
                  <DraggableCustomerCard
                    key={customer.id}
                    customer={customer}
                    disabled={placedCustomerIds.has(customer.id)}
                  />
                ))}
              </div>
            </div>
          </div>
        }
        canvasPanel={
          <div className="space-y-4">
            <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Drop zones
            </h2>

            <DropZone id="zone-consignee" label="Consignee" placeholder="Drop customer here">
              {selectedConsignee && (
                <PlacedCard
                  title={formatConsigneeLabel(selectedConsignee)}
                  subtitle={formatConsigneeDetail(selectedConsignee) || undefined}
                  onRemove={() => {
                    setConsigneeId(null);
                    setNotify1Id(null);
                    setNotify2Id(null);
                    setPortOfDischarge(null);
                    setPaymentTerms(null);
                  }}
                />
              )}
            </DropZone>

            {(portOfDischarge || paymentTerms) && (
              <div className="flex flex-wrap gap-2">
                {portOfDischarge && (
                  <span className="rounded-full bg-muted px-3 py-1 text-sm">
                    Port of discharge: {portOfDischarge}
                  </span>
                )}
                {paymentTerms && (
                  <span className="rounded-full bg-muted px-3 py-1 text-sm">
                    Payment terms: {paymentTerms}
                  </span>
                )}
              </div>
            )}

            <DropZone id="zone-shipper" label="Shipper" placeholder="Drop shipper here">
              {selectedShipper && (
                <PlacedCard
                  title={selectedShipper.name}
                  borderColor={`#${selectedShipper.brand_color}`}
                  onRemove={() => setShipperId(null)}
                />
              )}
            </DropZone>

            <DropZone id="zone-notify1" label="Notify Party 1" placeholder="Drop customer here">
              {selectedNotify1 && (
                <PlacedCard
                  title={formatNotify1Label(selectedNotify1)}
                  subtitle={formatNotify1Detail(selectedNotify1) || undefined}
                  onRemove={() => setNotify1Id(null)}
                />
              )}
            </DropZone>

            <DropZone id="zone-notify2" label="Notify Party 2" placeholder="Drop customer here">
              {selectedNotify2 && (
                <PlacedCard
                  title={formatNotify2Label(selectedNotify2)}
                  subtitle={formatNotify2Detail(selectedNotify2) || undefined}
                  onRemove={() => setNotify2Id(null)}
                />
              )}
            </DropZone>
          </div>
        }
        footer={
          <div className="flex items-center gap-4">
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button disabled={!shipperId || !consigneeId || submitting} onClick={handleConfirm}>
              {submitting ? "Creating shipment…" : "Confirm Shipment"}
            </Button>
          </div>
        }
      />
    </DndContext>
  );
}
