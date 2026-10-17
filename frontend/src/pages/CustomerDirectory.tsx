import { useEffect, useState } from "react";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, type Customer } from "@/lib/api";

export default function CustomerDirectory() {
  const [customers, setCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    api.getCustomers().then(setCustomers);
  }, []);

  async function editCustomer(customer: Customer) {
    const materialName = window.prompt("Material name for export documents:", customer.material_name ?? "");
    if (materialName === null) return;
    const updated = await api.updateCustomer(customer.id, { material_name: materialName || null });
    setCustomers((items) => items.map((item) => item.id === updated.id ? updated : item));
  }

  return (
    <div className="mx-auto min-h-screen max-w-6xl p-6">
      <h1 className="text-2xl font-semibold">Customer database</h1>
      <p className="mt-1 text-sm text-muted-foreground">Approved customers and their usual export details.</p>
      <div className="mt-6 overflow-x-auto rounded-md border">
        <Table>
          <TableHeader><TableRow><TableHead>Customer</TableHead><TableHead>Consignee</TableHead><TableHead>Port</TableHead><TableHead>Payment terms</TableHead><TableHead>COA specifications</TableHead><TableHead /></TableRow></TableHeader>
          <TableBody>{customers.map((customer) => (
            <TableRow key={customer.id}>
              <TableCell className="font-medium">{customer.name}</TableCell>
              <TableCell>{customer.consignee_l1 ?? "—"}</TableCell>
              <TableCell>{customer.port_of_discharge ?? "—"}</TableCell>
              <TableCell>{customer.payment_terms ?? "—"}</TableCell>
              <TableCell>{customer.coa_specifications ? "Saved" : "Default template"}</TableCell>
              <TableCell><button className="text-sm underline" onClick={() => void editCustomer(customer)}>Edit</button></TableCell>
            </TableRow>
          ))}</TableBody>
        </Table>
      </div>
    </div>
  );
}
