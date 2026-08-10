# Backend — Agent Notes

Read [../AGENTS.md](../AGENTS.md) first. This file adds backend-specific rules.

## Layout

```
backend/
├── alembic/
│   ├── env.py
│   └── versions/
├── alembic.ini
├── app/
│   ├── main.py          # FastAPI app factory
│   ├── config.py        # pydantic-settings — single source of truth
│   ├── api/             # FastAPI routers
│   │   ├── auth.py
│   │   ├── shipments.py
│   │   ├── customers.py
│   │   └── documents.py
│   ├── auth/
│   │   └── deps.py      # current_user FastAPI dependency
│   ├── models/          # SQLAlchemy ORM models
│   ├── schemas/         # Pydantic request/response schemas
│   ├── services/
│   │   ├── ocr.py       # Claude vision OCR
│   │   └── excel.py     # openpyxl document generation
│   └── db.py            # async engine + session factory
├── pyproject.toml
└── .env.example
```

## Running

```bash
uv sync
uv run uvicorn app.main:app --reload
```

## Migrations

```bash
uv run alembic revision --autogenerate -m "description"
uv run alembic upgrade head
```

Always review generated migration before applying. Never edit production tables in Supabase
dashboard — Alembic is the source of truth.

## Config rules

- All env reads go through `app/config.py` (`pydantic-settings` `Settings` class).
- Import `from app.config import settings` wherever needed.
- Never call `os.getenv` or `load_dotenv` in app code.
- Fail fast on startup if required vars are missing (pydantic-settings does this by default).

## Auth pattern

- Browser sends Supabase JWT as `Authorization: Bearer <token>`.
- Backend verifies JWT by calling Supabase Auth endpoint (or using the Supabase Python client).
- `service_role` key lives only on the backend. Never expose it to the frontend.
- `get_current_user` dependency in `app/auth/deps.py` returns the verified user or raises 401.

## Async

- All route handlers: `async def`.
- All database calls: async (SQLAlchemy async session).
- No blocking I/O on the event loop. Small file reads are fine; network calls must be async.

## OCR (Claude)

- Use `anthropic` Python SDK.
- Model: `claude-sonnet-4-5` (or whichever is set in `settings.claude_model`).
- Send the uploaded image as base64. Extract: Material Name, Batch No., Bundle No.,
  Number of Ingots, Gross Weight, Net Weight.
- Return structured JSON from the prompt — validate with a Pydantic model before trusting.

## Excel generation (openpyxl)

- Template files are at the path in `settings.template_dir`.
- Open with `openpyxl.load_workbook(path)` (NOT `data_only=True` — we need formula strings).
- Write only to the top-left cell of any merged range.
- Save the filled copy to a temp file; stream it back to the client via `FileResponse`.
- Never modify the master template files.

## Anti-patterns

- `os.getenv` anywhere in `app/`.
- Sync DB calls inside async route handlers.
- Returning opaque 500s — let FastAPI's exception handlers surface real errors in dev.
- Mocking the DB in tests when the real thing is available.
