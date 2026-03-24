# NuvoVet Backend — Startup Guide

## Prerequisites

- Python 3.11+
- `pip`

## Install dependencies

```bash
pip install -r requirements.txt
```

## Start the API server

Run from the **repo root**:

```bash
uvicorn backend.main:app --reload --port 8000
```

Or from inside the `backend/` directory:

```bash
cd backend
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`.

## Health check

```bash
curl http://localhost:8000/api/health
# → {"status":"ok","drug_count":641}
```

## Key endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Backend health check |
| `GET` | `/api/drugs` | Paginated drug list (`limit`, `offset`, `drug_class`, `source`) |
| `GET` | `/api/drugs/search` | Full-text drug search (`q`, `species`, `limit`) |
| `GET` | `/api/drugs/{drug_id}` | Single drug by ID |
| `POST` | `/api/admin/drugs/reload` | Re-sync PostgreSQL `drugs` from `backend/data/converted/**/*.jsonl` and refresh API cache (admin JWT required) |

## Drug data

Drug records are loaded at startup from `backend/data/converted/**/*.jsonl`. Do not modify files in that directory — they are the read-only source of truth.

## Render PostgreSQL sync

This sandbox does not have the Render PostgreSQL URL, so the actual SQL reload must run on Render.

### Option 1: reload automatically on each deploy

Set `NUVOVET_SYNC_DRUGS_ON_STARTUP=1` in the Render backend service environment.

With that flag enabled, every deploy will:

1. start the API
2. run the same sync as `python goto_db.py --mode drugs`
3. load the refreshed PostgreSQL data into the in-memory API cache

If the sync fails, startup fails as well, which makes deploy issues visible immediately.

### Option 2: reload manually after deploy

1. SSH or open a Render shell for the backend service
2. run `python goto_db.py --mode drugs`

### Option 3: reload through the API

1. log in as the seeded `admin` account or another account renamed to `admin`
2. call `POST /api/admin/drugs/reload` with the bearer token

Example:

```bash
curl -X POST "$API_BASE_URL/api/admin/drugs/reload" \
	-H "Authorization: Bearer $TOKEN"
```

Expected response:

```json
{
	"status": "ok",
	"files_processed": 641,
	"records_upserted": 641,
	"records_skipped": 0,
	"cache_drug_count": 641
}
```

## CORS

The server allows all origins in development (`allow_origins=["*"]`). Restrict this in production.
