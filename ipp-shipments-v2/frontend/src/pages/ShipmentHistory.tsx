import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, type ExportDocument } from "@/lib/api";

export default function ShipmentHistory() {
  const [documents, setDocuments] = useState<ExportDocument[]>([]);

  useEffect(() => {
    api.getExportDocuments().then(setDocuments);
  }, []);

  return (
    <div className="mx-auto min-h-screen max-w-6xl p-6">
      <h1 className="text-2xl font-semibold">Shipment history</h1>
      <p className="mt-1 text-sm text-muted-foreground">Audit record of export documents and approval status.</p>
      <div className="mt-6 overflow-x-auto rounded-md border">
        <Table>
          <TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Customer</TableHead><TableHead>Date</TableHead><TableHead>Shipper</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader>
          <TableBody>{documents.map((document) => (
            <TableRow key={document.id}>
              <TableCell className="font-medium">{document.invoice_no}</TableCell>
              <TableCell>{document.consignee.name}</TableCell>
              <TableCell>{document.invoice_date}</TableCell>
              <TableCell>{document.shipper.name}</TableCell>
              <TableCell className="capitalize">{document.status.replace("_", " ")}</TableCell>
              <TableCell><Button asChild size="sm" variant="outline"><Link to={`/export-documents/${document.id}`}>Open</Link></Button></TableCell>
            </TableRow>
          ))}</TableBody>
        </Table>
      </div>
    </div>
  );
}
