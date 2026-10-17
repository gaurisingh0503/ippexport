import asyncio
import base64
import json
import re

from anthropic import AsyncAnthropic

from app.config import settings

_EXTRACTION_PROMPT = """This image is a bundle register. Extract it and return ONLY a JSON object using this exact structure:
{
  "container_no": null,
  "material_name": null,
  "bundles": [
    {
      "batch_no": null,
      "bundle_no": null,
      "ingot_count": null,
      "gross_weight": null,
      "net_weight": null
    }
  ]
}
Container No. and Material Name are shared page-level values. Copy container_no and batch_no character-for-character, including hyphens. If either is uncertain, return null instead of guessing.
material_name must contain only the product name, never a seal number or container text. Do not infer a metal grade from appearance; return null if the material name is not clearly readable.
Each handwritten table row is one bundle and must create exactly one object in bundles — one row equals one sticker.
Do not include the serial-number column or totals row as a bundle.
The handwritten table column named "LotNo" or "Lot No." is the only source for batch_no because the sticker template labels this field "Batch No.".
Copy its value exactly, including hyphens: for example, a table value R2-64 must return batch_no "R2-64". Never use company names, material names, or unrelated handwritten words as batch_no.
Carry shared values or ditto marks down to every applicable bundle row. For example, if "30 Ingots" is written once and the rows below use ditto marks, set ingot_count to 30 on every relevant row.
If the register has only one "Weight" column, use that same value for both gross_weight and net_weight.
For numeric fields return a number, not a string.
If a field is not clearly readable return null — never guess.
Return only the JSON object, no explanation."""

_COA_ACTUALS_PROMPT = """This image is a lab analysis report for a lead Certificate of Analysis.
Extract only the actual percentage results for these element symbols: Sn, Sb, Bi, Cu, As, Ag, Cd, Zn, Co, Te, Fe, Ni, Pb.
Return ONLY a JSON object with those exact symbol keys. Each value must be a number, not a string.
Use null for an unreadable or absent result. Never guess. Do not return specification limits or any explanation."""


def _parse_json_response(raw: str) -> dict:
    text = raw.strip()
    fence_match = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if fence_match:
        text = fence_match.group(1).strip()
    return json.loads(text)


async def extract_bundle_data(image_bytes: bytes, media_type: str) -> dict:
    client = AsyncAnthropic(api_key=settings.anthropic_api_key)

    message = await client.messages.create(
        model=settings.claude_model,
        max_tokens=4096,
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

    return _parse_json_response(block.text)


async def extract_coa_actuals(image_bytes: bytes, media_type: str) -> dict[str, float | None]:
    client = AsyncAnthropic(api_key=settings.anthropic_api_key)
    message = await client.messages.create(
        model=settings.claude_model,
        max_tokens=1024,
        messages=[{"role": "user", "content": [
            {"type": "image", "source": {"type": "base64", "media_type": media_type,
             "data": base64.standard_b64encode(image_bytes).decode()}},
            {"type": "text", "text": _COA_ACTUALS_PROMPT},
        ]}],
    )
    block = message.content[0]
    if block.type != "text":
        raise ValueError("Unexpected response type from Claude")
    result = _parse_json_response(block.text)
    return {symbol: result.get(symbol) for symbol in ("Sn", "Sb", "Bi", "Cu", "As", "Ag", "Cd", "Zn", "Co", "Te", "Fe", "Ni", "Pb")}
