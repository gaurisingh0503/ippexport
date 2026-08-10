# IPP Shipments v2 — Build Checklist

Work through one phase at a time. Reset Cursor context between phases.
Check off each item as it is done and committed.

---

## Data Model

Core entity: **`sticker_batch`** — not shipment.

| Entity | Purpose |
|---|---|
| `sticker_batches` | Operator creates a batch (type + shipper + material). All bundles share the material. |
| `bundles` | OCR data from bundle tag photos. FK → `sticker_batches.id` |
| `shippers` | IPP and Rich-Siri (seeded) |
| `materials` | 4 lead products (seeded) |
| `customers` | Consignee/notify data with approval workflow |

Export invoice grouping (Phase 6+) assigns multiple sticker batches to an invoice — not modeled yet.

There is **no shipments table**.

---

## Phase 0 — Scaffold ✅

## Phase 1 — Auth ✅

## Phase 2 — Entity Management ✅

- [x] DB tables: shippers, customers, materials
- [x] Seed shippers, customers, materials
- [x] Customer approval workflow + Admin + SubmitCustomer UI
- [x] Commit: Phase 2 complete

---

## Phase 3 — Sticker Batch Builder ✅

- [x] DB table: sticker_batches — shipper_id, material_id, type, sticker_file_url, status, created_at
- [x] Alembic migration (replaces shipments table)
- [x] POST /batches, GET /batches, GET /batches/{id}, PATCH /batches/{id}
- [x] src/components/ShipperCard.tsx — draggable shipper card
- [x] src/components/DropZone.tsx — reusable drop zone
- [x] src/pages/BatchGate.tsx — Domestic / Export card picker
- [x] src/pages/DomesticBatchBuilder.tsx — shipper DnD + material select
- [x] src/pages/ExportBatchBuilder.tsx — same as domestic, type=export
- [x] src/pages/OcrPlaceholder.tsx — batch summary, Phase 4 placeholder
- [x] Dashboard recent batches list with material column
- [x] Routes: /batches/new, /batches/new/domestic, /batches/new/export, /batches/:id/ocr
- [x] Commit: Phase 3 complete

---

## Phase 4 — OCR

- [x] app/services/ocr.py — Claude vision extraction
- [x] DB table: bundles — FK sticker_batch_id, OCR fields, image_path
- [ ] POST /batches/{id}/bundles — upload → OCR → store (update from old /shipments path)
- [ ] Bundle upload UI at /batches/:id/ocr (replace OcrPlaceholder)
- [ ] Commit: Phase 4 complete

---

## Phase 5 — Sticker Generation

- [ ] generate_stickers(batch, bundles, template) via openpyxl
- [ ] GET /batches/{id}/stickers — download sticker Excel
- [ ] Sticker preview page
- [ ] Commit: Phase 5 complete

---

## Phase 6 — Invoice / PL / COA (Export only)

- [ ] Export invoice builder — customer/notify party DnD (after stickers confirmed)
- [ ] Group export sticker batches into invoice
- [ ] Generate Invoice + PL + COA documents
- [ ] Commit: Phase 6 complete

---

## Phase 7 — Approval Workflow + Notifications

- [ ] Resend email notifications
- [ ] Admin approval for export documents
- [ ] Commit: Phase 7 complete

---

## Phase 8 — Deploy to Railway

- [ ] Production deploy + smoke test
- [ ] Commit: Phase 8 complete

---

## Notes

- Reset Cursor context at the start of each phase.
- Templates stay in Supabase Storage — never bundled into the repo.
- Stickers never go through approval. Only Invoice/PL/COA does.
