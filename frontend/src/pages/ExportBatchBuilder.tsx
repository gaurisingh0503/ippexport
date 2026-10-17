import BatchBuilder from "@/components/BatchBuilder";

export default function ExportBatchBuilder() {
  return (
    <BatchBuilder
      type="export"
      title="New Export Batch"
      subtitle="Stickers for this shipment. The shipper is fixed by the packing list."
    />
  );
}
