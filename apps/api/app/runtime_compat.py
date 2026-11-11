"""Supported CPython range and process settings for native libraries.

Python 3.14 (Homebrew's default python3 on recent Macs) can abort inside
FAISS, PyTorch, or sentence-transformers/loky during `make ingest`
(exit 134, plus a leaked-semaphore warning). Use 3.11–3.13 for those.
"""
from __future__ import annotations

import os
import sys

MIN_PY = (3, 11)
MAX_PY = (3, 13)  # inclusive


def python_minor() -> tuple[int, int]:
    return sys.version_info[0], sys.version_info[1]


def native_ml_supported() -> bool:
    return MIN_PY <= python_minor() <= MAX_PY


def unsupported_python_note(feature: str) -> str:
    v = ".".join(map(str, python_minor()))
    return (
        f"Python {v} is not supported yet for {feature}. "
        "On a Mac with Homebrew, install 3.13 and recreate the venv: "
        "`brew install python@3.13 && rm -rf apps/api/.venv && make setup`. "
        "Using a safe fallback until then."
    )


def configure_native_threads() -> None:
    """Limit BLAS/tokenizer/loky threads. Must run before those libraries import."""
    os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")
    os.environ.setdefault("OMP_NUM_THREADS", "1")
    os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")
    os.environ.setdefault("MKL_NUM_THREADS", "1")
    os.environ.setdefault("VECLIB_MAXIMUM_THREADS", "1")
    os.environ.setdefault("LOKY_MAX_CPU_COUNT", "1")
    os.environ.setdefault("JOBLIB_MULTIPROCESSING", "0")


configure_native_threads()
