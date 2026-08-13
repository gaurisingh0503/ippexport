import io

from PIL import Image

MAX_OCR_BYTES = 4_800_000
MAX_OCR_EDGE = 2000


def detect_image_media_type(data: bytes) -> str | None:
    if len(data) >= 3 and data[:3] == b"\xff\xd8\xff":
        return "image/jpeg"
    if len(data) >= 8 and data[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"
    return None


def _save_jpeg(img: Image.Image, quality: int) -> bytes:
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=quality, optimize=True)
    return buf.getvalue()


def prepare_bundle_image(data: bytes) -> tuple[bytes, str]:
    try:
        img = Image.open(io.BytesIO(data))
        img.load()
    except Exception as exc:
        raise ValueError("Only JPG and PNG images are supported") from exc

    if img.mode not in ("RGB", "L"):
        img = img.convert("RGB")
    elif img.mode == "L":
        img = img.convert("RGB")

    width, height = img.size
    longest = max(width, height)
    if longest > MAX_OCR_EDGE:
        scale = MAX_OCR_EDGE / longest
        img = img.resize(
            (max(1, int(width * scale)), max(1, int(height * scale))),
            Image.Resampling.LANCZOS,
        )

    for quality in (85, 75, 65, 55):
        prepared = _save_jpeg(img, quality)
        if len(prepared) <= MAX_OCR_BYTES:
            return prepared, "image/jpeg"

    raise ValueError("Image is too large to process — try a smaller photo")
