# IntraultUniversalion v0.34.0

A local-first, evidence-governed OneChat application with collaborating research, knowledge, development, learning, systems and ForgeLM agents.

## v0.31–v0.34 batch

- Durable task ledger with explicit lifecycle history and restart-safe state.
- Universal-style action envelopes linking identity, intent, scope, authority, execution, verification, recovery and audit lineage.
- Explicit task resume and cancellation; failed steps are re-executed only after an explicit resume request.
- Evidence-classed runtime availability snapshots rather than capability labels alone.
- Public GitHub privacy boundary that excludes user/runtime data, checkpoints, generated datasets and secrets.
- Existing v0.30 language intelligence, SQLite storage, capability truth, governed web ingestion, ForgeLM, self-development and rollback remain additive and intact.

The v0.34 implementation has passed the cumulative local regression suite and release-integrity checks. The GitHub branch is being populated from the protected v0.30 checkpoint; `main` remains the known-good baseline until the source-sync/CI gate is complete.
