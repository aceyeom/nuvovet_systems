import os
import sys
from pathlib import Path

# Tests run against local JSONL data with no database configured.
for _var in ("DB_INTERNAL_URL", "DB_EXTERNAL_URL", "DB_URL", "DATABASE_URL", "NUVOVET_ENV"):
    os.environ.pop(_var, None)

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
