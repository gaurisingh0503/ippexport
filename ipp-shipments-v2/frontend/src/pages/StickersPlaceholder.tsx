import { Link, useParams } from "react-router-dom";

import { Button } from "@/components/ui/button";

export default function StickersPlaceholder() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
      <h1 className="text-2xl font-semibold">Sticker generation coming in Phase 5</h1>
      <p className="text-muted-foreground">Shipment ID: {id}</p>
      <Button asChild variant="outline">
        <Link to="/">Back to Dashboard</Link>
      </Button>
    </div>
  );
}
