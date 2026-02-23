# Vet DUR Full-Stack Demo

A comprehensive Drug Utilization Review (DUR) system for veterinary medicine, featuring a React frontend and a rule-based Drug-Drug Interaction (DDI) engine.

## Project Structure

```
├── frontend/          # React application
│   ├── src/          # React source code
│   ├── index.html    # Main HTML file
│   ├── package.json  # Node.js dependencies
│   └── vite.config.js # Vite configuration
├── backend/          # DDI engine (Python)
│   ├── engine.py     # Main DDI logic
│   ├── data/         # Drug data files
│   ├── db/           # Database setup
│   └── .venv/        # Python virtual environment
├── docs/             # Documentation
│   ├── ARCHITECTURE.md
│   ├── COMPLETION_CHECKLIST.md
│   ├── NEW_README.md
│   ├── QUICKSTART.md
│   └── TRANSFORMATION.md
├── scripts/          # Utility scripts
│   └── run.sh        # DDI engine setup & test runner
└── README.md         # This file
```

## Quick Start

### Frontend (React App)
```bash
cd frontend
npm install
npm run dev
```

### Backend (DDI Engine)
```bash
./scripts/run.sh
```

## Components

### Frontend
- Modern React application with Vite
- Tailwind CSS for styling
- Veterinary DUR interface

### Backend
- Rule-based DDI engine for dogs
- PostgreSQL database
- 5 interaction rule families
- Extensible drug data structure

### Documentation
- Architecture overview
- Completion checklist
- Quick start guides
- Transformation notes

## Development

- Frontend: `cd frontend && npm run dev`
- Backend: `./scripts/run.sh` to setup and test
- Database: PostgreSQL in Docker container

## Adding New Drugs

1. Edit `backend/data/drugs.json`
2. Add new drug object (use `drug_template.json` as template)
3. Run `./scripts/run.sh` to reload database

See `backend/README.md` for detailed instructions.