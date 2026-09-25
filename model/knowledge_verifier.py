#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
from collections import defaultdict
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent
SOURCES_PATH = ROOT / "knowledge_sources.json"

def load_sources() -> list[dict[str, Any]]:
    return json.loads(SOURCES_PATH.read_text(encoding="utf-8")).get("sources", [])

def _host(url: str) -> str:
    try:
        return (urlparse(str(url)).hostname or "").lower()
    except Exception:
        return ""

def _domain_matches(host: str, domain: str) -> bool:
    domain = str(domain or "").lower()
    return bool(host and domain and (host == domain or host.endswith("." + domain)))

def _claim_key(item: dict[str, Any]) -> str:
    subject = " ".join(str(item.get("subject") or "").split()).lower()
    claim = " ".join(str(item.get("claim") or "").split()).lower()
    return hashlib.sha256(f"{subject}|{claim}".encode("utf-8")).hexdigest()

def verify_batch(
    items: list[dict[str, Any]],
    source_registry: list[dict[str, Any]] | None = None,
    *,
    min_trust: float = 0.8,
    min_independent_sources: int = 2,
) -> list[dict[str, Any]]:
    registry = source_registry or load_sources()
    allowed = {str(s.get("id")): s for s in registry if bool(s.get("allowed"))}
    groups: dict[str, list[dict[str, Any]]] = defaultdict(list)

    for raw in items:
        subject = " ".join(str(raw.get("subject") or "").split())
        claim = " ".join(str(raw.get("claim") or "").split())
        if not subject or not claim:
            continue
        source_id = str(raw.get("source_id") or "")
        source = allowed.get(source_id)
        source_url = str(raw.get("source_url") or "")
        host = _host(source_url)
        valid = bool(source and _domain_matches(host, str(source.get("domain") or "")))
        groups[_claim_key(raw)].append({
            "subject": subject,
            "claim": claim,
            "source_id": source_id,
            "source_url": source_url,
            "source_valid": valid,
            "source_trust": float(source.get("trust", 0.0)) if valid else 0.0,
            "metadata": raw.get("metadata") if isinstance(raw.get("metadata"), dict) else {},
            "observed_at": raw.get("observed_at") or raw.get("timestamp"),
            "content_hash": raw.get("content_hash"),
        })

    out: list[dict[str, Any]] = []
    for claim_hash, group in groups.items():
        support = [x for x in group if x["source_valid"] and x["source_trust"] >= min_trust]
        independent = sorted({x["source_id"] for x in support})
        verified = len(independent) >= min_independent_sources
        primary = sorted(support or group, key=lambda x: x["source_trust"], reverse=True)[0]
        out.append({
            **primary,
            "claim_hash": claim_hash,
            "corroboration": len(independent),
            "supporting_sources": [
                {
                    "source_id": x["source_id"],
                    "source_url": x["source_url"],
                    "trust": x["source_trust"],
                    "content_hash": x.get("content_hash"),
                }
                for x in support
            ],
            "verification": {
                "verified": verified,
                "method": "independent-approved-source-corroboration",
                "required_sources": min_independent_sources,
                "independent_sources": len(independent),
            },
            "training_eligible": verified,
        })
    return out

def filter_training_batch(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [
        item for item in items
        if item.get("training_eligible") is True
        and item.get("verification", {}).get("verified") is True
    ]

if __name__ == "__main__":
    print(json.dumps({
        "state": "SUCCESS",
        "policy": "caller trust is ignored; registry trust and independent corroboration are required",
        "verified": verify_batch([]),
    }, indent=2, sort_keys=True))
