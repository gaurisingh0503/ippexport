# IPP Shipments v2 — Agent Notes (Root)

Every agent working in this repo must read this file first. Per-folder AGENTS.md files add
specifics — read them too before touching files in that folder.

## What this project is

A full-stack web app that replaces an n8n Excel automation for IPP Lead And Metals Co., Ltd.
and Rich-Siri Metal And Trading Co., Ltd. (two Thai lead-ingot exporters sharing the same
operator).

**Core flow:**
1. Operator logs in → selects shipment type (Domestic or Export)
2. Drags customers / notify parties / shipper onto the builder canvas
3. Uploads bundle photos → Claude OCR extracts batch/bundle/weight data
4. Downloads generated Excel documents (stickers for domestic; stickers + invoice + packing
   list + COA for export)

## Stack (locked — do not suggest alternatives)

| Layer | Choice |
|---|---|
| Backend | Python 3.12, FastAPI, uvicorn |
| Backend deps | uv (not pip, not poetry) |
| DB | Supabase (Postgres) |
| Auth | Supabase Auth — email only, no social providers |
| ORM | SQLAlchemy 2 (async) + Alembic migrations |
| Config | pydantic-settings — single `app/config.py`, never `os.getenv` in app code |
| OCR | Anthropic Claude API (claude-sonnet-4-5 or newer) |
| Excel | openpyxl — downloads templates from Supabase Storage, writes filled copies |
| Frontend | Vite + React + TypeScript (strict) |
| Frontend deps | pnpm only |
| Styling | Tailwind CSS |
| UI primitives | shadcn/ui |
| Routing | React Router v6 |
| Drag-and-drop | @dnd-kit/core |
| HTTP client | native fetch through `src/lib/http.ts` |
| Hosting | Railway |

## Users

Two roles only. No self-registration.

- **admin** — Gauri (owner). Can manage customers, shippers, view all shipments.
- **operator** — one operator account. Can create and download shipments.

## Shipment types

- **Domestic** → generates stickers only (IPP or Rich-Siri branded)
- **Export** → generates stickers + Provisional Invoice + Packing List + C-1&2 + C-3&4 + COA

## Template files

Stored in Supabase Storage bucket `ipp-templates` (configured via `SUPABASE_STORAGE_BUCKET`).
The backend downloads the required template at runtime, writes to a temp file, fills with
openpyxl, and streams the result to the client. Never cache templates between requests.
Never hard-code cell positions; derive them from the template's own merged-cell and row layout.

## Shippers

| ID | Company |
|---|---|
| `ipp` | IPP Lead And Metals Co., Ltd. |
| `richsiri` | Rich-Siri Metal And Trading Co., Ltd. |

Both stored in `shippers` table (seeded, not user-editable).

## Dependency policy

Write it yourself unless it is genuinely non-trivial. Before adding a package ask:
1. Is there a stdlib / built-in way?
2. Is the package small, actively maintained, and worth the supply-chain risk?

Backend supply-chain guard: `exclude-newer = "7 days"` in `pyproject.toml` (uv).
Frontend guard: `minimum-release-age=10080` (minutes) in `.npmrc` (pnpm).

## Code style

- Small, obvious functions. Three similar lines > a premature abstraction.
- Comments explain WHY, never WHAT.
- No half-finished implementations. No TODO stubs left in committed code.
- No error handling for scenarios that cannot happen. Trust framework guarantees.
- Validate at system boundaries only (HTTP input, external API responses). Trust internal callers.

## Git

- One focused commit per logical change. Message: imperative present tense.
- Never commit `.env` files.
