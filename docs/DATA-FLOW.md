# UAI Data Flow

## Ingestion

```text
source
 -> fetch/import
 -> quarantine
 -> parse/normalize
 -> security signals
 -> provenance/license classification
 -> deduplication
 -> retrieval eligibility
 -> optional explicit training approval
 -> durable storage/index
```

Retrieval eligibility never implies training eligibility.

## Node/Python transfer contract

Cross-runtime messages use versioned integrity envelopes from `src/contracts.js` and `schemas/event-envelope.schema.json`.

Required properties include:
- schema version
- event type
- producer/consumer
- correlation ID
- provenance
- security labels
- retention policy
- payload
- SHA-256 integrity hash

## Retrieval

```text
query
 -> lexical FTS
 -> sparse semantic retrieval
 -> metadata/lifecycle filter
 -> ranking
 -> context assembly
 -> response
 -> evidence/citation layer
```

Current retrieval is FTS5 plus dependency-free sparse hashed vectors. Dense embeddings and neural reranking remain future/runtime-conditional additions.

## Training promotion

Training data is built only from approved sources:
- verified successful traces;
- explicitly eligible language records;
- web records with both `trainingEligible=true` and `trainingApproved=true`.

Raw conversations are not silently promoted.

## Deletion

Source lifecycle supports:
- retention metadata;
- soft deletion, which excludes records from retrieval;
- hard purge of source-backed language data.

Future document/chunk stores must preserve the same deletion semantics across indexes, datasets and derived artifacts.
