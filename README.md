# NuvoVet

**The clinical data layer between veterinary clinics and pet insurers (Korea first).**

NuvoVet turns a messy veterinary invoice into a standard-coded, clinically checked insurance claim:

- **Insurers** get structured claims, a computed payout and explainable findings. Findings cover coverage, clinical plausibility, pricing and integrity.
- **Clinics** get a free pre-check before the owner files.

Why we pivoted from a clinic-paid drug-interaction checker, and the plan from here: [`docs/strategy/pivot_memo_2026-10.md`](docs/strategy/pivot_memo_2026-10.md).

> All claims, clinics and patients in the demo are **synthetic**. Price benchmarks are seed estimates unless a public source is cited.

## Products

Two products under one master brand, each with its own colour (`frontend/src/brand/`):
**nuvovet DUR** (teal, clinic side) and **nuvovet Claims** (cobalt, insurer side).

| Route | Product | What it does |
|---|---|---|
| `/` | both | Landing: a 3D laptop replays each product (EMR + DUR island, Claims adjudication), role chooser, one section per product |
| `/dur#/emr/V1` | DUR | Fictional EMR with the DUR overlay: the **DUR island** (draggable pill that peeks open on new findings, expands into the full review, docks into a side panel), row badges, the save gate, a guided 4-step demo strip; 10 fictional patients |
| `/dur` | DUR | Case studies, workbench, printable report and owner handout for the same engine |
| `/insurance` | Claims | Claims console on the live engine: review queue, live claim composer, clinic risk, fee benchmarks, engine performance, API docs |
| `/clinic/claim` | Claims | Free clinic-side pre-check with receipt-photo extraction |

Patient photos: 나비 is a bundled CC0 photo (scikit-image's "Chelsea"); the other patients' photos are
hot-linked from the Unsplash CDN (`frontend/src/brand/pets.js`), with a species-glyph fallback offline.

## How the claims engine works

```
receipt photo ──► extract (Claude, transcription only) ──► Claim
                                                            │
       codebook: invoice text → NVP procedure / NVD diagnosis codes
       knowledge: Korean brand/ingredient → drug, therapeutic class, dose refs
                                                            │
     ┌──────────── rules (deterministic, every finding carries evidence) ───────────┐
     │ coverage   waiting period · exclusions · non-medical items · payable         │
     │ clinical   procedure↔diagnosis · undisclosed chronic condition · species     │
     │            safety · NSAID combos · dose vs reference                         │
     │ pricing    clinic's posted fee · regional percentile · quantity              │
     │ integrity  duplicates · species/identity mismatch · time bar                 │
     └──────────────────────────────────────────────────────────────────────────────┘
                                                            │
                     decision: auto_approve | review | deny_recommended
                     (never auto-denies; an adjuster confirms)
```

Code lives in `backend/claims/`. The API is in `backend/routers/claims.py`.

## Run it

```bash
# backend (no database needed; drugs load from local JSONL)
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
python -m pytest -q tests            # 51 tests incl. synthetic recall gate

# frontend
cd frontend
npm ci
VITE_API_URL=http://localhost:8000 npm run dev
```

**Optional:**
- `ANTHROPIC_API_KEY` enables receipt extraction (`POST /api/claims/extract`).
- `DATABASE_URL` enables accounts and patient records.
- `NUVOVET_ENV=production` requires `NUVOVET_SECRET_KEY`.
- `NUVOVET_ADMIN_PASSWORD` seeds an admin account.
- `NUVOVET_CORS_ORIGINS` restricts CORS.

The console falls back to a static snapshot of the synthetic batch when the API is unreachable. Regenerate it after engine changes:

```bash
cd backend && python scripts/export_claims_demo.py
```

## API

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/claims/adjudicate` | claim (+ policy, history) → decision, payable, findings |
| POST | `/api/claims/precheck` | clinic-side check before submission |
| POST | `/api/claims/extract` | receipt image → claim draft |
| GET | `/api/claims/demo`, `/api/claims/demo/{id}` | adjudicated synthetic batch |
| GET | `/api/claims/evaluation` | recall / false-alarm on labelled synthetic claims |
| GET | `/api/claims/codes` | procedure and diagnosis codebooks |
| GET | `/api/drugs/search` | drug search (Korean and English) |

## Data provenance (read before any commercial use)

See [`docs/DATA_PROVENANCE.md`](docs/DATA_PROVENANCE.md). In short:
- The legacy drug records in `backend/data/converted/` were LLM-converted, largely from Plumb's Veterinary Drugs, whose licence forbids derivative works and AI use.
- They must be replaced by a clean-room rebuild before commercial use.
- The claims engine's own knowledge files are NuvoVet-authored, with public references. These are the therapeutic classes, Korean aliases, clinical rules and codebooks.
