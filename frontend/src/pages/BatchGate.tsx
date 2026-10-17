import { Link } from "react-router-dom";
import { Globe, Package } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function BatchGate() {
  return (
    <div className="mx-auto flex min-h-screen max-w-4xl flex-col justify-center gap-8 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">New Batch</h1>
        <Button asChild variant="outline">
          <Link to="/">Dashboard</Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Link to="/batches/new/domestic" className="group block">
          <Card className="h-full transition-shadow hover:shadow-lg">
            <CardHeader>
              <Package className="mb-2 h-10 w-10 text-primary" />
              <CardTitle>Domestic Batch</CardTitle>
              <CardDescription>Generates stickers only</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground group-hover:text-foreground">
                Start domestic →
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/batches/new/export" className="group block">
          <Card className="h-full transition-shadow hover:shadow-lg">
            <CardHeader>
              <Globe className="mb-2 h-10 w-10 text-primary" />
              <CardTitle>Export Batch</CardTitle>
              <CardDescription>Stickers — grouped later into invoice</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground group-hover:text-foreground">
                Start export →
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
