#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent
SOURCES_PATH = ROOT / "knowledge_sources.json"

def load_sources() -> dict[str, Any]:
    return json.loads(SOURCES_PATH.read_text(encoding="utf-8"))

def verify_fact(claim: dict[str, Any], corroborating_sources: list[dict[str, Any]] | None = None) -> dict[str, Any]:
    trust = float(claim.get("trust", 0.0))
    sources = corroborating_sources or []
    support = 0
    for source in sources:
        if float(source.get("trust", 0.0)) >= 0.8:
            support += 1

    score = (support + 1) / max(1, len(sources) + 1)
    verified = trust >= 0.8 and score >= 0.75

    return {
        "verified": bool(verified),
        "confidence": round(max(0.0, min(1.0, score)), 4),
        "supporting_sources": len(sources),
        "source_trust": trust,
        "training_eligible": bool(verified),
        "reason": "accepted" if verified else "insufficient corroboration",
    }

def verify_batch(items: list[dict[str, Any]], source_registry: list[dict[str, Any]] | None = None) -> list[dict[str, Any]]:
    registry = source_registry or load_sources().get("sources", [])
    verified = []
    for item in items:
        claim = dict(item)
        support = [s for s in registry if s.get("id") == claim.get("source_id")]
        result = verify_fact(claim, support)
        claim["verification"] = result
        claim["training_eligible"] = result["training_eligible"]
        verified.append(claim)
    return verified

def filter_training_batch(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [item for item in items if item.get("training_eligible")]

if __name__ == "__main__":
    sample = [
        {
            "subject": "python",
            "claim": "Python is dynamically typed.",
            "source_id": "python-docs",
            "source_url": "https://docs.python.org/3/library/stdtypes.html",
            "trust": 0.98,
        }
    ]
    print(json.dumps(verify_batch(sample), indent=2, sort_keys=True))
