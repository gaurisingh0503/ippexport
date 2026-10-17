import base64
import logging
import uuid
from datetime import datetime, timezone
from typing import Annotated

import httpx
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth.deps import get_current_user, require_admin
from app.config import settings
from app.db import get_db
from app.models.customer import Customer
from app.models.export_document import ExportDocument, ExportDocumentBatch
from app.models.bundle import Bundle
from app.models.shipper import Shipper
from app.models.sticker_batch import StickerBatch
from app.schemas.export_document import (
    ExportDocumentAttachBatch,
    ExportDocumentCreate,
    ExportDocumentOut,
    ExportDocumentPackingList,
    ExportDocumentReject,
    ExportDocumentSpecifications,
)
from app.services.export_excel import generate_coa, generate_invoice_packing
from app.services.ocr import extract_coa_actuals
from app.services.storage import upload_storage_object

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/export-documents", tags=["export-documents"])

_REQUIRED_BUNDLE_FIELDS = ("material_id", "batch_no", "bundle_no", "ingot_count", "gross_weight", "net_weight")
_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

_DOCUMENT_LOAD = (
    selectinload(ExportDocument.shipper),
    selectinload(ExportDocument.batches)
    .selectinload(ExportDocumentBatch.sticker_batch)
    .selectinload(StickerBatch.bundles)
    .selectinload(Bundle.material),
)


async def _get_document_or_404(
    db: AsyncSession, document_id: uuid.UUID
) -> ExportDocument:
    document = await db.scalar(
        select(ExportDocument)
        .where(ExportDocument.id == document_id)
        .options(*_DOCUMENT_LOAD)
        .execution_options(populate_existing=True)
    )
    if document is None:
        raise HTTPException(status_code=404, detail="Export shipment not found")
    return document


def _ensure_editable(document: ExportDocument) -> None:
    if document.status not in {"draft", "rejected"}:
        raise HTTPException(status_code=422, detail="This shipment is locked after it was sent for approval")


def _ensure_ready_for_documents(document: ExportDocument) -> None:
    if not document.batches:
        raise HTTPException(status_code=422, detail="Add at least one sticker batch to this shipment first")
    for item in document.batches:
        bundles = item.sticker_batch.bundles
        if not bundles or any(
            any(getattr(bundle, field) is None for field in _REQUIRED_BUNDLE_FIELDS) for bundle in bundles
        ):
            raise HTTPException(status_code=422, detail="Complete every sticker batch before generating documents")
    if document.packing_list_net_weight is None:
        raise HTTPException(status_code=422, detail="Enter the packing list net weight first")
    if not document.net_weight_cleared:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Sticker net weight ({document.stickers_net_weight:g} kg) does not match the packing list "
                f"({document.packing_list_net_weight:g} kg). An admin must approve the mismatch."
            ),
        )


def _reset_override(document: ExportDocument) -> None:
    document.net_weight_override_by = None
    document.net_weight_override_at = None


@router.get("", response_model=list[ExportDocumentOut])
async def list_export_documents(
    _user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    status: Annotated[str | None, Query()] = None,
) -> list[ExportDocument]:
    query = select(ExportDocument).options(*_DOCUMENT_LOAD).order_by(ExportDocument.created_at.desc())
    if status:
        query = query.where(ExportDocument.status == status)
    result = await db.scalars(query)
    return list(result.all())


@router.get("/{document_id}", response_model=ExportDocumentOut)
async def get_export_document(
    document_id: uuid.UUID,
    _user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ExportDocument:
    return await _get_document_or_404(db, document_id)


@router.post("", response_model=ExportDocumentOut, status_code=201)
async def create_export_document(
    body: ExportDocumentCreate,
    _user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ExportDocument:
    selected_batches = list(
        (
            await db.scalars(select(StickerBatch).where(StickerBatch.id.in_(body.batch_ids)))
        ).all()
    ) if body.batch_ids else []
    if len(selected_batches) != len(set(body.batch_ids)):
        raise HTTPException(status_code=404, detail="One or more sticker batches were not found")
    if any(batch.type != "export" for batch in selected_batches):
        raise HTTPException(status_code=422, detail="Only export batches can be added to a shipment")

    shipper_ids = {batch.shipper_id for batch in selected_batches}
    if body.shipper_id:
        shipper_ids.add(body.shipper_id)
    if len(shipper_ids) != 1:
        raise HTTPException(status_code=422, detail="Choose one shipper for the whole shipment")
    shipper_id = shipper_ids.pop()
    if await db.get(Shipper, shipper_id) is None:
        raise HTTPException(status_code=404, detail="Shipper not found")

    invoice_no = body.invoice_no.strip() if body.invoice_no else ""
    if not invoice_no:
        consignee_name = (body.consignee.name or "").lower()
        customers = list(
            (
                await db.scalars(
                    select(Customer).where(Customer.customer_code.isnot(None))
                )
            ).all()
        )
        customer_code = "XX"
        for customer in customers:
            if customer.consignee_l1 and consignee_name and customer.consignee_l1.lower() in consignee_name:
                customer_code = customer.customer_code or "XX"
                break
        count = await db.scalar(
            select(func.count())
            .select_from(ExportDocument)
            .where(func.extract("year", ExportDocument.invoice_date) == body.invoice_date.year)
        )
        invoice_no = f"INV/EX/{customer_code}/{body.invoice_date:%y}/{(count or 0) + 1:03d}"

    document = ExportDocument(
        shipper_id=shipper_id,
        packing_list_net_weight=body.packing_list_net_weight,
        invoice_no=invoice_no,
        invoice_date=body.invoice_date,
        contract_no=body.contract_no,
        bill_of_lading_no=body.bill_of_lading_no,
        port_of_discharge=body.port_of_discharge,
        term_of_delivery=body.term_of_delivery,
        payment_terms=body.payment_terms,
        unit_price_usd_t=body.unit_price_usd_t,
        shipping_mark=body.shipping_mark,
        production_date=body.production_date,
        consignee=body.consignee.model_dump(),
        notify1=body.notify1.model_dump() if body.notify1 else None,
        notify2=body.notify2.model_dump() if body.notify2 else None,
        customer_material_name=body.customer_material_name,
        coa_specifications=body.coa_specifications,
    )
    ordered_batches = {batch.id: batch for batch in selected_batches}
    document.batches = [
        ExportDocumentBatch(sticker_batch_id=batch_id, position=position)
        for position, batch_id in enumerate(body.batch_ids)
        if batch_id in ordered_batches
    ]
    db.add(document)
    await db.commit()
    return await _get_document_or_404(db, document.id)


@router.post("/{document_id}/batches", response_model=ExportDocumentOut)
async def attach_batch(
    document_id: uuid.UUID,
    body: ExportDocumentAttachBatch,
    _user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ExportDocument:
    document = await _get_document_or_404(db, document_id)
    _ensure_editable(document)
    batch = await db.get(StickerBatch, body.batch_id)
    if batch is None:
        raise HTTPException(status_code=404, detail="Sticker batch not found")
    if batch.type != "export":
        raise HTTPException(status_code=422, detail="Only export batches can be added to a shipment")
    if batch.shipper_id != document.shipper_id:
        raise HTTPException(status_code=422, detail="This batch belongs to a different shipper")
    existing = await db.scalar(
        select(ExportDocumentBatch).where(ExportDocumentBatch.sticker_batch_id == batch.id)
    )
    if existing is not None:
        if existing.export_document_id == document.id:
            return document
        raise HTTPException(status_code=422, detail="This batch is already part of another shipment")
    document.batches.append(
        ExportDocumentBatch(sticker_batch_id=batch.id, position=len(document.batches))
    )
    _reset_override(document)
    await db.commit()
    return await _get_document_or_404(db, document_id)


@router.delete("/{document_id}/batches/{batch_id}", response_model=ExportDocumentOut)
async def detach_batch(
    document_id: uuid.UUID,
    batch_id: uuid.UUID,
    _user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ExportDocument:
    document = await _get_document_or_404(db, document_id)
    _ensure_editable(document)
    document.batches = [item for item in document.batches if item.sticker_batch_id != batch_id]
    for position, item in enumerate(sorted(document.batches, key=lambda item: item.position)):
        item.position = position
    _reset_override(document)
    await db.commit()
    return await _get_document_or_404(db, document_id)


@router.patch("/{document_id}/packing-list", response_model=ExportDocumentOut)
async def update_packing_list(
    document_id: uuid.UUID,
    body: ExportDocumentPackingList,
    _user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ExportDocument:
    document = await _get_document_or_404(db, document_id)
    _ensure_editable(document)
    document.packing_list_net_weight = body.packing_list_net_weight
    _reset_override(document)
    await db.commit()
    return await _get_document_or_404(db, document_id)


@router.patch("/{document_id}/net-weight-override", response_model=ExportDocumentOut)
async def override_net_weight(
    document_id: uuid.UUID,
    admin: Annotated[dict, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ExportDocument:
    document = await _get_document_or_404(db, document_id)
    _ensure_editable(document)
    if document.packing_list_net_weight is None:
        raise HTTPException(status_code=422, detail="Enter the packing list net weight first")
    document.net_weight_override_by = admin.get("email")
    document.net_weight_override_at = datetime.now(timezone.utc)
    await db.commit()
    return await _get_document_or_404(db, document_id)


async def _send_approval_emails(document: ExportDocument, attachments: list[dict]) -> None:
    if not (settings.resend_api_key and settings.resend_from_email and settings.admin_emails_list):
        return
    mismatch_note = ""
    if not document.net_weight_matches:
        mismatch_note = (
            f"<p><strong>Net weight mismatch approved by {document.net_weight_override_by}:</strong> "
            f"stickers {document.stickers_net_weight:g} kg vs packing list "
            f"{document.packing_list_net_weight:g} kg.</p>"
        )
    html = (
        f"<p>{document.invoice_no} ({document.consignee['name']}) is ready for approval.</p>"
        f"<p>Net weight: {document.stickers_net_weight:g} kg.</p>{mismatch_note}"
        "<p>The invoice &amp; packing list and the COA are attached.</p>"
    )
    sent = 0
    async with httpx.AsyncClient(timeout=30) as client:
        # One email per admin: the Resend test sender rejects the whole send if any recipient is unverified.
        for admin_email in settings.admin_emails_list:
            try:
                response = await client.post(
                    "https://api.resend.com/emails",
                    headers={"Authorization": f"Bearer {settings.resend_api_key}"},
                    json={
                        "from": settings.resend_from_email,
                        "to": [admin_email],
                        "subject": f"Approval requested: {document.invoice_no}",
                        "html": html,
                        "attachments": attachments,
                    },
                )
                response.raise_for_status()
                sent += 1
            except httpx.HTTPError as exc:
                detail = exc.response.text if isinstance(exc, httpx.HTTPStatusError) else str(exc)
                logger.error("Approval email to %s failed: %s", admin_email, detail)
    if sent == 0:
        raise HTTPException(status_code=502, detail="Approval notification could not be sent")


@router.patch("/{document_id}/submit-approval", response_model=ExportDocumentOut)
async def submit_for_approval(
    document_id: uuid.UUID,
    _user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ExportDocument:
    document = await _get_document_or_404(db, document_id)
    _ensure_editable(document)
    _ensure_ready_for_documents(document)
    try:
        invoice_packing = await generate_invoice_packing(document)
        coa = await generate_coa(document)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    safe_invoice_no = document.invoice_no.replace("/", "-")
    attachments = [
        {"filename": f"invoice-packing-{safe_invoice_no}.xlsx", "content": base64.b64encode(invoice_packing).decode()},
        {"filename": f"coa-{safe_invoice_no}.xlsx", "content": base64.b64encode(coa).decode()},
    ]
    await _send_approval_emails(document, attachments)
    document.status = "pending_approval"
    document.rejection_comment = None
    await db.commit()
    return await _get_document_or_404(db, document_id)


@router.patch("/{document_id}/approve", response_model=ExportDocumentOut)
async def approve_export_document(
    document_id: uuid.UUID,
    _admin: Annotated[dict, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ExportDocument:
    document = await _get_document_or_404(db, document_id)
    document.status = "approved"
    document.rejection_comment = None
    await db.commit()
    return await _get_document_or_404(db, document_id)


@router.patch("/{document_id}/reject", response_model=ExportDocumentOut)
async def reject_export_document(
    document_id: uuid.UUID,
    body: ExportDocumentReject,
    _admin: Annotated[dict, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ExportDocument:
    document = await _get_document_or_404(db, document_id)
    document.status = "rejected"
    document.rejection_comment = body.comment
    await db.commit()
    return await _get_document_or_404(db, document_id)


@router.patch("/{document_id}/coa-specifications", response_model=ExportDocumentOut)
async def update_coa_specifications(
    document_id: uuid.UUID,
    body: ExportDocumentSpecifications,
    _user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ExportDocument:
    document = await _get_document_or_404(db, document_id)
    _ensure_editable(document)
    document.coa_specifications = body.coa_specifications
    await db.commit()
    return await _get_document_or_404(db, document_id)


@router.post("/{document_id}/coa-actuals/{batch_no}", response_model=ExportDocumentOut)
async def upload_coa_actuals(
    document_id: uuid.UUID,
    batch_no: str,
    _user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    file: UploadFile = File(...),
) -> ExportDocument:
    if file.content_type not in {"image/jpeg", "image/png"}:
        raise HTTPException(status_code=422, detail="Upload a JPEG or PNG lab-analysis image")
    document = await _get_document_or_404(db, document_id)
    raw_bytes = await file.read()
    try:
        actuals = await extract_coa_actuals(raw_bytes, file.content_type)
    except Exception as exc:
        raise HTTPException(status_code=422, detail="Could not extract COA actuals from this image") from exc
    path = f"coa/{document_id}/{batch_no}-{uuid.uuid4()}.jpg"
    await upload_storage_object(path, raw_bytes, file.content_type)
    document.coa_actuals = {**(document.coa_actuals or {}), batch_no: actuals}
    await db.commit()
    return await _get_document_or_404(db, document_id)


@router.get("/{document_id}/invoice-packing")
async def download_invoice_packing(
    document_id: uuid.UUID,
    _user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> StreamingResponse:
    document = await _get_document_or_404(db, document_id)
    _ensure_ready_for_documents(document)
    try:
        contents = await generate_invoice_packing(document)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=502, detail="Invoice template could not be loaded") from exc

    filename = f"invoice-packing-{document.invoice_no}.xlsx".replace("/", "-")
    return StreamingResponse(
        iter([contents]),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{document_id}/coa")
async def download_coa(
    document_id: uuid.UUID,
    _user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> StreamingResponse:
    document = await _get_document_or_404(db, document_id)
    try:
        contents = await generate_coa(document)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=502, detail="COA template could not be loaded") from exc
    except Exception as exc:
        logger.exception("COA generation failed")
        raise HTTPException(status_code=500, detail=f"COA generation error: {type(exc).__name__}: {exc}") from exc

    filename = f"coa-{document.invoice_no}.xlsx".replace("/", "-")
    return StreamingResponse(
        iter([contents]),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
