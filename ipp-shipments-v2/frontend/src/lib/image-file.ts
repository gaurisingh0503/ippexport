const IMAGE_EXTENSIONS = /\.(jpe?g|png)$/i;

const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/jpg", "image/png"]);

/** Windows often leaves type empty for extensionless JPGs (e.g. "C-1"). */
export function isAcceptableImageFile(file: File): boolean {
  if (IMAGE_MIME_TYPES.has(file.type)) return true;
  if (IMAGE_EXTENSIONS.test(file.name)) return true;
  // Extensionless files Windows still labels as JPG — let the backend sniff bytes.
  return file.type === "" || file.type === "application/octet-stream";
}
