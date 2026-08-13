import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.storage import upload_storage_object

_TEMPLATES = {
    "templates/domestic_sticker_ipp.xlsx": Path(
        r"c:\IPP_Shipments\Templates\domestic_sticker_ipp.xlsx"
    ),
    "templates/domestic_sticker_richsiri.xlsx": Path(
        r"c:\IPP_Shipments\Templates\domestic_sticker_richsiri.xlsx"
    ),
    "templates/sticker_template.xlsx": Path(r"c:\IPP_Shipments\Templates\sticker_template.xlsx"),
}


async def main() -> None:
    for key, path in _TEMPLATES.items():
        if not path.is_file():
            raise FileNotFoundError(f"Missing template: {path}")
        await upload_storage_object(
            key,
            path.read_bytes(),
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        print(f"Uploaded {path.name} to {key}")


if __name__ == "__main__":
    asyncio.run(main())
