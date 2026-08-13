import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api, type ExportDocument, type StickerBatch } from "@/lib/api";
import { env } from "@/lib/env";
import { signOut } from "@/lib/supabase";

type DashboardProps = {
  email: string;
  onSignOut: () => void;
  demoMode?: boolean;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function nextStep(batch: StickerBatch, document?: ExportDocument): { label: string; path: string } {
  if (document?.status === "pending_approval") {
    return { label: "Pending approval", path: `/export-documents/${document.id}/coa` };
  }
  if (document?.status === "approved") {
    return { label: "Approved", path: `/export-documents/${document.id}` };
  }
  if (batch.status === "draft") return { label: "Review bundle details", path: `/batches/${batch.id}/ocr` };
  return { label: "Open stickers", path: `/batches/${batch.id}/stickers` };
}

export default function Dashboard({ email, onSignOut, demoMode = false }: DashboardProps) {
  const navigate = useNavigate();
  const isAdmin = demoMode || email.toLowerCase() === env.adminEmail.toLowerCase();
  const [batches, setBatches] = useState<StickerBatch[]>([]);
  const [documents, setDocuments] = useState<ExportDocument[]>([]);

  useEffect(() => {
    Promise.all([api.getBatches(), api.getExportDocuments()])
      .then(([loadedBatches, loadedDocuments]) => {
        setBatches(loadedBatches);
        setDocuments(loadedDocuments);
      })
      .catch(() => setBatches([]));
  }, []);

  async function handleSignOut() {
    if (!demoMode) await signOut();
    onSignOut();
  }

  const recent = batches.slice(0, 5);

  return (
    <div className="mx-auto grid min-h-screen max-w-6xl gap-8 p-6 md:grid-cols-[190px_1fr]">
      <aside className="space-y-3 border-r pr-4">
        <h1 className="text-xl font-semibold">IPP Shipments</h1>
        <p className="text-sm text-muted-foreground">{email}</p>
        <div className="flex flex-col gap-2">
          <Button asChild><Link to="/batches/new">New Batch</Link></Button>
          <Button asChild variant="secondary"><Link to="/customers">Customers</Link></Button>
          <Button asChild variant="secondary"><Link to="/shipments">Shipment History</Link></Button>
          <Button asChild variant="secondary"><Link to="/submit-customer">Add New Customer</Link></Button>
          {isAdmin && <Button asChild variant="secondary"><Link to="/admin">Admin</Link></Button>}
        </div>
      </aside>
      <main className="space-y-6">
      {demoMode && (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          Demo mode: sample data is local, downloads are generated locally, and all changes are blocked.
        </p>
      )}
      <div className="text-center">
        <h2 className="text-2xl font-semibold">Dashboard</h2>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-medium">Recent Batches</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">No batches yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Shipper</TableHead>
                <TableHead>Material</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Next step</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recent.map((batch) => (
                (() => {
                  const document = documents.find((item) =>
                    item.batches.some((documentBatch) => documentBatch.sticker_batch_id === batch.id),
                  );
                  const action = nextStep(batch, document);
                  return (
                <TableRow
                  key={batch.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/batches/${batch.id}/ocr`)}
                >
                  <TableCell>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize">
                      {batch.type}
                    </span>
                  </TableCell>
                  <TableCell>{batch.shipper.name}</TableCell>
                  <TableCell>{batch.material.material_name}</TableCell>
                  <TableCell className="capitalize">
                    {batch.status.replace(/_/g, " ")}
                  </TableCell>
                  <TableCell>{formatDate(batch.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(event) => {
                        event.stopPropagation();
                        navigate(action.path);
                      }}
                    >
                      {action.label}
                    </Button>
                  </TableCell>
                </TableRow>
                  );
                })()
              ))}
            </TableBody>
          </Table>
        )}
      </div>
      </main>
      <Button className="fixed right-4 top-4" variant="outline" onClick={handleSignOut}>
        {demoMode ? "Exit demo" : "Sign Out"}
      </Button>
    </div>
  );
}
