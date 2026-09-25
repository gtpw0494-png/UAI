#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable

ROOT = Path(__file__).resolve().parent
SOURCES_PATH = ROOT / "knowledge_sources.json"

@dataclass
class FactCandidate:
    subject: str
    claim: str
    source_id: str
    source_url: str
    source_domain: str
    trust: float
    kind: str = "fact"
    timestamp: str | None = None
    metadata: dict[str, Any] | None = None

    def fact_id(self) -> str:
        raw = f"{self.subject}|{self.claim}|{self.source_id}|{self.source_url}"
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

    def to_dict(self) -> dict[str, Any]:
        return {
            "subject": self.subject,
            "claim": self.claim,
            "source_id": self.source_id,
            "source_url": self.source_url,
            "source_domain": self.source_domain,
            "trust": float(self.trust),
            "kind": self.kind,
            "timestamp": self.timestamp,
            "metadata": dict(self.metadata or {}),
            "fact_id": self.fact_id(),
        }

def load_sources() -> list[dict[str, Any]]:
    data = json.loads(SOURCES_PATH.read_text(encoding="utf-8"))
    return data.get("sources", [])

def allowed_sources() -> list[dict[str, Any]]:
    return [s for s in load_sources() if bool(s.get("allowed"))]

def normalize_text(value: Any) -> str:
    text = str(value or "").strip()
    return re.sub(r"\s+", " ", text)

def build_fact(subject: str, claim: str, source_id: str, source_url: str, trust: float, *, kind: str = "fact", metadata: dict[str, Any] | None = None, timestamp: str | None = None) -> FactCandidate:
    domain = source_url.split("/")[2] if "://" in source_url else source_id
    return FactCandidate(
        subject=normalize_text(subject),
        claim=normalize_text(claim),
        source_id=source_id,
        source_url=source_url,
        source_domain=domain,
        trust=float(trust),
        kind=kind,
        timestamp=timestamp,
        metadata=metadata or {},
    )

def normalize_candidates(items: Iterable[dict[str, Any]]) -> list[FactCandidate]:
    out = []
    for item in items:
        if not item.get("claim") or not item.get("subject"):
            continue
        out.append(
            build_fact(
                subject=item.get("subject"),
                claim=item.get("claim"),
                source_id=item.get("source_id") or "unknown",
                source_url=item.get("source_url") or "https://example.invalid",
                trust=float(item.get("trust", 0.0)),
                kind=item.get("kind", "fact"),
                metadata=item.get("metadata"),
                timestamp=item.get("timestamp"),
            )
        )
    return out

def filter_eligible_candidates(items: Iterable[FactCandidate], minimum_trust: float = 0.8) -> list[dict[str, Any]]:
    out = []
    for fact in items:
        if fact.trust >= minimum_trust:
            out.append(fact.to_dict())
    return out

def batch_from_sources(items: Iterable[dict[str, Any]], minimum_trust: float = 0.8) -> list[dict[str, Any]]:
    cleaned = normalize_candidates(items)
    return filter_eligible_candidates(cleaned, minimum_trust=minimum_trust)

def ingest_batch(items: Iterable[dict[str, Any]]) -> dict[str, Any]:
    batch = batch_from_sources(items, minimum_trust=0.8)
    return {
        "state": "SUCCESS",
        "count": len(batch),
        "batch": batch,
        "approved_sources": [s["id"] for s in allowed_sources()],
    }

if __name__ == "__main__":
    demo = [
        {
            "subject": "python",
            "claim": "Python is dynamically typed.",
            "source_id": "python-docs",
            "source_url": "https://docs.python.org/3/library/stdtypes.html",
            "trust": 0.98,
            "timestamp": "2026-09-25T00:00:00Z",
        },
        {
            "subject": "javascript",
            "claim": "JavaScript is a scripting language for the web.",
            "source_id": "github-docs",
            "source_url": "https://docs.github.com/en/get-started/starting-with-web-development",
            "trust": 0.95,
            "timestamp": "2026-09-25T00:00:00Z",
        },
    ]
    print(json.dumps(ingest_batch(demo), indent=2, sort_keys=True))
