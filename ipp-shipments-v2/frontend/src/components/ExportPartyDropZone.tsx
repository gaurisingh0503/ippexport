import { useDroppable } from "@dnd-kit/core";

import type { ExportParty } from "@/lib/api";
import { cn } from "@/lib/utils";

type ExportPartyDropZoneProps = {
  id: string;
  label: string;
  party: ExportParty | null;
  onChange: (party: ExportParty) => void;
  onRemove: () => void;
};

export default function ExportPartyDropZone({
  id,
  label,
  party,
  onChange,
  onRemove,
}: ExportPartyDropZoneProps) {
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
        {party ? (
          <div className="rounded-md border bg-card p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <input
                  aria-label={`${label} name`}
                  value={party.name}
                  onChange={(event) => onChange({ ...party, name: event.target.value })}
                  className="w-full bg-transparent font-medium outline-none"
                />
                <textarea
                  aria-label={`${label} details`}
                  value={party.lines.join("\n")}
                  onChange={(event) =>
                    onChange({
                      ...party,
                      lines: event.target.value.split("\n").filter((line) => line.trim()),
                    })
                  }
                  className="mt-1 min-h-16 w-full resize-y bg-transparent text-xs text-muted-foreground outline-none"
                />
              </div>
              <button
                type="button"
                aria-label={`Remove ${label}`}
                className="text-muted-foreground hover:text-foreground"
                onClick={onRemove}
              >
                ✕
              </button>
            </div>
          </div>
        ) : (
          <div className="flex min-h-16 items-center justify-center text-sm text-muted-foreground">
            Drop here
          </div>
        )}
      </div>
    </div>
  );
}
