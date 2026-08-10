import asyncio

from supabase import Client, create_client

from app.config import settings

_client: Client | None = None


def _get_client() -> Client:
    global _client
    if _client is None:
        _client = create_client(settings.supabase_url, settings.supabase_service_role_key)
    return _client


def _bundle_image_path(shipment_id: str, bundle_id: str, extension: str) -> str:
    return f"bundles/{shipment_id}/{bundle_id}.{extension}"


async def upload_bundle_image(
    shipment_id: str,
    bundle_id: str,
    image_bytes: bytes,
    media_type: str,
) -> str:
    extension = "jpg" if media_type == "image/jpeg" else "png"
    path = _bundle_image_path(shipment_id, bundle_id, extension)

    def _upload() -> None:
        client = _get_client()
        client.storage.from_(settings.supabase_storage_bucket).upload(
            path,
            image_bytes,
            file_options={"content-type": media_type, "upsert": "true"},
        )

    await asyncio.to_thread(_upload)
    return path


async def delete_bundle_image(image_path: str) -> None:
    def _delete() -> None:
        client = _get_client()
        client.storage.from_(settings.supabase_storage_bucket).remove([image_path])

    await asyncio.to_thread(_delete)


async def signed_image_url(image_path: str | None, expires_in: int = 3600) -> str | None:
    if not image_path:
        return None

    def _sign() -> str:
        client = _get_client()
        result = client.storage.from_(settings.supabase_storage_bucket).create_signed_url(
            image_path,
            expires_in,
        )
        return result["signedURL"]

    return await asyncio.to_thread(_sign)
