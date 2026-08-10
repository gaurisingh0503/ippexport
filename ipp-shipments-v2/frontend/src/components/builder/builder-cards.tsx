import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

import type { Customer, Shipper } from "@/lib/api";
import { cn } from "@/lib/utils";

type DraggableShipperCardProps = {
  shipper: Shipper;
  disabled?: boolean;
};

export function DraggableShipperCard({ shipper, disabled = false }: DraggableShipperCardProps) {
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
      {...listeners}
      {...attributes}
      className={cn(
        "cursor-grab rounded-md border border-l-4 bg-card p-3 shadow-sm active:cursor-grabbing",
        (disabled || isDragging) && "opacity-50",
        disabled && "cursor-not-allowed",
      )}
    >
      <p className="font-medium">{shipper.name}</p>
    </div>
  );
}

type DraggableCustomerCardProps = {
  customer: Customer;
  disabled?: boolean;
};

export function DraggableCustomerCard({ customer, disabled = false }: DraggableCustomerCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `customer-${customer.id}`,
    data: { kind: "customer", customer },
    disabled,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "cursor-grab rounded-md border bg-card p-3 shadow-sm active:cursor-grabbing",
        (disabled || isDragging) && "opacity-50",
        disabled && "cursor-not-allowed",
      )}
    >
      <p className="font-medium">{customer.name}</p>
      {customer.port_of_discharge && (
        <p className="text-sm text-muted-foreground">{customer.port_of_discharge}</p>
      )}
    </div>
  );
}

type PlacedCardProps = {
  title: string;
  subtitle?: string;
  borderColor?: string;
  onRemove: () => void;
};

export function PlacedCard({ title, subtitle, borderColor, onRemove }: PlacedCardProps) {
  return (
    <div
      className="rounded-md border bg-card p-3 shadow-sm"
      style={borderColor ? { borderLeftWidth: 4, borderLeftColor: borderColor } : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium">{title}</p>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
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
  );
}

type DropZoneProps = {
  id: string;
  label: string;
  placeholder: string;
  children?: React.ReactNode;
};

export function DropZone({ id, label, placeholder, children }: DropZoneProps) {
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
        {children ?? <p className="text-sm text-muted-foreground">{placeholder}</p>}
      </div>
    </div>
  );
}
