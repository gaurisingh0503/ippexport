import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { Loader2 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

import ExportPartyCard, {
  type DraggableExportParty,
} from "@/components/ExportPartyCard";
import ExportPartyDropZone from "@/components/ExportPartyDropZone";
import { BuilderLayout } from "@/components/builder/builder-layout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  api,
  type Customer,
  type ExportDocumentCreateInput,
  type ExportParty,
  type StickerBatch,
} from "@/lib/api";
import { apiErrorMessage } from "@/lib/http";

function party(name: string | null, ...lines: Array<string | null>): ExportParty | null {
  const cleanLines = lines.filter((line): line is string => Boolean(line?.trim()));
  if (!name?.trim() && cleanLines.length === 0) return null;
  return { name: name?.trim() || "Unnamed party", lines: cleanLines };
}

function sourceItems(customer: Customer): DraggableExportParty[] {
  const items: DraggableExportParty[] = [];
  const notifyRows = [
    [customer.notify1_l1, customer.notify1_l2, customer.notify1_l3, customer.notify1_l4, customer.notify1_l5],
    [customer.notify2_l1, customer.notify2_l2, customer.notify2_l3, customer.notify2_l4],
    [customer.notify3_l1, customer.notify3_l2, customer.notify3_l3],
    [customer.notify4_l1, customer.notify4_l2, customer.notify4_l3],
    [customer.notify5_l1, customer.notify5_l2, customer.notify5_l3],
  ];
  const notifyParties = notifyRows
    .map((fields) => party(fields[0], ...fields.slice(1)))
    .filter((value): value is ExportParty => value !== null);

  const consignee = party(
    customer.consignee_l1,
    customer.consignee_l2,
    customer.consignee_l3,
    customer.consignee_l4,
    customer.consignee_l5,
  );
  if (consignee) {
    items.push({
      id: `consignee-${customer.id}`,
      kind: "consignee",
      party: consignee,
      defaults: {
        portOfDischarge: customer.port_of_discharge ?? "",
        paymentTerms: customer.payment_terms ?? "",
        notifyParties,
          materialName: customer.material_name ?? "",
          coaSpecifications: customer.coa_specifications ?? {},
      },
    });
  }

  for (const [index, fields] of notifyRows.entries()) {
    const notify = party(fields[0], ...fields.slice(1));
    if (notify) items.push({ id: `notify-${customer.id}-${index}`, kind: "notify", party: notify });
  }
  return items;
}

const today = new Date().toISOString().slice(0, 10);

export default function ExportDocumentBuilder() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [batches, setBatches] = useState<StickerBatch[]>([]);
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);
  const [consignee, setConsignee] = useState<ExportParty | null>(null);
  const [notify1, setNotify1] = useState<ExportParty | null>(null);
  const [notify2, setNotify2] = useState<ExportParty | null>(null);
  const [invoiceNo, setInvoiceNo] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(today);
  const [contractNo, setContractNo] = useState("");
  const [billOfLadingNo, setBillOfLadingNo] = useState("");
  const [portOfDischarge, setPortOfDischarge] = useState("");
  const [termOfDelivery, setTermOfDelivery] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [shippingMark, setShippingMark] = useState("IPP");
  const [productionDate, setProductionDate] = useState(today);
  const [customerMaterialName, setCustomerMaterialName] = useState("");
  const [coaSpecifications, setCoaSpecifications] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  useEffect(() => {
    Promise.all([api.getCustomers(), api.getBatches({ type: "export" })])
      .then(([customerData, batchData]) => {
        setCustomers(customerData);
        setBatches(batchData);
        const initialBatchId = searchParams.get("batchId");
        if (initialBatchId && batchData.some((batch) => batch.id === initialBatchId)) {
          setSelectedBatchIds([initialBatchId]);
        }
      })
      .catch((err) => setError(apiErrorMessage(err, "Failed to load export document data")))
      .finally(() => setLoading(false));
  }, [searchParams]);

  const selectedBatches = useMemo(
    () => batches.filter((batch) => selectedBatchIds.includes(batch.id)),
    [batches, selectedBatchIds],
  );
  const selectedShipperId = selectedBatches[0]?.shipper_id;

  function toggleBatch(batch: StickerBatch) {
    if (selectedShipperId && batch.shipper_id !== selectedShipperId) {
      setError("An invoice group can include batches from only one shipper.");
      return;
    }
    setError(null);
    setSelectedBatchIds((current) =>
      current.includes(batch.id) ? current.filter((id) => id !== batch.id) : [...current, batch.id],
    );
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over) return;
    const data = active.data.current as DraggableExportParty | undefined;
    if (!data) return;

    if (over.id === "consignee-zone" && data.kind === "consignee") {
      setConsignee(data.party);
      setPortOfDischarge(data.defaults?.portOfDischarge ?? "");
      setPaymentTerms(data.defaults?.paymentTerms ?? "");
      setTermOfDelivery(data.defaults?.paymentTerms ?? "");
      setCustomerMaterialName(data.defaults?.materialName ?? "");
      setCoaSpecifications(data.defaults?.coaSpecifications ?? {});
      setNotify1(data.defaults?.notifyParties[0] ?? null);
      setNotify2(data.defaults?.notifyParties[1] ?? null);
    }
    if (over.id === "notify1-zone" && data.kind === "notify") setNotify1(data.party);
    if (over.id === "notify2-zone" && data.kind === "notify") setNotify2(data.party);
  }

  async function handleCreate() {
    if (!consignee || selectedBatchIds.length === 0 || !unitPrice.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const data: ExportDocumentCreateInput = {
        batch_ids: selectedBatchIds,
        consignee,
        notify1,
        notify2,
        invoice_no: invoiceNo.trim() || null,
        invoice_date: invoiceDate,
        contract_no: contractNo.trim() || null,
        bill_of_lading_no: billOfLadingNo.trim() || null,
        port_of_discharge: portOfDischarge.trim() || null,
        term_of_delivery: termOfDelivery.trim() || null,
        payment_terms: paymentTerms.trim() || null,
        unit_price_usd_t: Number(unitPrice),
        shipping_mark: shippingMark.trim() || null,
        production_date: productionDate || null,
        customer_material_name: customerMaterialName || null,
        coa_specifications: Object.keys(coaSpecifications).length ? coaSpecifications : null,
      };
      const document = await api.createExportDocument(data);
      navigate(`/export-documents/${document.id}`);
    } catch (err) {
      setError(apiErrorMessage(err, "Failed to create export document group"));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <BuilderLayout
        title="Export Document Builder"
        backTo="/"
        sourcePanel={
          <div className="space-y-5">
            <div>
              <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                Consignees
              </h2>
              <div className="mt-2 space-y-2">
                {customers.flatMap(sourceItems).filter((item) => item.kind === "consignee").map((item) => (
                  <ExportPartyCard key={item.id} item={item} />
                ))}
              </div>
            </div>
            <div>
              <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                Notify Parties
              </h2>
              <div className="mt-2 space-y-2">
                {customers.flatMap(sourceItems).filter((item) => item.kind === "notify").map((item) => (
                  <ExportPartyCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          </div>
        }
        canvasPanel={
          <div className="space-y-6">
            <div>
              <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                Parties and commercial terms
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Drag customer records into the document address fields.
              </p>
            </div>
            <ExportPartyDropZone
              id="consignee-zone"
              label="Consignee"
              party={consignee}
              onChange={setConsignee}
              onRemove={() => setConsignee(null)}
            />
            <ExportPartyDropZone
              id="notify1-zone"
              label="Notify Party"
              party={notify1}
              onChange={setNotify1}
              onRemove={() => setNotify1(null)}
            />
            <ExportPartyDropZone
              id="notify2-zone"
              label="2nd Notify Party"
              party={notify2}
              onChange={setNotify2}
              onRemove={() => setNotify2(null)}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["Invoice No.", invoiceNo, setInvoiceNo, "text"],
                ["Invoice Date", invoiceDate, setInvoiceDate, "date"],
                ["Contract No.", contractNo, setContractNo, "text"],
                ["Bill of Lading No.", billOfLadingNo, setBillOfLadingNo, "text"],
                ["Port of Discharge", portOfDischarge, setPortOfDischarge, "text"],
                ["Unit Price (USD / T)", unitPrice, setUnitPrice, "number"],
                ["Shipping Mark", shippingMark, setShippingMark, "text"],
                ["Production Date", productionDate, setProductionDate, "date"],
              ].map(([label, value, setValue, type]) => (
                <div key={label as string} className="space-y-1">
                  <Label>{label as string}</Label>
                  <Input
                    type={type as string}
                    value={value as string}
                    step={type === "number" ? "0.01" : undefined}
                    placeholder={label === "Invoice No." ? "Generated automatically (editable)" : undefined}
                    onChange={(event) => {
                      const next = event.target.value;
                      if (label === "Invoice Date" && productionDate === invoiceDate) {
                        setProductionDate(next);
                      }
                      (setValue as (next: string) => void)(next);
                    }}
                  />
                </div>
              ))}
              <div className="space-y-1">
                <Label htmlFor="payment-terms">Payment Terms</Label>
                <select
                  id="payment-terms"
                  value={paymentTerms}
                  onChange={(event) => {
                    setPaymentTerms(event.target.value);
                    setTermOfDelivery(event.target.value);
                  }}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select payment terms</option>
                  <option value="FOB">FOB</option>
                  <option value="CIF">CIF</option>
                  <option value="100% Against scan copy of OBL within 5 days">
                    100% Against scan copy of OBL within 5 days
                  </option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-sm font-medium">Completed export sticker batches</h2>
              {batches.map((batch) => (
                <label key={batch.id} className="flex cursor-pointer items-center gap-3 rounded-md border p-3">
                  <input
                    type="checkbox"
                    checked={selectedBatchIds.includes(batch.id)}
                    onChange={() => toggleBatch(batch)}
                  />
                  <span>
                    {batch.shipper.name} · {batch.material.sticker_display_name} · {batch.container_no ?? "No container"}
                  </span>
                </label>
              ))}
            </div>
          </div>
        }
        footer={
          <div className="flex items-center justify-end gap-4">
            {error && <Alert variant="destructive" className="flex-1"><AlertDescription>{error}</AlertDescription></Alert>}
            <Button
              disabled={!consignee || selectedBatchIds.length === 0 || !unitPrice.trim() || submitting}
              onClick={() => void handleCreate()}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create documents
            </Button>
          </div>
        }
      />
    </DndContext>
  );
}
