import ShipperBuilder from "@/components/ShipperBuilder";

// Customer and notify party DnD is added in Phase 6 after stickers are confirmed.
export default function ExportBuilder() {
  return <ShipperBuilder type="export" title="Export Shipment" />;
}
