import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.storage import upload_storage_object

_TEMPLATES = {
    "templates/invoice_packing_template.xlsx": Path(
        r"c:\IPP_Shipments\Templates\invoice_packing_template.xlsx"
    ),
    "templates/coa_template.xlsx": Path(r"c:\IPP_Shipments\Templates\coa_template.xlsx"),
}


async def main() -> None:
    for key, path in _TEMPLATES.items():
        await upload_storage_object(
            key,
            path.read_bytes(),
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        print(f"Uploaded {path.name} to {key}")


if __name__ == "__main__":
    asyncio.run(main())
