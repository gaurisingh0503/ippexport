import httpx

from app.config import settings

_bucket_ready = False


def _storage_base() -> str:
    return f"{settings.supabase_url.rstrip('/')}/storage/v1"


def _storage_headers() -> dict[str, str]:
    key = settings.supabase_service_role_key
    return {
        "apikey": key,
        "Authorization": f"Bearer {key}",
    }


def _bundle_image_path(batch_id: str, bundle_id: str, extension: str) -> str:
    return f"bundles/{batch_id}/{bundle_id}.{extension}"


async def _ensure_bucket_exists() -> None:
    global _bucket_ready
    if _bucket_ready:
        return

    bucket = settings.supabase_storage_bucket
    headers = {**_storage_headers(), "Content-Type": "application/json"}

    async with httpx.AsyncClient(timeout=60.0) as client:
        res = await client.get(f"{_storage_base()}/bucket/{bucket}", headers=headers)
        if res.status_code == 200:
            _bucket_ready = True
            return

        create = await client.post(
            f"{_storage_base()}/bucket",
            headers=headers,
            json={"id": bucket, "name": bucket, "public": False},
        )
        if create.status_code not in (200, 201, 409):
            create.raise_for_status()

    _bucket_ready = True


async def upload_bundle_image(
    batch_id: str,
    bundle_id: str,
    image_bytes: bytes,
    media_type: str,
) -> str:
    await _ensure_bucket_exists()

    extension = "jpg" if media_type == "image/jpeg" else "png"
    path = _bundle_image_path(batch_id, bundle_id, extension)
    bucket = settings.supabase_storage_bucket

    async with httpx.AsyncClient(timeout=60.0) as client:
        res = await client.post(
            f"{_storage_base()}/object/{bucket}/{path}",
            headers={
                **_storage_headers(),
                "Content-Type": media_type,
                "x-upsert": "true",
            },
            content=image_bytes,
        )
        res.raise_for_status()

    return path


async def upload_storage_object(path: str, data: bytes, content_type: str) -> None:
    await _ensure_bucket_exists()

    async with httpx.AsyncClient(timeout=60.0) as client:
        res = await client.post(
            f"{_storage_base()}/object/{settings.supabase_storage_bucket}/{path}",
            headers={
                **_storage_headers(),
                "Content-Type": content_type,
                "x-upsert": "true",
            },
            content=data,
        )
        res.raise_for_status()


async def download_storage_object(path: str) -> bytes:
    async with httpx.AsyncClient(timeout=60.0) as client:
        res = await client.get(
            f"{_storage_base()}/object/{settings.supabase_storage_bucket}/{path}",
            headers=_storage_headers(),
        )
        res.raise_for_status()
        return res.content


async def delete_bundle_image(image_path: str) -> None:
    bucket = settings.supabase_storage_bucket

    async with httpx.AsyncClient(timeout=60.0) as client:
        res = await client.request(
            "DELETE",
            f"{_storage_base()}/object/{bucket}",
            headers={
                **_storage_headers(),
                "Content-Type": "application/json",
            },
            json={"prefixes": [image_path]},
        )
        if res.status_code not in (200, 204):
            res.raise_for_status()


async def signed_image_url(image_path: str | None, expires_in: int = 3600) -> str | None:
    if not image_path:
        return None

    bucket = settings.supabase_storage_bucket

    async with httpx.AsyncClient(timeout=60.0) as client:
        res = await client.post(
            f"{_storage_base()}/object/sign/{bucket}/{image_path}",
            headers={
                **_storage_headers(),
                "Content-Type": "application/json",
            },
            json={"expiresIn": expires_in},
        )
        res.raise_for_status()
        signed_path = res.json()["signedURL"]

    if signed_path.startswith("http"):
        return signed_path

    return f"{settings.supabase_url.rstrip('/')}/storage/v1{signed_path}"
