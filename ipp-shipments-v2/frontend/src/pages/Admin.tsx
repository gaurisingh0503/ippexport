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
import { api, type Customer } from "@/lib/api";
import { consigneeDisplayName } from "@/lib/customer-form";
import { env } from "@/lib/env";
import { supabase } from "@/lib/supabase";

export default function Admin() {
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [approved, setApproved] = useState<Customer[]>([]);
  const [pending, setPending] = useState<Customer[]>([]);
  const [actingOn, setActingOn] = useState<string | null>(null);

  const isAdmin = email === env.adminEmail;

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

      <Tabs defaultValue="approved">
        <TabsList>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="pending">Pending Approvals</TabsTrigger>
        </TabsList>

        <TabsContent value="approved" className="mt-4">
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
        </TabsContent>

        <TabsContent value="pending" className="mt-4">
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
      </Tabs>
    </div>
  );
}
