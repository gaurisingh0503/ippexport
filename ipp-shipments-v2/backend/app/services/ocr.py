import asyncio
import base64
import json
import re

from anthropic import Anthropic
from pydantic import BaseModel

from app.config import settings

_EXTRACTION_PROMPT = """You are reading a photo of a metal ingot bundle tag or shipping label.

Extract exactly these fields and return JSON only with these keys:
- material_name (string or null)
- batch_no (string or null)
- bundle_no (string or null)
- ingot_count (integer or null)
- gross_weight (number in kg or null)
- net_weight (number in kg or null)

Rules:
- If a field cannot be clearly read from the image, use null for that field.
- Never guess or infer values that are not visible.
- Return only valid JSON. No markdown fences or extra text."""


class BundleExtraction(BaseModel):
    material_name: str | None = None
    batch_no: str | None = None
    bundle_no: str | None = None
    ingot_count: int | None = None
    gross_weight: float | None = None
    net_weight: float | None = None


def _parse_json_response(raw: str) -> dict:
    text = raw.strip()
    fence_match = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if fence_match:
        text = fence_match.group(1).strip()
    return json.loads(text)


async def extract_bundle_data(image_bytes: bytes, media_type: str) -> dict:
    client = Anthropic(api_key=settings.anthropic_api_key)

    def _call() -> str:
        message = client.messages.create(
            model=settings.claude_model,
            max_tokens=1024,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": media_type,
                                "data": base64.standard_b64encode(image_bytes).decode(),
                            },
                        },
                        {"type": "text", "text": _EXTRACTION_PROMPT},
                    ],
                }
            ],
        )
        block = message.content[0]
        if block.type != "text":
            raise ValueError("Unexpected response type from Claude")
        return block.text

    raw = await asyncio.to_thread(_call)
    parsed = _parse_json_response(raw)
    validated = BundleExtraction.model_validate(parsed)
    return validated.model_dump()
