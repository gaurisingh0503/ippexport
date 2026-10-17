import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { api, type ExportDocument } from "@/lib/api";
import { apiErrorMessage } from "@/lib/http";

export default function ExportDocumentPreview() {
  const { id } = useParams<{ id: string }>();
  const [document, setDocument] = useState<ExportDocument | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.getExportDocument(id)
      .then(setDocument)
      .catch((err) => setError(apiErrorMessage(err, "Failed to load export documents")));
  }, [id]);

  async function downloadInvoicePacking() {
    if (!id) return;
    setDownloading(true);
    setError(null);
    try {
      const file = await api.downloadInvoicePacking(id);
      const url = URL.createObjectURL(file.blob);
      const anchor = window.document.createElement("a");
      anchor.href = url;
      anchor.download = file.filename;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(apiErrorMessage(err, "Failed to generate the export document"));
    } finally {
      setDownloading(false);
    }
  }

  if (!document) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
        <p className={error ? "text-destructive" : "text-muted-foreground"}>
          {error ?? "Loading export documents…"}
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
          <h1 className="text-2xl font-semibold">{document.invoice_no}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {document.shipper.name} · {document.invoice_date}
          </p>
        </div>
        <Button asChild variant="outline"><Link to="/">Dashboard</Link></Button>
      </div>

      <section className="rounded-md border p-4">
        <h2 className="font-semibold">Grouped export batches</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {document.batches.length} sticker batch{document.batches.length === 1 ? "" : "es"} selected
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-md border p-4">
          <h2 className="font-semibold">Consignee</h2>
          <p className="mt-2">{document.consignee.name}</p>
          {document.consignee.lines.map((line) => <p key={line} className="text-sm text-muted-foreground">{line}</p>)}
        </div>
        <div className="rounded-md border p-4">
          <h2 className="font-semibold">Commercial terms</h2>
          <dl className="mt-2 space-y-1 text-sm">
            <div><dt className="inline text-muted-foreground">Unit price: </dt><dd className="inline">USD {document.unit_price_usd_t} / T</dd></div>
            <div><dt className="inline text-muted-foreground">Delivery: </dt><dd className="inline">{document.term_of_delivery ?? "—"}</dd></div>
            <div><dt className="inline text-muted-foreground">Port: </dt><dd className="inline">{document.port_of_discharge ?? "—"}</dd></div>
            <div><dt className="inline text-muted-foreground">Payment: </dt><dd className="inline">{document.payment_terms ?? "—"}</dd></div>
          </dl>
        </div>
      </section>

      <section className="rounded-md border p-4">
        <h2 className="font-semibold">Downloads</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Invoice and packing-list download also includes the C-1&2 and C-3&4 container-detail sheets.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button onClick={downloadInvoicePacking} disabled={downloading}>
            {downloading ? "Preparing…" : "Download invoice & packing list"}
          </Button>
          <Button asChild variant="outline">
            <Link to={`/export-documents/${document.id}/coa`}>Next: COA actuals</Link>
          </Button>
        </div>
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      </section>
    </div>
  );
}
