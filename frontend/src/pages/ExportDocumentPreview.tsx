import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, type ExportDocument, type StickerBatch } from "@/lib/api";
import { apiErrorMessage } from "@/lib/http";

function kg(value: number | null | undefined): string {
  return value == null ? "—" : `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} kg`;
}

function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-md border p-4">
      <h2 className="flex items-center gap-2 font-semibold">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
          {number}
        </span>
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default function ExportDocumentPreview({ isAdmin }: { isAdmin: boolean }) {
  const { id } = useParams<{ id: string }>();
  const [document, setDocument] = useState<ExportDocument | null>(null);
  const [exportBatches, setExportBatches] = useState<StickerBatch[]>([]);
  const [takenBatchIds, setTakenBatchIds] = useState<Set<string>>(new Set());
  const [netWeightInput, setNetWeightInput] = useState("");
  const [existingBatchId, setExistingBatchId] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    const [doc, batches, allDocuments] = await Promise.all([
      api.getExportDocument(id),
      api.getBatches({ type: "export" }),
      api.getExportDocuments(),
    ]);
    setDocument(doc);
    setNetWeightInput(doc.packing_list_net_weight?.toString() ?? "");
    setExportBatches(batches);
    setTakenBatchIds(new Set(allDocuments.flatMap((item) => item.batches.map((batch) => batch.sticker_batch_id))));
  }, [id]);

  useEffect(() => {
    load().catch((err) => setError(apiErrorMessage(err, "Failed to load export shipment")));
  }, [load]);

  const attached = useMemo(() => {
    if (!document) return [];
    const byId = new Map(exportBatches.map((batch) => [batch.id, batch]));
    return [...document.batches]
      .sort((a, b) => a.position - b.position)
      .map((item) => byId.get(item.sticker_batch_id))
      .filter((batch): batch is StickerBatch => Boolean(batch));
  }, [document, exportBatches]);

  const available = useMemo(
    () =>
      exportBatches.filter(
        (batch) => batch.shipper_id === document?.shipper_id && !takenBatchIds.has(batch.id),
      ),
    [exportBatches, document, takenBatchIds],
  );

  async function run(action: string, fn: () => Promise<unknown>) {
    setBusy(action);
    setError(null);
    try {
      await fn();
      await load();
    } catch (err) {
      setError(apiErrorMessage(err, "Something went wrong"));
    } finally {
      setBusy(null);
    }
  }

  async function downloadInvoicePacking() {
    if (!id) return;
    await run("download", async () => {
      const file = await api.downloadInvoicePacking(id);
      const url = URL.createObjectURL(file.blob);
      const anchor = window.document.createElement("a");
      anchor.href = url;
      anchor.download = file.filename;
      anchor.click();
      URL.revokeObjectURL(url);
    });
  }

  if (!document || !id) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
        <p className={error ? "text-destructive" : "text-muted-foreground"}>
          {error ?? "Loading export shipment…"}
        </p>
        {error && <Button asChild variant="outline"><Link to="/">Dashboard</Link></Button>}
      </div>
    );
  }

  const editable = ["draft", "rejected"].includes(document.status);
  const hasStickers = document.batches.length > 0;
  const difference = document.stickers_net_weight - (document.packing_list_net_weight ?? 0);
  const allBatchesReady = attached.length === document.batches.length && attached.every((batch) => batch.status !== "draft");
  const canMakeInvoice = hasStickers && document.net_weight_cleared && allBatchesReady;

  return (
    <div className="mx-auto min-h-screen max-w-4xl space-y-5 p-6 pt-16">
      <div>
        <p className="text-sm text-muted-foreground">Export shipment</p>
        <h1 className="text-2xl font-semibold">{document.invoice_no}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {document.shipper.name} · {document.consignee.name} · {document.invoice_date}
        </p>
        <p className="mt-2 inline-block rounded-full bg-muted px-2 py-0.5 text-xs capitalize">
          {document.status.replace(/_/g, " ")}
        </p>
        {document.status === "rejected" && document.rejection_comment && (
          <p className="mt-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            Rejected: {document.rejection_comment}
          </p>
        )}
      </div>

      {error && <p className="rounded-md border border-destructive/40 p-3 text-sm text-destructive">{error}</p>}

      <Step number={1} title="Packing list">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label htmlFor="packing-net" className="text-sm text-muted-foreground">Total net weight (kg)</label>
            <Input
              id="packing-net"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              className="w-48"
              value={netWeightInput}
              disabled={!editable}
              onChange={(event) => setNetWeightInput(event.target.value)}
            />
          </div>
          {editable && (
            <Button
              variant="outline"
              disabled={
                busy !== null ||
                !(Number(netWeightInput) > 0) ||
                Number(netWeightInput) === document.packing_list_net_weight
              }
              onClick={() => void run("packing", () => api.updatePackingList(id, Number(netWeightInput)))}
            >
              Save
            </Button>
          )}
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Port: {document.port_of_discharge ?? "—"} · Terms: {document.term_of_delivery ?? "—"} · USD {document.unit_price_usd_t} / T
        </p>
      </Step>

      <Step number={2} title="Stickers">
        {attached.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sticker batches yet.</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {attached.map((batch) => (
              <li key={batch.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                <span>
                  {batch.material.sticker_display_name} · {batch.container_no ?? "No container yet"}
                  <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs capitalize">
                    {batch.status === "draft" ? "In progress" : batch.status.replace(/_/g, " ")}
                  </span>
                </span>
                <span className="flex gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link to={batch.status === "draft" ? `/batches/${batch.id}/ocr` : `/batches/${batch.id}/stickers`}>
                      {batch.status === "draft" ? "Continue" : "Open stickers"}
                    </Link>
                  </Button>
                  {editable && (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy !== null}
                      onClick={() => void run(`detach-${batch.id}`, () => api.detachBatch(id, batch.id))}
                    >
                      Remove
                    </Button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
        {editable && (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button asChild>
              <Link to={`/batches/new/export?shipmentId=${id}&shipperId=${document.shipper_id}`}>
                Add sticker batch
              </Link>
            </Button>
            {available.length > 0 && (
              <>
                <select
                  aria-label="Existing sticker batch"
                  value={existingBatchId}
                  onChange={(event) => setExistingBatchId(event.target.value)}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Or pick an existing batch…</option>
                  {available.map((batch) => (
                    <option key={batch.id} value={batch.id}>
                      {batch.material.sticker_display_name} · {batch.container_no ?? "No container"} ·{" "}
                      {new Date(batch.created_at).toLocaleDateString()}
                    </option>
                  ))}
                </select>
                <Button
                  variant="outline"
                  disabled={!existingBatchId || busy !== null}
                  onClick={() =>
                    void run("attach", async () => {
                      await api.attachBatch(id, existingBatchId);
                      setExistingBatchId("");
                    })
                  }
                >
                  Add
                </Button>
              </>
            )}
          </div>
        )}

        <div
          className={
            "mt-4 rounded-md border p-3 text-sm " +
            (!hasStickers
              ? ""
              : document.net_weight_matches
                ? "border-green-300 bg-green-50 text-green-900"
                : "border-amber-300 bg-amber-50 text-amber-900")
          }
        >
          <div className="grid gap-1 sm:grid-cols-3">
            <span>Packing list: <strong className="tabular-nums">{kg(document.packing_list_net_weight)}</strong></span>
            <span>Stickers: <strong className="tabular-nums">{kg(document.stickers_net_weight)}</strong></span>
            <span>Difference: <strong className="tabular-nums">{hasStickers ? kg(difference) : "—"}</strong></span>
          </div>
          {hasStickers && document.net_weight_matches && (
            <p className="mt-2 flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Net weight matches the packing list.</p>
          )}
          {hasStickers && !document.net_weight_matches && (
            <div className="mt-2 space-y-2">
              <p className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Sticker net weight doesn't match the packing list.
              </p>
              {document.net_weight_override_by ? (
                <p>Mismatch approved by {document.net_weight_override_by}.</p>
              ) : isAdmin ? (
                editable && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy !== null}
                    onClick={() => {
                      if (window.confirm("Approve this net weight mismatch and allow the invoice to be made?")) {
                        void run("override", () => api.overrideNetWeight(id));
                      }
                    }}
                  >
                    Approve mismatch (admin)
                  </Button>
                )
              ) : (
                <p>Fix the stickers or the packing list, or ask an admin to approve the mismatch.</p>
              )}
            </div>
          )}
        </div>
      </Step>

      <Step number={3} title="Invoice & packing list">
        <p className="text-sm text-muted-foreground">
          Includes the container-detail sheets. Available once the net weight check is cleared and every sticker batch is complete.
        </p>
        <Button className="mt-3" onClick={() => void downloadInvoicePacking()} disabled={!canMakeInvoice || busy !== null}>
          {busy === "download" ? "Preparing…" : "Download invoice & packing list"}
        </Button>
      </Step>

      <Step number={4} title="COA & approval">
        {canMakeInvoice ? (
          <Button asChild variant="outline">
            <Link to={`/export-documents/${document.id}/coa`}>Open COA</Link>
          </Button>
        ) : (
          <Button variant="outline" disabled>Open COA</Button>
        )}
      </Step>
    </div>
  );
}
