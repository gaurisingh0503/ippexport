# IPP Shipments v2 — Build Checklist

Work through one phase at a time. Reset Cursor context between phases.
Check off each item as it is done and committed.

---

## Phase 0 — Scaffold ✅

## Phase 1 — Auth ✅

## Phase 2 — Entity Management ✅

- [x] DB tables: shippers, customers
- [x] Seed shippers: IPP + Rich-Siri
- [x] Seed 5 customers
- [x] GET /customers, POST /customers, PATCH /customers/{id}
- [x] GET /shippers
- [x] Add status column to Customer (pending / approved / rejected), default approved
- [x] Alembic migration for status column
- [x] Update GET /customers to filter by status (default: approved only)
- [x] Update POST /customers to set status=pending on every new submission
- [x] Add PATCH /customers/{id}/approve and /reject endpoints
- [x] DB table: materials — material_name, hs_code, sticker_display_name, goods_description
- [x] Seed 4 materials
- [x] GET /materials
- [x] src/pages/SubmitCustomer.tsx — form for any logged-in user
- [x] src/pages/Admin.tsx — Approved tab + Pending Approvals tab with approve/reject buttons
- [x] Add VITE_ADMIN_EMAIL to env.ts and .env.example
- [x] Add /admin and /submit-customer routes to App.tsx
- [x] Update Dashboard.tsx nav with Submit Customer + Admin links
- [x] Manual test: submit customer → pending → admin approves → appears in approved list
- [x] Commit: Phase 2 complete

---

## Phase 3 — Shipment Builder (DnD UI) ✅

Shipper selection only — customer/notify party DnD comes in Phase 6.

- [x] DB table: shipments — id, type, shipper_id, consignee_id, notify1_id,
      notify2_id, port_of_discharge, payment_terms, unit_price_usd, status, created_at
- [x] Alembic migration
- [x] POST /shipments, GET /shipments, GET /shipments/{id}, PATCH /shipments/{id}
- [x] src/components/ShipperCard.tsx — draggable shipper card with brand color
- [x] src/components/DropZone.tsx — reusable drop zone
- [x] src/pages/ShipmentGate.tsx — Domestic / Export card picker
- [x] src/pages/DomesticBuilder.tsx — shipper DnD only → POST /shipments → OCR
- [x] src/pages/ExportBuilder.tsx — shipper DnD only (customer DnD in Phase 6)
- [x] Dashboard recent shipments list
- [x] Add shipment routes to App.tsx
- [x] Manual test: create domestic and export shipments
- [x] Commit: Phase 3 complete

---

## Phase 4 — OCR ✅

- [x] ANTHROPIC_API_KEY in .env
- [x] app/services/ocr.py — accepts image bytes, calls Claude vision,
      returns: material_name, batch_no, bundle_no, ingot_count,
      gross_weight, net_weight
- [x] DB table: bundles — id, shipment_id, all OCR fields, raw_image_path
- [x] Alembic migration
- [x] POST /shipments/{id}/bundles — upload image → OCR → store result
- [x] Bundle upload UI — drag-drop or file picker, shows extracted values
      for operator to confirm or correct before saving
- [x] Manual test: upload a real bundle photo, confirm OCR output
- [ ] Commit: Phase 4 complete

---

## Phase 5 — Sticker Generation (no approval needed)

- [ ] SUPABASE_STORAGE_BUCKET=ipp-templates in .env
- [ ] app/services/excel.py — generate_stickers(shipment, bundles, template)
      downloads template from Supabase Storage, fills cells with OCR data,
      returns xlsx bytes. Never modifies master templates.
- [ ] GET /shipments/{id}/stickers — generates and streams sticker Excel
      to browser as a file download
- [ ] Sticker preview page:
      - Shows a summary table of all bundles and their data
      - Download Stickers button → hits the endpoint above
      - operator confirms data looks right before downloading
- [ ] Manual test: full domestic run — OCR → preview → download stickers
- [ ] Manual test: full export run — OCR → preview → download stickers
- [ ] Commit: Phase 5 complete

---

## Phase 6 — Invoice / PL / COA Generation (Export only)

- [ ] COA photo OCR — same service as Phase 4 but for COA documents
      extracts: certificate reference, analysis values per element
- [ ] POST /shipments/{id}/coa — upload COA photo → OCR → store
- [ ] Invoice builder page (after stickers are done for export shipments):
      - DnD zones: Consignee, Notify Party 1, Notify Party 2
        (pre-filled from shipment but operator can change)
      - Price input field (USD per tonne)
      - All other fields auto-filled: shipper details from shippers table,
        weights/quantities from bundle OCR data, COA specs from COA_Specs,
        customer address lines from customers table
      - Generate Documents button → POST /shipments/{id}/documents
- [ ] app/services/excel.py — generate_invoice_pl_coa(shipment, bundles, coa, template)
      fills Invoice + Packing List + C-1&2 + C-3&4 + COA sheets
- [ ] POST /shipments/{id}/documents — generates all export docs,
      saves to Supabase Storage, sets shipment status to draft
- [ ] Document preview page:
      - Shows a summary of what was generated (shipper, consignee,
        total weight, price, bundle count)
      - Two options:
        1. Download Draft → streams the generated Excel for offline editing
        2. Submit for Approval → if no edits needed, submits as-is
      - Re-upload Edited File → operator uploads their edited Excel,
        replaces the file in Supabase Storage
      - Submit for Approval button (available after generate or re-upload)
        → sets shipment status to submitted
- [ ] Manual test: generate docs → download draft → re-upload → submit
- [ ] Manual test: generate docs → submit directly without editing
- [ ] Commit: Phase 6 complete

---

## Phase 7 — Approval Workflow + Notifications

- [ ] Sign up for Resend (resend.com) — free tier is enough
- [ ] RESEND_API_KEY + ADMIN_EMAIL + OPERATOR_EMAIL in .env
- [ ] app/services/email.py — send_approval_request(shipment_id) and
      send_approval_confirmation(shipment_id, operator_email)
      using Resend API (no attachments — notification emails only)
- [ ] Wire POST /shipments/{id}/submit → sends email to admin:
      "Shipment {id} documents are pending your approval."
      with a link to the admin panel
- [ ] Add Shipments tab to Admin.tsx:
      - Lists submitted shipments with shipper, consignee, date
      - Click to view shipment details and download the Excel for review
      - Approve button → sets status to approved → sends email to operator:
        "Your shipment documents have been approved and are ready to download."
      - Reject button → sets status to rejected → operator sees rejection
- [ ] GET /shipments/{id}/download — streams the approved Excel to operator.
      Returns 403 if status is not approved.
- [ ] Operator shipment page shows current status
      (draft / submitted / approved / rejected) and Download button
      that only activates once approved
- [ ] Manual test: full export flow end to end —
      build → OCR → stickers → invoice builder → generate →
      preview → submit → admin approves → operator downloads
- [ ] Commit: Phase 7 complete

---

## Phase 8 — Deploy to Railway

- [ ] Upload all 6 template files to Supabase Storage bucket ipp-templates
- [ ] backend/Dockerfile or Railway nixpacks auto-detect
- [ ] Frontend Vite build deployed as static site on Railway
- [ ] All production env vars set in Railway dashboard
- [ ] Supabase RLS policies reviewed
- [ ] Smoke test on production URL
- [ ] Commit: Phase 8 complete

---

## Notes

- Reset Cursor context at the start of each phase.
- Templates stay in Supabase Storage — never bundled into the repo.
- Resend is used for notification emails only — no document attachments.
- Stickers never go through approval. Only Invoice/PL/COA does.
