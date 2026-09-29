# Universal Chronicle

Universal Chronicle is UAI's native system memory/log/recall substrate.

## Responsibilities

- append evidence-bearing runtime events without rewriting earlier events;
- preserve previous-event SHA-256 lineage;
- record persisted OneChat turns, evidence references and sanitized attachment metadata;
- create provenance nodes through the existing ProvenanceGraph;
- provide temporal recall, subject timelines and daily digests;
- remain distinct from consent-managed personal MemoryStore records;
- keep all Chronicle events training-ineligible by default.

## Runtime flow

```
OneChat / Actions / Knowledge / Devices
              |
              v
         ChronicleCenter
          /     |      \
    provenance recall  digest
         |       |       |
         +-------+-------+
                 |
             ForgeLM context
          (retrieval only unless
           separately approved)
```

## HTTP

Authenticated routes:

- `GET /api/chronicle/status`
- `GET /api/chronicle/recall?q=...`
- `GET /api/chronicle/timeline?subjectId=...`
- `GET /api/chronicle/digest?day=YYYY-MM-DD`

These routes are governed as `chronicle.read`. Any future mutation endpoint must be classified as `chronicle.write` and pass normal authorization.

## Memory boundary

Chronicle is not a bypass around user memory consent. MemoryStore continues to own explicit user-memory consent, retention, forgetting and purge semantics. Chronicle records operational/project history and may reference memory/provenance identifiers without silently creating personal memory records.

## Learning boundary

Chronicle records default to `trainingEligible: false`. Promotion into ForgeLM training material must pass the existing LearningFabric/knowledge-learning governance and verification requirements.
