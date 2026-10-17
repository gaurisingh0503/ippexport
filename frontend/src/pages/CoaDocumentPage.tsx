import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { api, type ExportDocument } from "@/lib/api";
import { apiErrorMessage } from "@/lib/http";

export default function CoaDocumentPage() {
  const { id } = useParams<{ id: string }>();
  const [document, setDocument] = useState<ExportDocument | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [lots, setLots] = useState<string[]>([]);
  const [uploadingLot, setUploadingLot] = useState<string | null>(null);
  const [specifications, setSpecifications] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!id) return;
    api.getExportDocument(id)
      .then(async (loadedDocument) => {
        setDocument(loadedDocument);
        setSpecifications(loadedDocument.coa_specifications ?? {});
        const bundles = await Promise.all(loadedDocument.batches.map((batch) => api.getBundles(batch.sticker_batch_id)));
        setLots([...new Set(bundles.flat().map((bundle) => bundle.batch_no).filter((lot): lot is string => Boolean(lot)))]);
      })
      .catch((err) => setError(apiErrorMessage(err, "Failed to load the COA document")));
  }, [id]);

  async function downloadCoa() {
    if (!id) return;
    setDownloading(true);
    setError(null);
    try {
      const file = await api.downloadCoa(id);
      const url = URL.createObjectURL(file.blob);
      const anchor = window.document.createElement("a");
      anchor.href = url;
      anchor.download = file.filename;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(apiErrorMessage(err, "Failed to generate the COA"));
    } finally {
      setDownloading(false);
    }
  }

  async function submitForApproval() {
    if (!id) return;
    try {
      setDocument(await api.submitExportDocument(id));
    } catch (err) {
      setError(apiErrorMessage(err, "Failed to submit for approval"));
    }
  }

  async function saveSpecifications() {
    if (!id) return;
    try {
      setDocument(await api.updateCoaSpecifications(id, specifications));
    } catch (err) {
      setError(apiErrorMessage(err, "Failed to save COA specifications"));
    }
  }

  async function uploadActuals(lot: string, file: File) {
    if (!id) return;
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setError("Upload a JPEG or PNG lab-analysis photo.");
      return;
    }
    setUploadingLot(lot);
    setError(null);
    try {
      setDocument(await api.uploadCoaActuals(id, lot, file));
    } catch (err) {
      setError(apiErrorMessage(err, `Failed to extract actuals for ${lot}`));
    } finally {
      setUploadingLot(null);
    }
  }

  if (!document) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
        <p className={error ? "text-destructive" : "text-muted-foreground"}>
          {error ?? "Loading COA…"}
        </p>
        {error && <Button asChild variant="outline"><Link to="/">Dashboard</Link></Button>}
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-4xl space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Export document group</p>
          <h1 className="text-2xl font-semibold">COA · {document.invoice_no}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload and review actual analysis results for each selected container before download.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to={`/export-documents/${document.id}`}>Back to invoice & packing list</Link>
        </Button>
      </div>

      <section className="rounded-md border p-4">
        <h2 className="font-semibold">Certificate of Analysis</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload one JPEG or PNG lab-analysis photo for each lot. The app extracts the actual element
          percentages; specifications remain fixed in the template.
        </p>
        {["Sn", "Sb", "Bi", "Cu", "As", "Ag", "Cd", "Zn", "Co", "Te", "Fe", "Ni", "Pb"].length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-medium">Specifications</p>
            <p className="text-sm text-muted-foreground">These are the customer defaults. Edit for this shipment if needed.</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {["Sn", "Sb", "Bi", "Cu", "As", "Ag", "Cd", "Zn", "Co", "Te", "Fe", "Ni", "Pb"].map((symbol) => (
                <label key={symbol} className="flex items-center gap-2 text-sm">
                  <span className="w-6 font-medium">{symbol}</span>
                  <input
                    className="h-9 flex-1 rounded-md border bg-background px-3"
                    value={specifications[symbol] ?? ""}
                    disabled={!["draft", "rejected"].includes(document.status)}
                    onChange={(event) => setSpecifications((current) => ({ ...current, [symbol]: event.target.value }))}
                  />
                </label>
              ))}
            </div>
            {["draft", "rejected"].includes(document.status) && <Button className="mt-3" variant="outline" onClick={saveSpecifications}>Save specifications</Button>}
          </div>
        )}
        <div className="mt-4 space-y-3">
          {lots.map((lot) => (
            <label key={lot} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
              <span className="font-medium">Lot {lot}</span>
              <span className="text-sm text-muted-foreground">
                {document.coa_actuals?.[lot] ? "Actuals extracted" : "Upload lab analysis"}
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png"
                disabled={uploadingLot !== null}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void uploadActuals(lot, file);
                }}
              />
              {uploadingLot === lot && <span className="text-sm text-muted-foreground">Extracting…</span>}
            </label>
          ))}
        </div>
        <Button className="mt-4" onClick={downloadCoa} disabled={downloading}>
          {downloading ? "Preparing…" : "Download COA"}
        </Button>
        {document.rejection_comment && (
          <p className="mt-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            Rejected: {document.rejection_comment}
          </p>
        )}
        {["draft", "rejected"].includes(document.status) && (
          <Button className="mt-4 ml-3" variant="outline" onClick={submitForApproval}>
            {document.status === "rejected" ? "Resubmit for approval" : "Send for approval"}
          </Button>
        )}
        {document.status !== "draft" && (
          <p className="mt-3 text-sm text-muted-foreground">
            Status: {document.status.replace("_", " ")}
          </p>
        )}
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      </section>
    </div>
  );
}
