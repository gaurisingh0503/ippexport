import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";

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
import { api, type Customer, type ExportDocument } from "@/lib/api";
import { consigneeDisplayName } from "@/lib/customer-form";
import { isDemoMode } from "@/lib/demo-api";
import { env } from "@/lib/env";
import { supabase } from "@/lib/supabase";

export default function Admin() {
  const demoMode = isDemoMode();
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [approved, setApproved] = useState<Customer[]>([]);
  const [pending, setPending] = useState<Customer[]>([]);
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [pendingDocuments, setPendingDocuments] = useState<ExportDocument[]>([]);

  const isAdmin = demoMode || email?.toLowerCase() === env.adminEmail.toLowerCase();

  async function loadApproved() {
    setApproved(await api.getCustomers());
  }

  async function loadPending() {
    setPending(await api.getCustomers("pending"));
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setEmail(session?.user.email ?? null);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    loadApproved();
    loadPending();
    api.getExportDocuments("pending_approval").then(setPendingDocuments);
  }, [isAdmin]);

  async function handleApprove(id: string) {
    setActingOn(id);
    try {
      await api.approveCustomer(id);
      await Promise.all([loadApproved(), loadPending()]);
    } finally {
      setActingOn(null);
    }
  }

  async function handleReject(id: string) {
    setActingOn(id);
    try {
      await api.rejectCustomer(id);
      await loadPending();
    } finally {
      setActingOn(null);
    }
  }

  async function handleDocumentApprove(id: string) {
    setActingOn(id);
    try {
      await api.approveExportDocument(id);
      setPendingDocuments(await api.getExportDocuments("pending_approval"));
    } finally {
      setActingOn(null);
    }
  }

  async function handleDocumentReject(id: string) {
    const comment = window.prompt("Reason for rejection:");
    if (!comment?.trim()) return;
    setActingOn(id);
    try {
      await api.rejectExportDocument(id, comment.trim());
      setPendingDocuments(await api.getExportDocuments("pending_approval"));
    } finally {
      setActingOn(null);
    }
  }

  async function downloadDocument(id: string, kind: "invoice-packing" | "coa") {
    const file = kind === "invoice-packing"
      ? await api.downloadInvoicePacking(id)
      : await api.downloadCoa(id);
    const url = URL.createObjectURL(file.blob);
    const anchor = window.document.createElement("a");
    anchor.href = url;
    anchor.download = file.filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="mx-auto min-h-screen max-w-5xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Admin</h1>
        <Button asChild variant="outline">
          <Link to="/">Dashboard</Link>
        </Button>
      </div>

      <Tabs defaultValue="customers" className="grid gap-6 md:grid-cols-[180px_1fr]">
        <TabsList className="h-fit flex-col items-stretch">
          <TabsTrigger value="customers">Customer approvals</TabsTrigger>
          <TabsTrigger value="documents">Document approvals</TabsTrigger>
        </TabsList>

        <TabsContent value="customers" className="mt-0 space-y-6">
          <h2 className="font-medium">Approved customers</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Port of discharge</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {approved.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell>{customer.name}</TableCell>
                  <TableCell>{customer.port_of_discharge ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <h2 className="font-medium">Pending customer approvals</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Port of discharge</TableHead>
                <TableHead>Consignee name</TableHead>
                <TableHead className="w-48" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pending.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell>{customer.name}</TableCell>
                  <TableCell>{customer.port_of_discharge ?? "—"}</TableCell>
                  <TableCell>{consigneeDisplayName(customer)}</TableCell>
                  <TableCell className="space-x-2">
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      disabled={actingOn === customer.id}
                      onClick={() => handleApprove(customer.id)}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={actingOn === customer.id}
                      onClick={() => handleReject(customer.id)}
                    >
                      Reject
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
        <TabsContent value="documents" className="mt-0">
          <Table>
            <TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Shipper</TableHead><TableHead>Created</TableHead><TableHead className="w-72" /></TableRow></TableHeader>
            <TableBody>{pendingDocuments.map((document) => (
              <TableRow key={document.id}>
                <TableCell>{document.invoice_no}</TableCell>
                <TableCell>{document.shipper.name}</TableCell>
                <TableCell>{new Date(document.created_at).toLocaleDateString()}</TableCell>
                <TableCell className="space-x-2">
                  <Button size="sm" variant="outline" onClick={() => void downloadDocument(document.id, "invoice-packing")}>Invoice / PL</Button>
                  <Button size="sm" variant="outline" onClick={() => void downloadDocument(document.id, "coa")}>COA</Button>
                  <Button size="sm" disabled={actingOn === document.id} onClick={() => handleDocumentApprove(document.id)}>Approve</Button>
                  <Button size="sm" variant="destructive" disabled={actingOn === document.id} onClick={() => handleDocumentReject(document.id)}>Reject</Button>
                </TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        </TabsContent>
      </Tabs>
    </div>
  );
}
