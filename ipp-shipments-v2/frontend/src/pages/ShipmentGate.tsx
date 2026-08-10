import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ShipmentGate() {
  return (
    <div className="mx-auto min-h-screen max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">New Shipment</h1>
        <Button asChild variant="outline">
          <Link to="/">Dashboard</Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="transition-shadow hover:shadow-md">
          <CardHeader>
            <CardTitle>Domestic Shipment</CardTitle>
            <CardDescription>Generates stickers only</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link to="/shipments/new/domestic">Start domestic</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="transition-shadow hover:shadow-md">
          <CardHeader>
            <CardTitle>Export Shipment</CardTitle>
            <CardDescription>Generates stickers + Invoice + Packing List + COA</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link to="/shipments/new/export">Start export</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
