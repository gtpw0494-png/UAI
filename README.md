# IntraultUniversalion v0.36.0

A local-first, evidence-governed OneChat application with collaborating research, knowledge, development, learning, systems and ForgeLM agents.

## v0.31–v0.36 batch

- Durable task ledger and action-envelope persistence.
- Explicit resume/cancel recovery paths and evidence-classed availability snapshots.
- Independent policy decisions: `ALLOW`, `DENY`, `ASK`, `ESCALATE`, `BLOCK`.
- Persistent approval requests/decisions with expiry.
- Scoped, expiring autonomy leases with risk ceilings and action limits.
- Public GitHub privacy boundary excludes runtime/user state, checkpoints, generated datasets and secrets.
- Existing OneChat, ForgeLM, SQLite language data, web research, capability truth and self-development remain additive.

The complete v0.36 implementation passes the cumulative local regression suite. This GitHub build branch is intentionally kept separate from `main` until the full protected v0.30 source checkpoint is synchronized and CI can validate the repository itself.
