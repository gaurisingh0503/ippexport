import uuid
from typing import Annotated

import httpx
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth.deps import get_current_user
from app.config import settings
from app.db import get_db
from app.models.customer import Customer
from app.models.export_document import ExportDocument, ExportDocumentBatch
from app.models.bundle import Bundle
from app.models.sticker_batch import StickerBatch
from app.schemas.export_document import ExportDocumentCreate, ExportDocumentOut, ExportDocumentReject, ExportDocumentSpecifications
from app.services.export_excel import generate_coa, generate_invoice_packing
from app.services.ocr import extract_coa_actuals
from app.services.storage import upload_storage_object

router = APIRouter(prefix="/export-documents", tags=["export-documents"])

_DOCUMENT_LOAD = (
    selectinload(ExportDocument.shipper),
    selectinload(ExportDocument.batches),
)

_DOCUMENT_GENERATION_LOAD = (
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
        select(ExportDocument).where(ExportDocument.id == document_id).options(*_DOCUMENT_LOAD)
    )
    if document is None:
        raise HTTPException(status_code=404, detail="Export document group not found")
    return document


async def _get_document_for_generation_or_404(
    db: AsyncSession, document_id: uuid.UUID
) -> ExportDocument:
    document = await db.scalar(
        select(ExportDocument)
        .where(ExportDocument.id == document_id)
        .options(*_DOCUMENT_GENERATION_LOAD)
    )
    if document is None:
        raise HTTPException(status_code=404, detail="Export document group not found")
    return document


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
            await db.scalars(
                select(StickerBatch)
                .where(StickerBatch.id.in_(body.batch_ids))
                .options(selectinload(StickerBatch.bundles))
            )
        ).all()
    )
    if len(selected_batches) != len(set(body.batch_ids)):
        raise HTTPException(status_code=404, detail="One or more sticker batches were not found")
    if any(batch.type != "export" for batch in selected_batches):
        raise HTTPException(status_code=422, detail="Only export batches can be grouped into documents")

    shipper_ids = {batch.shipper_id for batch in selected_batches}
    if len(shipper_ids) != 1:
        raise HTTPException(status_code=422, detail="All grouped batches must use the same shipper")

    required_fields = ("material_id", "batch_no", "bundle_no", "ingot_count", "gross_weight", "net_weight")
    if any(
        not batch.bundles
        or any(any(getattr(bundle, field) is None for field in required_fields) for bundle in batch.bundles)
        for batch in selected_batches
    ):
        raise HTTPException(status_code=422, detail="Complete every selected batch before creating documents")

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
        shipper_id=selected_batches[0].shipper_id,
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


@router.patch("/{document_id}/submit-approval", response_model=ExportDocumentOut)
async def submit_for_approval(
    document_id: uuid.UUID,
    _user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ExportDocument:
    document = await _get_document_or_404(db, document_id)
    if document.status not in {"draft", "rejected"}:
        raise HTTPException(status_code=422, detail="Only draft or rejected documents can be submitted")
    if settings.resend_api_key and settings.resend_from_email and settings.admin_email:
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {settings.resend_api_key}"},
                json={"from": settings.resend_from_email, "to": [settings.admin_email],
                      "subject": f"Approval requested: {document.invoice_no}",
                      "html": f"<p>{document.invoice_no} is ready for approval.</p>"},
                )
                response.raise_for_status()
        except httpx.HTTPError as exc:
            raise HTTPException(status_code=502, detail="Approval notification could not be sent") from exc
    document.status = "pending_approval"
    document.rejection_comment = None
    await db.commit()
    return await _get_document_or_404(db, document_id)


@router.patch("/{document_id}/approve", response_model=ExportDocumentOut)
async def approve_export_document(
    document_id: uuid.UUID,
    _user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ExportDocument:
    if not settings.admin_email or _user.get("email", "").lower() != settings.admin_email.lower():
        raise HTTPException(status_code=403, detail="Only the configured admin can approve documents")
    document = await _get_document_or_404(db, document_id)
    document.status = "approved"
    document.rejection_comment = None
    await db.commit()
    return await _get_document_or_404(db, document_id)


@router.patch("/{document_id}/reject", response_model=ExportDocumentOut)
async def reject_export_document(
    document_id: uuid.UUID,
    body: ExportDocumentReject,
    _user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ExportDocument:
    if not settings.admin_email or _user.get("email", "").lower() != settings.admin_email.lower():
        raise HTTPException(status_code=403, detail="Only the configured admin can reject documents")
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
    if document.status not in {"draft", "rejected"}:
        raise HTTPException(status_code=422, detail="Specifications cannot be changed after submission")
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
    document = await _get_document_for_generation_or_404(db, document_id)
    try:
        contents = await generate_invoice_packing(document)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=502, detail="Invoice template could not be loaded") from exc

    filename = f"invoice-packing-{document.invoice_no}.xlsx"
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
    document = await _get_document_for_generation_or_404(db, document_id)
    try:
        contents = await generate_coa(document)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=502, detail="COA template could not be loaded") from exc

    filename = f"coa-{document.invoice_no}.xlsx"
    return StreamingResponse(
        iter([contents]),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
