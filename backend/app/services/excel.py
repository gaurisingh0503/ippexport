import io
import re
from collections.abc import Iterable
from copy import copy

from openpyxl import load_workbook
from openpyxl.drawing.image import Image
from openpyxl.worksheet.pagebreak import Break, RowBreak
from openpyxl.worksheet.worksheet import Worksheet

from app.models.bundle import Bundle
from app.models.sticker_batch import StickerBatch
from app.services.storage import download_storage_object

STICKER_FORMAT_STANDARD = "standard"
STICKER_FORMAT_GS_YUASA = "gs_yuasa"
STICKER_FORMATS = (STICKER_FORMAT_STANDARD, STICKER_FORMAT_GS_YUASA)

_TEMPLATE_KEYS = {
    ("domestic", "ipp"): "templates/domestic_sticker_ipp.xlsx",
    ("domestic", "richsiri"): "templates/domestic_sticker_richsiri.xlsx",
    ("export", "ipp"): "templates/sticker_template.xlsx",
    ("export", "richsiri"): "templates/sticker_template.xlsx",
}

_FIELD_LABELS = {
    "material": "material name",
    "batch_no": "batch no",
    "bundle_no": "bundle no",
    "ingot_count": "number of ingots",
    "gross_weight": "gross weight",
    "net_weight": "net weight",
}

_PACKING_LABEL = "Packing item weight"
_A4_HEIGHT_PT = 842.0
_POINTS_PER_INCH = 72.0


def template_key_for_batch(batch: StickerBatch) -> str:
    key = (batch.type, batch.shipper.slug)
    try:
        return _TEMPLATE_KEYS[key]
    except KeyError as exc:
        raise ValueError(f"No sticker template for {batch.type} batch / {batch.shipper.slug}") from exc


def _normalize_label(value: object) -> str:
    if not isinstance(value, str):
        return ""
    return re.sub(r"[^a-z0-9]+", " ", value.lower()).strip()


def _label_cells(ws: Worksheet, label: str) -> list[tuple[int, int]]:
    return [
        (cell.row, cell.column)
        for row in ws.iter_rows()
        for cell in row
        if _normalize_label(cell.value) == label
    ]


def _group_end_column(ws: Worksheet, row: int, start_column: int) -> int:
    next_starts = [
        column
        for _, column in _label_cells(ws, _FIELD_LABELS["material"])
        if _ == row and column > start_column
    ]
    if next_starts:
        return next_starts[0] - 1

    column = start_column + 1
    while column <= ws.max_column and ws.cell(row, column).border.right.style is None:
        column += 1
    return column


def _slot_targets(ws: Worksheet) -> list[dict[str, str]]:
    material_cells = _label_cells(ws, _FIELD_LABELS["material"])
    packing_cells = _label_cells(ws, _normalize_label(_PACKING_LABEL))
    slots: list[dict[str, str]] = []

    for material_row, material_column in material_cells:
        group_end = _group_end_column(ws, material_row, material_column)
        target_columns = {
            "material": material_column + 2,
            "batch_no": group_end - 1,
            "bundle_no": group_end - 1,
            "ingot_count": group_end - 1,
            "gross_weight": group_end - 1,
            "net_weight": group_end - 1,
        }

        targets: dict[str, str] = {}
        for field, label in _FIELD_LABELS.items():
            candidates = [
                row
                for row, column in _label_cells(ws, label)
                if column == material_column and row >= material_row
            ]
            if candidates:
                targets[field] = ws.cell(min(candidates), target_columns[field]).coordinate

        if len(targets) == len(_FIELD_LABELS):
            packing_rows = [
                row for row, column in packing_cells if column == material_column and row >= material_row
            ]
            if packing_rows:
                targets["packing_weight"] = ws.cell(min(packing_rows), group_end - 1).coordinate
            slots.append(targets)

    return slots


def _image_from_bytes(data: bytes, source: Image, row_offset: int = 0) -> Image:
    buffer = io.BytesIO(data)
    image = Image(buffer)
    image.width = source.width
    image.height = source.height
    anchor = copy(source.anchor)
    anchor._from = copy(source.anchor._from)
    anchor._from.row += row_offset
    if getattr(anchor, "to", None) is not None:
        anchor.to = copy(source.anchor.to)
        anchor.to.row += row_offset
    image.anchor = anchor
    image._source_buffer = buffer
    return image


def _sticker_row_height(ws: Worksheet) -> int:
    """Number of worksheet rows one row of stickers takes, measured from the template's labels."""
    material_rows = sorted({row for row, _ in _label_cells(ws, _FIELD_LABELS["material"])})
    if not material_rows:
        raise ValueError("Sticker template has no sticker layout")
    return material_rows[1] - material_rows[0] if len(material_rows) > 1 else ws.max_row


def _add_packing_rows(ws: Worksheet, block_rows: int) -> None:
    """GS Yuasa format: use the blank row between Gross and Net for the packing item weight."""
    for gross_row, label_column in _label_cells(ws, _FIELD_LABELS["gross_weight"]):
        if gross_row > block_rows:
            continue
        net_rows = [
            row
            for row, column in _label_cells(ws, _FIELD_LABELS["net_weight"])
            if column == label_column and row > gross_row
        ]
        if not net_rows or min(net_rows) != gross_row + 2:
            raise ValueError("Sticker template has no free row for the packing item weight")
        packing_row = gross_row + 1
        material_row = max(
            row for row, column in _label_cells(ws, _FIELD_LABELS["material"]) if column == label_column
            and row <= gross_row
        )
        value_column = _group_end_column(ws, material_row, label_column) - 1

        label = ws.cell(packing_row, label_column)
        label.value = _PACKING_LABEL
        label._style = copy(ws.cell(gross_row, label_column)._style)
        ws.cell(packing_row, value_column)._style = copy(ws.cell(gross_row, value_column)._style)
        ws.merge_cells(
            start_row=packing_row,
            start_column=label_column,
            end_row=packing_row,
            end_column=value_column - 1,
        )
        ws.row_dimensions[packing_row].height = ws.row_dimensions[gross_row].height


def _rows_per_page(ws: Worksheet, block_rows: int) -> int:
    default_height = ws.sheet_format.defaultRowHeight or 15.0
    block_points = sum(ws.row_dimensions[row].height or default_height for row in range(1, block_rows + 1))
    scale = (ws.page_setup.scale or 100) / 100
    usable = _A4_HEIGHT_PT - (ws.page_margins.top + ws.page_margins.bottom) * _POINTS_PER_INCH
    return max(1, int(usable / (block_points * scale)))


def _build_sticker_sheet(
    ws: Worksheet, required: int, block_rows: int
) -> list[tuple[Worksheet, dict[str, str]]]:
    """Rebuild the sheet from its first row of stickers, so every sticker sits on this one tab."""
    prototype_cells = [
        (cell.row, cell.column, cell.value, copy(cell._style))
        for row in ws.iter_rows(min_row=1, max_row=block_rows)
        for cell in row
    ]
    prototype_merges = [
        (m.min_row, m.min_col, m.max_row, m.max_col) for m in ws.merged_cells.ranges if m.max_row <= block_rows
    ]
    prototype_heights = {row: ws.row_dimensions[row].height for row in range(1, block_rows + 1)}
    prototype_images = [
        (image._data(), image) for image in ws._images if image.anchor._from.row < block_rows
    ]

    per_row = max(1, len(_slot_targets_in_first_block(ws, block_rows)))
    sticker_rows = max(1, -(-required // per_row))
    per_page = _rows_per_page(ws, block_rows)

    for merged in list(ws.merged_cells.ranges):
        ws.merged_cells.remove(merged)
    ws._cells.clear()
    ws._images = []
    for row in list(ws.row_dimensions):
        del ws.row_dimensions[row]

    ws.row_breaks = RowBreak()
    for index in range(sticker_rows):
        offset = index * block_rows
        for row, column, value, style in prototype_cells:
            cell = ws.cell(row + offset, column, value)
            cell._style = copy(style)
        for min_row, min_col, max_row, max_col in prototype_merges:
            ws.merge_cells(
                start_row=min_row + offset,
                start_column=min_col,
                end_row=max_row + offset,
                end_column=max_col,
            )
        for row, height in prototype_heights.items():
            ws.row_dimensions[row + offset].height = height
        for data, image in prototype_images:
            ws.add_image(_image_from_bytes(data, image, offset))
        if index and index % per_page == 0:
            ws.row_breaks.append(Break(id=offset))

    return [(ws, target) for target in _slot_targets(ws)]


def _slot_targets_in_first_block(ws: Worksheet, block_rows: int) -> list[tuple[int, int]]:
    return [cell for cell in _label_cells(ws, _FIELD_LABELS["material"]) if cell[0] <= block_rows]


def _write_bundle(slot: tuple[Worksheet, dict[str, str]], bundle: Bundle) -> None:
    worksheet, targets = slot
    material = bundle.material
    if material is None:
        raise ValueError(f"Bundle {bundle.id} has no material")

    values: dict[str, object] = {
        "material": material.sticker_display_name,
        "batch_no": bundle.batch_no,
        "bundle_no": bundle.bundle_no,
        "ingot_count": bundle.ingot_count,
        "gross_weight": bundle.gross_weight,
        "net_weight": bundle.net_weight,
    }
    if "packing_weight" in targets:
        values["packing_weight"] = round(bundle.gross_weight - bundle.net_weight, 2)
    for field, target in targets.items():
        worksheet[target] = values[field]
        if field == "bundle_no":
            alignment = copy(worksheet[target].alignment)
            alignment.horizontal = "right"
            worksheet[target].alignment = alignment


async def generate_stickers(batch: StickerBatch, bundles: Iterable[Bundle]) -> bytes:
    bundle_list = list(bundles)
    if not bundle_list:
        raise ValueError("Add at least one bundle before generating stickers")

    template = await download_storage_object(template_key_for_batch(batch))
    workbook = load_workbook(io.BytesIO(template))

    worksheet = next((ws for ws in workbook.worksheets if _slot_targets(ws)), None)
    if worksheet is None:
        raise ValueError("Sticker template has no sticker layout")
    for other in list(workbook.worksheets):
        if other is not worksheet:
            workbook.remove(other)
    worksheet.title = "Stickers"

    block_rows = _sticker_row_height(worksheet)
    if batch.sticker_format == STICKER_FORMAT_GS_YUASA:
        _add_packing_rows(worksheet, block_rows)
    slots = _build_sticker_sheet(worksheet, len(bundle_list), block_rows)

    for sheet, targets in slots:
        for target in targets.values():
            sheet[target] = None

    for slot, bundle in zip(slots[: len(bundle_list)], bundle_list, strict=True):
        _write_bundle(slot, bundle)

    output = io.BytesIO()
    workbook.save(output)
    return output.getvalue()
