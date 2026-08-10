# IPP Shipments v2 — Build Checklist

Work through one phase at a time. Reset Cursor context between phases.
Check off each item as it is done and committed.

---

## Phase 0 — Scaffold ← YOU ARE HERE

- [x] Root `AGENTS.md`
- [x] `backend/AGENTS.md`
- [x] `frontend/AGENTS.md`
- [x] `to-dos.md` (this file)
- [ ] `backend/pyproject.toml` with uv + supply-chain guard
- [ ] `backend/.env.example`
- [ ] `backend/app/__init__.py`, `main.py`, `config.py`, `db.py` skeletons
- [ ] `backend/alembic.ini` + `alembic/env.py`
- [ ] `frontend/` Vite scaffold via `pnpm create vite@latest frontend --template react-ts`
- [ ] `frontend/.npmrc` with `minimum-release-age=10080`
- [ ] `frontend/src/lib/env.ts`, `http.ts`, `api.ts`, `supabase.ts` stubs
- [ ] `.gitignore` covering `.env`, `__pycache__`, `node_modules`, `.venv`
- [ ] Repo pushed to GitHub

---

## Phase 1 — Auth

- [ ] Supabase project created (Postgres + Auth enabled)
- [ ] `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` in `.env`
- [ ] `app/auth/deps.py` — `get_current_user` dependency verifying Supabase JWT
- [ ] `app/api/auth.py` — `/auth/me` endpoint
- [ ] First Alembic migration (creates `users` mirror table if needed)
- [ ] `src/pages/Login.tsx` — email + password form
- [ ] `src/lib/supabase.ts` — sign-in, sign-out, session listener
- [ ] `App.tsx` auth guard — redirect unauthenticated users to `/login`
- [ ] Manual test: login, protected route, logout

---

## Phase 2 — Entity Management

- [ ] DB tables: `shippers`, `customers` (Alembic migration)
- [ ] Seed shippers: IPP + Rich-Siri (name, address, tax ID, brand color)
- [ ] Seed 5 customers from control_sheet.xlsx (Raveshia, Zetwerk, Jain Resource, HK Yesheng, BNS Korea)
- [ ] `app/api/customers.py` — GET list, POST create, PATCH update (admin only)
- [ ] `src/pages/Admin.tsx` — customer list + add/edit form (admin role only)
- [ ] Manual test: add a customer, verify it persists

---

## Phase 3 — Shipment Builder (DnD UI)

- [ ] DB table: `shipments` with columns: id, type (domestic/export), shipper_id, consignee_id,
      notify1_id, notify2_id, port_of_discharge, payment_terms, status, created_at
- [ ] Alembic migration
- [ ] `app/api/shipments.py` — POST create, GET detail, PATCH update
- [ ] `src/pages/ShipmentGate.tsx` — card picker: "Domestic Shipment" | "Export Shipment"
- [ ] `src/pages/DomesticBuilder.tsx`:
  - Left panel: shipper cards (IPP, Rich-Siri)
  - Right panel: single `Shipper` drop zone
  - Confirm button → POST /shipments → navigate to OCR step
- [ ] `src/pages/ExportBuilder.tsx`:
  - Left panel: shipper cards + customer cards
  - Right panel: Consignee, Shipper, Notify Party 1, Notify Party 2 drop zones
  - Drop on Consignee auto-fills port_of_discharge + payment_terms
  - Confirm button → POST /shipments → navigate to OCR step
- [ ] Manual test: build a domestic and an export shipment end to end

---

## Phase 4 — OCR

- [ ] `ANTHROPIC_API_KEY` in `.env`
- [ ] `app/services/ocr.py` — accepts image bytes, calls Claude vision, returns structured dict
      (material_name, batch_no, bundle_no, ingot_count, gross_weight, net_weight)
- [ ] `app/api/shipments.py` — POST `/shipments/{id}/bundles` (upload image → run OCR → store)
- [ ] DB table: `bundles` (id, shipment_id, all OCR fields, raw_image_path)
- [ ] Alembic migration
- [ ] Upload step UI: drag-drop or file picker, shows extracted values for confirmation/edit
- [ ] Manual test: upload a real bundle photo, confirm OCR result

---

## Phase 5 — Document Generation

- [ ] `TEMPLATE_DIR` env var pointing to the v2 templates folder
- [ ] `app/services/excel.py` — reads templates, fills cells, returns temp file path
  - `generate_stickers(shipment, bundles, template_path)` → xlsx bytes
  - `generate_invoice_pl_coa(shipment, bundles, template_path)` → xlsx bytes
- [ ] `app/api/documents.py` — GET `/shipments/{id}/download/stickers` and `/download/invoice`
      (returns FileResponse with correct Content-Disposition)
- [ ] Download button on builder pages → triggers correct endpoint based on shipment type
- [ ] Manual test: full domestic run (OCR + sticker download), full export run (OCR + all docs)

---

## Phase 6 — Deploy to Railway

- [ ] `backend/Dockerfile` (or Railway nixpacks auto-detect — check which works)
- [ ] `frontend/` deployed as static site (Railway static or Vite build + serve)
- [ ] Production env vars set in Railway dashboard
- [ ] Supabase RLS policies reviewed
- [ ] Smoke test on production URL

---

## Notes

- Reset Cursor context (start new chat) at the start of each phase.
- Each phase should be a clean PR or at least a tagged commit.
- Templates stay at their file path — do not bundle them into the repo.
