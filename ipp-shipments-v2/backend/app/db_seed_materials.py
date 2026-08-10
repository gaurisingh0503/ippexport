import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import asyncio

from sqlalchemy import select

from app.db import AsyncSessionLocal
from app.models.material import Material

MATERIALS = [
    {
        "material_name": "Pure Lead Ingots",
        "hs_code": "7801.10.00",
        "sticker_display_name": "Pure Lead Ingots 99.99%",
        "goods_description": "Pure Lead 99.98% Minimum",
    },
    {
        "material_name": "Tin Master Alloy",
        "hs_code": "7801.99.00",
        "sticker_display_name": "Tin Master Alloy",
        "goods_description": "",
    },
    {
        "material_name": "High Sb Lead Ingot",
        "hs_code": "7801.91.00",
        "sticker_display_name": "High Sb Lead Ingot",
        "goods_description": "",
    },
    {
        "material_name": "Remelted Lead Block",
        "hs_code": "7801.91.00",
        "sticker_display_name": "Remelted Lead Block",
        "goods_description": "",
    },
]


async def seed() -> None:
    async with AsyncSessionLocal() as session:
        for data in MATERIALS:
            exists = await session.scalar(
                select(Material.id).where(Material.material_name == data["material_name"])
            )
            if exists:
                print(f"Material '{data['material_name']}' already exists — skipping")
                continue
            payload = {**data}
            if payload["goods_description"] == "":
                payload["goods_description"] = None
            session.add(Material(**payload))
            print(f"Seeded material '{data['material_name']}'")

        await session.commit()


if __name__ == "__main__":
    asyncio.run(seed())
