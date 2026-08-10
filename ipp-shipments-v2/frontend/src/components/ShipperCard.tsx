import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

import type { Shipper } from "@/lib/api";
import { cn } from "@/lib/utils";

type ShipperCardProps = {
  shipper: Shipper;
  disabled?: boolean;
};

export default function ShipperCard({ shipper, disabled = false }: ShipperCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `shipper-${shipper.id}`,
    data: { kind: "shipper", shipper },
    disabled,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    borderLeftColor: `#${shipper.brand_color}`,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(!disabled ? listeners : undefined)}
      {...(!disabled ? attributes : undefined)}
      className={cn(
        "rounded-md border border-l-4 bg-card p-3 shadow-sm",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-50",
      )}
    >
      <p className="font-medium">{shipper.name}</p>
    </div>
  );
}
