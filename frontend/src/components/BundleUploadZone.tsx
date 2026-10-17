import { useRef, useState } from "react";
import { Loader2 } from "lucide-react";

import { isAcceptableImageFile } from "@/lib/image-file";
import { cn } from "@/lib/utils";

type BundleUploadZoneProps = {
  onUpload: (file: File) => Promise<void>;
  loading: boolean;
};

export default function BundleUploadZone({ onUpload, loading }: BundleUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | File[]) {
    const list = Array.from(files);
    const images = list.filter(isAcceptableImageFile);
    if (images.length === 0) {
      setError("Only JPG and PNG images are supported.");
      return;
    }
    setError(null);
    for (const file of images) {
      await onUpload(file);
    }
  }

  return (
    <div className="space-y-2">
      <div
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-10 transition-colors",
          dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/30",
          loading && "pointer-events-none opacity-70",
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (!loading && e.dataTransfer.files.length > 0) {
            void handleFiles(e.dataTransfer.files);
          }
        }}
        onClick={() => !loading && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !loading) inputRef.current?.click();
        }}
      >
        {loading ? (
          <>
            <Loader2 className="mb-2 h-8 w-8 animate-spin text-muted-foreground" />
            <p className="font-medium">Uploading + extracting…</p>
          </>
        ) : (
          <>
            <p className="font-medium">Drop bundle photos here</p>
            <p className="text-sm text-muted-foreground">or click to browse (JPG, PNG)</p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) void handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
