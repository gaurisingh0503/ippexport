import asyncio
import io
from types import SimpleNamespace

import pytest
from openpyxl import Workbook, load_workbook

from app.api.batches import _names_gs_yuasa, _normalize_ocr_result
from app.services import excel


def _template_bytes(sheets: int = 2) -> bytes:
    """Two stickers per row, 16 rows tall, three rows per sheet: the layout of the real templates."""
    workbook = Workbook()
    workbook.remove(workbook.active)
    for index in range(sheets):
        ws = workbook.create_sheet(f"Sheet{index + 1}")
        for top in (1, 17, 33):
            for column in (1, 6):
                ws.cell(top + 5, column, "Material Name :")
                ws.cell(top + 7, column, "Batch No.:")
                ws.cell(top + 9, column, "Bundle No.:")
                ws.cell(top + 11, column, "Number of Ingots:")
                ws.cell(top + 13, column, "Gross Weight:")
                ws.cell(top + 15, column, "Net Weight:")
                ws.merge_cells(start_row=top + 13, start_column=column, end_row=top + 13, end_column=column + 1)
    output = io.BytesIO()
    workbook.save(output)
    return output.getvalue()


def _bundle(number: int, batch_no: str = "073", gross: float = 1054.0, net: float = 1053.81):
    return SimpleNamespace(
        id=number,
        material=SimpleNamespace(sticker_display_name="Pure Lead Ingots 99.99%"),
        batch_no=batch_no,
        bundle_no=str(number),
        ingot_count=36,
        gross_weight=gross,
        net_weight=net,
    )


def _generate(monkeypatch, sticker_format: str, bundles: list):
    async def fake_download(_key: str) -> bytes:
        return _template_bytes()

    monkeypatch.setattr(excel, "download_storage_object", fake_download)
    batch = SimpleNamespace(type="domestic", shipper=SimpleNamespace(slug="ipp"), sticker_format=sticker_format)
    return load_workbook(io.BytesIO(asyncio.run(excel.generate_stickers(batch, bundles))))


@pytest.mark.parametrize("count", [1, 6, 26, 40])
def test_every_sticker_is_on_one_tab(monkeypatch, count):
    workbook = _generate(monkeypatch, "standard", [_bundle(n) for n in range(1, count + 1)])

    assert workbook.sheetnames == ["Stickers"]
    ws = workbook.active
    bundle_numbers = [ws[targets["bundle_no"]].value for targets in excel._slot_targets(ws)]
    assert [number for number in bundle_numbers if number] == [str(n) for n in range(1, count + 1)]


def test_page_breaks_never_split_a_sticker(monkeypatch):
    workbook = _generate(monkeypatch, "standard", [_bundle(n) for n in range(1, 27)])

    breaks = [b.id for b in workbook.active.row_breaks.brk]
    assert breaks and all(row % 16 == 0 for row in breaks)


def test_standard_format_has_no_packing_row(monkeypatch):
    workbook = _generate(monkeypatch, "standard", [_bundle(1)])

    assert not excel._label_cells(workbook.active, "packing item weight")


def test_gs_yuasa_format_prints_packing_weight_between_gross_and_net(monkeypatch):
    ws = _generate(monkeypatch, "gs_yuasa", [_bundle(18, batch_no="154", gross=1105.0, net=1104.81)]).active

    assert ws["A15"].value == "Packing item weight"
    assert ws["D14"].value == 1105.0
    assert ws["D15"].value == pytest.approx(0.19)
    assert ws["D16"].value == 1104.81


def test_numeric_lot_numbers_and_written_ingot_counts_survive_ocr_cleanup():
    result = _normalize_ocr_result(
        {
            "customer_name": "GS Yuasa",
            "bundles": [
                {"batch_no": "073", "bundle_no": "68", "ingot_count": "36 Ingots", "gross_weight": "1,054.0", "net_weight": 1053.81},
                {"batch_no": "R2-75", "bundle_no": "88", "ingot_count": 36, "gross_weight": 1100, "net_weight": 1100},
                {"batch_no": "GS Yuasa", "bundle_no": "89", "ingot_count": None, "gross_weight": None, "net_weight": None},
            ],
        }
    )

    first, second, third = result["bundles"]
    assert (first["batch_no"], first["ingot_count"], first["gross_weight"]) == ("073", 36, 1054.0)
    assert second["batch_no"] == "R2-75"
    assert third["batch_no"] is None


@pytest.mark.parametrize(
    ("customer", "material", "expected"),
    [("GS Yuasa", None, True), (None, "Pure Lead Ingots 99.97% GS YUASA", True), ("Other Co", "Pure Lead Ingots", False)],
)
def test_gs_yuasa_is_detected_from_the_register_heading(customer, material, expected):
    assert _names_gs_yuasa(customer, material) is expected
