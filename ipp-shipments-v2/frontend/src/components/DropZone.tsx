import { useDroppable } from "@dnd-kit/core";

import { cn } from "@/lib/utils";

export type DroppedShipper = {
  id: string;
  name: string;
  brand_color: string;
};

type DropZoneProps = {
  id: string;
  label: string;
  accepts: "shipper" | "customer";
  item: DroppedShipper | null;
  onRemove: () => void;
};

export default function DropZone({ id, label, item, onRemove }: DropZoneProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      <div
        ref={setNodeRef}
        className={cn(
          "min-h-24 rounded-md border-2 border-dashed p-3 transition-colors",
          isOver ? "border-primary bg-primary/5" : "border-muted-foreground/30",
        )}
      >
        {item ? (
          <div
            className="rounded-md border border-l-4 bg-card p-3 shadow-sm"
            style={{ borderLeftColor: `#${item.brand_color}` }}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium">{item.name}</p>
              <button
                type="button"
                onClick={onRemove}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Remove"
              >
                ✕
              </button>
            </div>
          </div>
        ) : (
          <p className="flex min-h-16 items-center justify-center text-sm text-muted-foreground">
            Drop here
          </p>
        )}
      </div>
    </div>
  );
}
