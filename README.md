# IntraultUniversalion v0.43.0

A local-first, evidence-governed OneChat platform combining durable agent orchestration, governed data ingestion, local knowledge/retrieval, ForgeLM research/training foundations and explicit capability truth.

## v0.43 control-plane modernization

- Agent, account, subscription, control-plugin and availability registries now persist through transactional SQLite governance storage with legacy JSON migration.
- Audit records now use a tamper-evident SHA-256 chain that anchors pre-v0.43 legacy audit bytes without rewriting them.
- Plugin execution now supports transactional idempotency/replay protection.
- CI and release-manifest automation now apply generically to future `build/*` branches.
- Added architecture, data-flow, plugin SDK, model-support, security and operations contracts aligned with the UAI blueprint.
- SQLite WAL governance persistence with optimistic concurrency and legal task-state transitions.
- Exact-operation approval binding over action, arguments, capability, actor and tool version.
- Versioned Node/Python/tool transfer envelopes with integrity hashes and size limits.
- Signed plugin-manifest contract and external-sandbox execution boundary.
- Model/runtime registry for ForgeLM, GGUF/llama.cpp, Ollama, Transformers and ONNX without confusing registry presence with runtime availability.
- Web-content quarantine, prompt-injection/PII/secret signals, canonical URLs, global dedupe and explicit training promotion.
- Retrieval/training separation: web records require both eligibility and explicit training approval.
- Data retention, soft deletion and hard source purge hooks.
- Hybrid SQLite FTS5 + sparse semantic retrieval and retrieval-evaluation tooling.
- Runtime-conditional LoRA/QLoRA/DPO registry plus replay/regression foundations for continual learning.
- Expanded adversarial CI and public-repository privacy checks.

Existing OneChat, ForgeLM, WordNet/OASST storage, capability truth, source research, self-development, rollback, approvals and bounded autonomy remain additive.

Run `npm test`, `npm run test:security`, and `npm run test:control-plane`, then `npm start`.

See `docs/ARCHITECTURE.md`, `docs/DATA-FLOW.md`, `docs/SECURITY.md`, `docs/PLUGIN-SDK.md`, `docs/MODEL-SUPPORT.md`, and `docs/OPERATIONS.md`.
