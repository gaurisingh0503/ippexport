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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api, type ExportDocument, type StickerBatch } from "@/lib/api";
import { signOut } from "@/lib/supabase";

type DashboardProps = {
  email: string;
  onSignOut: () => void;
  demoMode?: boolean;
  isAdmin: boolean;
};

const TAB_KEY = "ipp-dashboard-tab";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function shipmentStage(document: ExportDocument): string {
  if (document.status === "approved") return "Approved";
  if (document.status === "pending_approval") return "Pending approval";
  if (document.status === "rejected") return "Rejected — fix and resend";
  if (document.batches.length === 0) return "Add stickers";
  if (!document.net_weight_cleared) return "Net weight mismatch";
  return "Invoice & COA";
}

function domesticNextStep(batch: StickerBatch): { label: string; path: string } {
  if (batch.status === "draft") return { label: "Review bundle details", path: `/batches/${batch.id}/ocr` };
  return { label: "Open stickers", path: `/batches/${batch.id}/stickers` };
}

function readTab(): string {
  try {
    return window.localStorage.getItem(TAB_KEY) ?? "export";
  } catch {
    return "export";
  }
}

export default function Dashboard({ email, onSignOut, demoMode = false, isAdmin }: DashboardProps) {
  const navigate = useNavigate();
  const [tab, setTab] = useState(readTab);
  const [domesticBatches, setDomesticBatches] = useState<StickerBatch[]>([]);
  const [documents, setDocuments] = useState<ExportDocument[]>([]);

  useEffect(() => {
    api.getExportDocuments().then(setDocuments).catch(() => setDocuments([]));
    api.getBatches({ type: "domestic" }).then(setDomesticBatches).catch(() => setDomesticBatches([]));
  }, []);

  function changeTab(next: string) {
    setTab(next);
    try {
      window.localStorage.setItem(TAB_KEY, next);
    } catch {
      // Tab memory is a convenience only.
    }
  }

  async function handleSignOut() {
    if (!demoMode) await signOut();
    onSignOut();
  }

  return (
    <div className="mx-auto grid min-h-screen max-w-6xl gap-8 p-6 md:grid-cols-[190px_1fr]">
      <aside className="space-y-3 border-r pr-4">
        <h1 className="text-xl font-semibold">IPP Shipments</h1>
        <p className="break-all text-sm text-muted-foreground">{email}</p>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{isAdmin ? "Admin" : "User"}</p>
        <div className="flex flex-col gap-2">
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
        <h2 className="text-center text-2xl font-semibold">Dashboard</h2>

        <Tabs value={tab} onValueChange={changeTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="export">Export</TabsTrigger>
            <TabsTrigger value="domestic">Domestic</TabsTrigger>
          </TabsList>

          <TabsContent value="export" className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-medium">Export shipments</h3>
                <p className="text-sm text-muted-foreground">
                  Packing list → stickers → invoice → COA
                </p>
              </div>
              <Button asChild><Link to="/export-documents/new">New export shipment</Link></Button>
            </div>
            {documents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No export shipments yet.</p>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Consignee</TableHead>
                      <TableHead>Shipper</TableHead>
                      <TableHead className="text-right">Net weight (kg)</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Stage</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.map((document) => (
                      <TableRow
                        key={document.id}
                        className="cursor-pointer"
                        onClick={() => navigate(`/export-documents/${document.id}`)}
                      >
                        <TableCell className="font-mono text-xs">{document.invoice_no}</TableCell>
                        <TableCell>{document.consignee.name}</TableCell>
                        <TableCell>{document.shipper.name}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {document.stickers_net_weight.toLocaleString()} / {document.packing_list_net_weight?.toLocaleString() ?? "—"}
                        </TableCell>
                        <TableCell>{formatDate(document.created_at)}</TableCell>
                        <TableCell className="text-right">
                          <span
                            className={
                              !document.net_weight_cleared && document.batches.length > 0
                                ? "rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-900"
                                : "rounded-full bg-muted px-2 py-0.5 text-xs"
                            }
                          >
                            {shipmentStage(document)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="domestic" className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-medium">Domestic batches</h3>
                <p className="text-sm text-muted-foreground">Stickers only</p>
              </div>
              <Button asChild><Link to="/batches/new/domestic">New domestic batch</Link></Button>
            </div>
            {domesticBatches.length === 0 ? (
              <p className="text-sm text-muted-foreground">No domestic batches yet.</p>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Shipper</TableHead>
                      <TableHead>Material</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Next step</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {domesticBatches.map((batch) => {
                      const action = domesticNextStep(batch);
                      return (
                        <TableRow key={batch.id}>
                          <TableCell>{batch.shipper.name}</TableCell>
                          <TableCell>{batch.material.material_name}</TableCell>
                          <TableCell className="capitalize">{batch.status.replace(/_/g, " ")}</TableCell>
                          <TableCell>{formatDate(batch.created_at)}</TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="outline" onClick={() => navigate(action.path)}>
                              {action.label}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
      <Button className="fixed right-4 top-4" variant="outline" onClick={handleSignOut}>
        {demoMode ? "Exit demo" : "Sign Out"}
      </Button>
    </div>
  );
}
