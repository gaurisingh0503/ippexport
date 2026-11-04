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
import { api, type StickerBatch } from "@/lib/api";
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

function nextStep(batch: StickerBatch): { label: string; path: string } {
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

function BatchTable({ batches, onOpen }: { batches: StickerBatch[]; onOpen: (path: string) => void }) {
  if (batches.length === 0) return <p className="text-sm text-muted-foreground">No batches yet.</p>;
  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Shipper</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Material</TableHead>
            <TableHead>Container</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Next step</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {batches.map((batch) => {
            const action = nextStep(batch);
            return (
              <TableRow key={batch.id}>
                <TableCell>{batch.shipper.name}</TableCell>
                <TableCell>{batch.customer?.name ?? "—"}</TableCell>
                <TableCell>{batch.material.material_name}</TableCell>
                <TableCell>{batch.container_no ?? "—"}</TableCell>
                <TableCell className="capitalize">{batch.status.replace(/_/g, " ")}</TableCell>
                <TableCell>{formatDate(batch.created_at)}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="outline" onClick={() => onOpen(action.path)}>
                    {action.label}
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export default function Dashboard({ email, onSignOut, demoMode = false, isAdmin }: DashboardProps) {
  const navigate = useNavigate();
  const [tab, setTab] = useState(readTab);
  const [batches, setBatches] = useState<StickerBatch[]>([]);

  useEffect(() => {
    api.getBatches().then(setBatches).catch(() => setBatches([]));
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

          {(["export", "domestic"] as const).map((type) => (
            <TabsContent key={type} value={type} className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-lg font-medium">{type === "export" ? "Export" : "Domestic"} sticker batches</h3>
                <Button asChild>
                  <Link to={`/batches/new/${type}`}>New {type} batch</Link>
                </Button>
              </div>
              <BatchTable batches={batches.filter((batch) => batch.type === type)} onOpen={navigate} />
            </TabsContent>
          ))}
        </Tabs>
      </main>
      <Button className="fixed right-4 top-4" variant="outline" onClick={handleSignOut}>
        {demoMode ? "Exit demo" : "Sign Out"}
      </Button>
    </div>
  );
}
