# IntraultUniversalion v0.49.0

A local-first, evidence-governed OneChat platform combining durable agent orchestration, governed data ingestion, local knowledge/retrieval, ForgeLM research/training foundations and explicit capability truth.

## v0.49 evidence-native model routing

### Owner email/password bootstrap and rotation

- Legacy bearer-owner authentication is retired; protected API routes authenticate through the local owner session.
- First-run credentials can be provisioned from local environment variables without committing plaintext credentials.
- Existing installations can explicitly rotate the owner email/password from the local shell; active sessions are revoked after rotation.
- The browser uses normal email/password login, server-side session cookies and CSRF for state-changing requests.
- Plaintext owner passwords are not stored in Git, browser storage or API responses.


- Native conversation now routes through a health-aware local model router rather than hard-coding a single runtime path.
- The router filters by privacy, offline mode, task, modality and context constraints, ranks connected candidates and records fallback attempts.
- Unusable model output can trigger fallback to the next eligible runtime instead of blocking the turn.
- Every OneChat reply now carries an integrity-hashed evidence envelope with claim support state, model route, tool summary and source/chunk citations when available.
- `explain answer` returns structured evidence for the previous answer in the same chat without exposing private chain-of-thought.
- The browser now keeps a stable per-tab `chatId`, making live conversational continuity real instead of generating a new chat ID for each message.
- Full conversation-context rehydration after process restart remains PARTIAL.

## v0.48.2 repaired conversation/security checkpoint

- First-run local Owner enrollment uses email/password credentials, scrypt-derived password hashes, server-side sessions, HttpOnly session cookies and CSRF validation for cookie-authenticated state changes.
- The HTTP authorization layer applies route schemas, local identity, per-route rate limits, policy decisions, exact approval binding, request/correlation IDs and audited actor identity.
- Native OneChat conversation routing keeps bounded per-chat context, prefers a connected local llama.cpp runtime and falls back to a verified ForgeLM runtime.
- Capability truth now has explicit CONNECTED, CONFIGURED, REGISTERED_SOURCE, DEGRADED, UNAVAILABLE, BLOCKED and EXPIRED states.
- Regression tests now verify behavior rather than obsolete literal greeting text, and all live HTTP system tests authenticate through the current Owner session flow.
- First-run enrollment is localhost-oriented and closes after successful enrollment, but independent trusted-device/bootstrap ownership proof remains PARTIAL and is not overstated.

## v0.45 provenance document data plane

- Content-addressed local document objects with canonical URIs, document revisions and deterministic chunks.
- Explicit retrieval eligibility, source training eligibility and separate training approval.
- FTS5 document retrieval with source/document/chunk/revision provenance.
- Citation-bearing OneChat evidence responses for document search.
- Governed web ingestion now also persists into the document plane and reports PARTIAL if provenance persistence fails.
- Soft deletion and hard purge remove searchable chunks and clean unreferenced content objects.
- Multimodal location metadata, dense reranking and the full cross-artifact provenance graph remain PARTIAL/future.

## v0.44 governed plugin gateway

- Operation-scoped plugin manifests with input/output schemas, risk, capabilities, secrets, idempotency and resource budgets.
- HTTP plugin execution now flows through a single governed gateway.
- Exact policy/approval binding is evaluated per operation.
- Optional autonomy leases are consumed only for policy-allowed operations and are not consumed by idempotent replays.
- Plugin inputs are checked against declared network-destination allowlists.
- Only explicitly declared secrets are injected; returned secret values are redacted from results/log output.
- Sandbox execution uses a minimal environment, isolated temporary HOME/TMPDIR, timeout/cancellation and output-byte limits.
- Runtime capability requirements must have CONNECTED + executable evidence.
- OS/kernel-level filesystem, network, CPU and memory isolation remains dependent on the configured external sandbox and is not falsely claimed as host-enforced.

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

Run `npm test`, `npm run test:security`, `npm run test:control-plane`, `npm run test:plugin-gateway`, `npm run test:plugin-http`, `npm run test:document-data`, `npm run test:document-http`, `npm run test:api-security`, and `npm run test:conversation-capability`, then `npm start`.

See `docs/ARCHITECTURE.md`, `docs/DATA-FLOW.md`, `docs/SECURITY.md`, `docs/PLUGIN-SDK.md`, `docs/MODEL-SUPPORT.md`, and `docs/OPERATIONS.md`.
