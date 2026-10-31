import BatchBuilder from "@/components/BatchBuilder";

export default function ExportBatchBuilder() {
  return (
    <BatchBuilder
      type="export"
      title="New Export Batch"
      subtitle="Drag in the shipper and pick the material to start a batch of export stickers."
    />
  );
}
