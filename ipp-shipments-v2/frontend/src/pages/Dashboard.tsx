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
import { env } from "@/lib/env";
import { api, type Shipment } from "@/lib/api";
import { signOut } from "@/lib/supabase";

type DashboardProps = {
  email: string;
  onSignOut: () => void;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function Dashboard({ email, onSignOut }: DashboardProps) {
  const navigate = useNavigate();
  const isAdmin = email === env.adminEmail;
  const [shipments, setShipments] = useState<Shipment[]>([]);

  useEffect(() => {
    api.getShipments().then(setShipments).catch(() => setShipments([]));
  }, []);

  async function handleSignOut() {
    await signOut();
    onSignOut();
  }

  const recent = shipments.slice(0, 5);

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 p-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">IPP Shipments</h1>
        <p className="mt-1 text-muted-foreground">Welcome, {email}</p>
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link to="/shipments/new">New Shipment</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link to="/submit-customer">Submit Customer</Link>
        </Button>
        {isAdmin && (
          <Button asChild variant="secondary">
            <Link to="/admin">Admin</Link>
          </Button>
        )}
        <Button variant="outline" onClick={handleSignOut}>
          Sign Out
        </Button>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-medium">Recent Shipments</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">No shipments yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Shipper</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recent.map((shipment) => (
                <TableRow
                  key={shipment.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/shipments/${shipment.id}/ocr`)}
                >
                  <TableCell className="capitalize">{shipment.type}</TableCell>
                  <TableCell>{shipment.shipper.name}</TableCell>
                  <TableCell className="capitalize">{shipment.status}</TableCell>
                  <TableCell>{formatDate(shipment.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
