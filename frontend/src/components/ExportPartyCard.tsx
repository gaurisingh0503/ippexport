import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

import type { ExportParty } from "@/lib/api";
import { cn } from "@/lib/utils";

export type ExportPartyKind = "consignee" | "notify";

export type DraggableExportParty = {
  id: string;
  kind: ExportPartyKind;
  party: ExportParty;
  defaults?: {
    portOfDischarge: string;
    paymentTerms: string;
    notifyParties: ExportParty[];
          materialName: string;
          coaSpecifications: Record<string, string>;
  };
};

type ExportPartyCardProps = {
  item: DraggableExportParty;
  disabled?: boolean;
};

export default function ExportPartyCard({ item, disabled = false }: ExportPartyCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    data: item,
    disabled,
  });

  return (
    <div
      ref={setNodeRef}
      {...(!disabled ? listeners : undefined)}
      {...(!disabled ? attributes : undefined)}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cn(
        "rounded-md border bg-card p-3 shadow-sm",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-50",
      )}
    >
      <p className="font-medium">{item.party.name}</p>
      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
        {item.party.lines.join(" · ")}
      </p>
    </div>
  );
}
