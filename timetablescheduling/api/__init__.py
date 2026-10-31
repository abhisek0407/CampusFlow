"""FastAPI + WebSocket layer around the existing CP-SAT scheduler (the ``scheduler`` package stays untouched).

The project root is put on ``sys.path`` so ``import scheduler`` always finds THIS project's package, even when uvicorn
is started from another directory (see the "wrong scheduler package" note in CLAUDE.md).
"""
import sys
from pathlib import Path

_ROOT = str(Path(__file__).resolve().parents[1])
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)
