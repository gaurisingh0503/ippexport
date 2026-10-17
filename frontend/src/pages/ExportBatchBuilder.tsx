import BatchBuilder from "@/components/BatchBuilder";

export default function ExportBatchBuilder() {
  return (
    <BatchBuilder
      type="export"
      title="New Export Batch"
      subtitle="Stickers will be grouped into an invoice later"
    />
  );
}
