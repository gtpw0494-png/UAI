# Release history

## v0.59.0 — Governed ForgeVision Runtime
- Added local image-caption candidate evaluation with ForgeLM embedding compatibility and regression thresholds.
- Added hash-bound, owner-approved ForgeVision promotion with atomic live checkpoint replacement and rollback snapshots.
- Added native ForgeVision-to-ForgeLM multimodal prefill so promoted visual tokens condition the same local ForgeLM transformer/cache used for text generation.
- Added runtime health that reports CONNECTED only when both promoted checkpoints load and their dimensions match.
- Added governed, path-bounded local vision inference API plus explicit request schemas and high-risk promotion/rollback authorization.
- Added lifecycle and multimodal runtime CI tests. No external AI model is used for the native vision path.

## v0.58.0 — Native ForgeVision Foundation
- Added a trainable local visual patch encoder with transformer blocks and a projector into ForgeLM hidden-state space.
- Added a local image-caption alignment trainer that learns against ForgeLM's own text embeddings; no external AI teacher/model is required.
- Added normalized native image embeddings, save/load checkpoint format and multimodal adapter primitives.
- Added explicit capability truth: architecture and local training are implemented, while semantic image inference remains UNAVAILABLE until a trained/evaluated ForgeVision checkpoint is explicitly promoted.
- Added authoritative CPU tests for shape, projection, gradient flow, save/load and normalized embeddings.
- Repaired the v0.57 RoPE source syntax defect uncovered by authoritative CI.

## v0.57.0 — Independent ForgeLM Native Context
- Removed external provider models from the core model router by default. External model routing is now an explicit compatibility/research opt-in through `IUV_ENABLE_EXTERNAL_MODEL_ROUTING=true`.
- Added ForgeLM-native long-context memory that chunks sources locally, embeds them with the promoted ForgeLM checkpoint, cosine-ranks relevant chunks and assembles bounded evidence context without any external model.
- Added RoPE position scaling to the ForgeLM transformer and new Termux/desktop long-context research presets.
- Added self-sufficient `long-context` inference through the local ForgeLM service, JavaScript bridge and model router.
- Added CPU tests that distinguish source-scale retrieval memory from the transformer's active attention window.
- Vision/image/audio/video generation remain separate native-model work; v0.57 does not claim those capabilities are locally complete.

## v0.56.0 — Frontier Model Fabric and Native ForgeLM Retrieval
- Corrected the cloud provider fabric so configured models can be routed before their first successful call while CONNECTED still requires runtime evidence.
- Added explicit local-vs-cloud OneChat routing; local/offline remains the default and cloud use requires an explicit request or configuration.
- Corrected Puter backend integration to the documented OpenAI-compatible endpoint and PUTER_AUTH_TOKEN contract.
- Added provider-native vision payloads, image generation, JSON-schema structured output, tool contracts, embeddings and Cohere reranking.
- Aligned the model catalog with GPT-6 Astra, GPT-5.3 Codex, GPT-5 Nano, GPT Image 2.5, Claude 5/4.8, Gemini 3.x, Grok 4.x, Cohere, Inference specialty, MiniMax and open-ecosystem aliases without treating catalog presence as availability.
- Added native normalized ForgeLM hidden-state embeddings and local cosine reranking using the promoted checkpoint.
- Added dedicated v0.56 frontier-provider regression tests and authoritative CI gating.
- Local ForgeLM vision/image/audio/video generation and frontier-scale long-context quality remain incomplete until trained modality components, data, compute and benchmark evidence exist.

## v0.55.0 — Governed Knowledge Autonomy and Candidate-First ForgeLM
- Added bounded approved-domain research scheduling with persistent process-bound state.
- Added independent-source corroboration and separate training-rights gates.
- Migrated verified knowledge to the existing SQLite/WAL platform-state database with legacy JSON migration.
- Added optional Postgres/PostgREST-compatible cloud durability with local-first fallback and mandatory local reverification on recovery.
- Changed ForgeLM CLI, Model Lab, OneChat and autonomous knowledge training to candidate-first operation.
- Added held-out knowledge and general regression comparison before owner-bound promotion, plus checkpoint hashing and rollback.
- Added authenticated HTTP and cumulative regression coverage for the v0.55 knowledge/model lifecycle.
- Status remains IMPLEMENTED_UNVERIFIED_REPO until authoritative exact-state CI passes.

## v0.54.0 — User-Owned Intelligence Plane
- Added typed local memory with explicit consent, inspectable source/reason, retention, expiry, training opt-in, deletion controls and optional AES-256-GCM at-rest protection.
- Added queryable provenance nodes/edges, lineage tracing, dry-run purge planning and memory deletion propagation without overstating full cross-store erasure.
- Added policy workflow simulation and richer final-call policy metadata/integrity proofs.
- Added model artifact hashing/signature verification and persistent evaluation/leaderboard records that do not confuse registration with runtime availability.
- Added OneChat, authenticated HTTP, dashboard and Termux surfaces plus dedicated system/integration tests.
- Full multimodal ingestion, dense neural retrieval/reranking, full cross-store provenance purge, production kernel sandbox isolation, encrypted multi-device sync and federated personalization remain incomplete.


## v0.53.0 — Persistent Agent Control Plane
- Migrated shadow runs/candidates and light patches/worktrees into dedicated SQLite tables while preserving v0.52 records through compatibility migration.
- Added persistent bounded `agent_jobs` scheduling with concurrency/queue limits, priority, TTL expiry, lease recovery and explicit worker dispatch.
- Added owner-governed control-plane HTTP routes, emergency-stop inheritance, explicit request schemas, Termux CLI commands and a live operations dashboard.
- Added deterministic unit and HTTP regression suites for storage migration, lease recovery, scheduler limits, dispatch, dashboard aggregation, worktree isolation and emergency-stop blocking.
- Added multi-query governed public-web research and an optional Brave Search path without claiming exhaustive web coverage.
- Shadow/light completion still cannot self-promote, self-deploy or merge protected `main`.


## v0.30.0
GitHub-ready cumulative checkpoint: dependency-free tokenizer core, GitHub Actions CI, repository ignore policy, and migration guidance.

## v0.29.0
Dependency-free sparse semantic-vector index in SQLite with cosine-ranked retrieval from OneChat. This is lexical-semantic vector retrieval, not a neural embedding claim.

## v0.28.0
Style-aware OASST dialogue retrieval with local deterministic style profiles (casual, technical, humorous, enthusiastic, short, question).

## v0.27.0
WordNet relationship graph import and OneChat lexical relationship queries (antonym, hypernym, hyponym, similar-to and other published pointer types).

# Cumulative build batch v0.13.0–v0.20.0

- **v0.13.0 — Data Fabric:** deterministic dataset v2, verification filtering, provenance, deduplication, train/validation splits and hashes.
- **v0.14.0 — Cached Inference:** absolute-position KV cache, top-p support and cached/uncached greedy equivalence benchmark.
- **v0.15.0 — Source Research:** architecture matrix, local reference-repository snapshot tool, model presets and strengthened doctrine metadata.
- **v0.16.0 — Trainer v2:** preset training, validation, resume checkpoints, gradient accumulation, warmup/cosine schedule and run manifests.
- **v0.17.0 — Model Lab:** OneChat collaboration connects dataset preparation, training, benchmarking and source analysis.
- **v0.18.0 — Learned Tokenizer:** SentencePiece BPE with action tokens, checkpoint-bound tokenizer metadata and byte fallback.
- **v0.19.0 — Advanced Objectives:** optional MoE balance regularization and future-token auxiliary objective with loss breakdowns.
- **v0.20.0 — Integrated Release:** hardware profiling, SHA-256 release integrity, full pipeline checkpoint promotion, portability cleanup and final live OneChat verification.

## v0.21.0 — Response Quality Gate
- Added governed response composer for the single OneChat surface.
- Ordinary conversation no longer returns bare retrieval-status strings as the primary response.
- Raw ForgeLM seed output is preserved as evidence but cannot become the primary reply by default.
- Added a model-output quality gate and `FORGELM_ALLOW_RAW_RESPONSES=1` opt-in for experimentation.
- Added regression tests for coherent greetings and suppression of control-token/gibberish output.

## v0.22.0 — Governed Web Corpus
- Added Web Research Agent behind the same OneChat input.
- Added explicit web source registry for Common Crawl, FineWeb, Wikimedia, Stack Exchange dump, direct URLs and public Git repositories.
- Direct URL ingestion records URL, retrieval time, digest, robots result, declared/verified license state and training eligibility.
- Private/local network targets are blocked by default.
- Unknown/unverified licenses are stored for research but are not automatically promoted into model training data.

## v0.23.0 — Bulk Web Corpus Import
- Streaming Common Crawl WET/WARC text importer.
- Streaming Wikimedia/MediaWiki XML(.bz2) importer.
- Streaming Stack Exchange Posts.xml importer.
- FineWeb-style JSONL and optional Parquet importer.
- Optional Hugging Face FineWeb streaming sampler using `datasets`.
- Every imported record carries source class, source ID/URL, digest, license policy and training-eligibility state.

## v0.24.0 — Web → ForgeLM Training Bridge
- ForgeLM dataset builder now consumes locally imported web records only when `trainingEligible=true`.
- Web license/source fields survive into dataset records and manifests.
- `FORGELM_MAX_WEB_RECORDS` bounds local memory use (default 5000) for Termux-scale runs.
- Tokenizer/training corpus is rebuilt from governed dataset-v2 rather than bypassing the dataset policy.
- Web Research Agent results participate in the same OneChat response composer.

## v0.25.0 — Capability Recovery
- Preserves the v0.24 OneChat response path as the protected working checkpoint.
- Replaces six core provider-chat capability slots with six governed public-source research capabilities for ForgeLM development. Provider API adapters remain available as optional compatibility integrations but are no longer counted as core intelligence capabilities.
- Adds official-Termux `python-torch` bootstrap support for ForgeLM train/infer/trainer activation.
- Adds optional LangGraph.js orchestration adapter and installer.
- Adds real configuration/probe adapters for Stripe subscription reads, Oxford Dictionaries API comparison and OctoPrint fabrication control.
- Adds capability probing via OneChat, API and CLI script.
- Keeps external credentials/hardware truth-gated: no adapter becomes CONNECTED merely because code exists.

## v0.26.0 — Language Data + SQLite Storage
- Added a high-volume SQLite storage database alongside the existing IUB record store.
- Added FTS5-backed definition and dialogue search with a fallback when FTS5 is unavailable.
- Added Princeton WordNet 3.0 definition downloader/importer with source/license provenance.
- Added OpenAssistant OASST1 conversation downloader/importer as the default free conversational/banter corpus.
- Added Lexicon Agent and Dialogue Agent behind the single OneChat input.
- Added OneChat commands for local definitions, banter/dialogue retrieval and storage status.
- Added training export of eligible WordNet definitions and OASST prompt/reply pairs into ForgeLM dataset-v2.
- DailyDialog is registered as research-only/not-default because its published CC BY-NC-SA 4.0 terms are more restrictive.

## v0.31.0 — Durable Task Ledger
- Added restart-safe task records with explicit state-transition history, step outputs and checkpoints.
- Added OneChat task planning/running/status/listing routes.

## v0.32.0 — Action Envelopes
- Added persistent action envelopes binding identity, intent, plan, capability scope, authority, security decision, execution, verification, recovery and audit lineage.
- Every TaskEngine run now receives an action-envelope ID.

## v0.33.0 — Recovery and Continuation
- Added explicit task resume and cancellation.
- Failed steps preserve their retry checkpoint; resume replaces the current result for that step only after real re-execution.
- Completed tasks cannot be cancelled retroactively.

## v0.34.0 — Availability Evidence + GitHub Privacy Boundary
- Added persisted availability snapshots with evidence classes separating connected runtime, configuration-only, registered-source and unavailable states.
- Added `/api/availability`, `/api/actions`, durable task APIs and OneChat `availability report`.
- Hardened public-repository ignore policy so local user/runtime data, checkpoints, generated training data and secrets do not enter GitHub.

## v0.35.0 — Persistent Policy + Approvals
- Added independent `ALLOW/DENY/ASK/ESCALATE/BLOCK` policy evaluation.
- Added persistent approval requests with expiry and explicit approve/deny decisions.
- Added OneChat and HTTP surfaces for policy/approval inspection and decisions.

## v0.36.0 — Scoped Autonomy Leases
- Added persistent, revocable autonomy leases with exact operation scope, risk ceiling, expiry and maximum-action budget.
- Autonomy leases do not grant credentials or bypass downstream policy/approval/security checks.
- Added OneChat and HTTP surfaces for lease grant/list/revoke/authorization checks.

## v0.37.0 — Transactional Governance Store
- Moved durable task/action/approval/autonomy records to SQLite WAL with optimistic compare-and-swap versions.
- Added legal task transition validation and event history.
- Uses native `node:sqlite` when available, with a Python SQLite fallback for older runtimes.

## v0.38.0 — Exact Approval Binding + Transfer Contracts
- Approval records now bind action envelope/task, operation, arguments, capability, actor and tool version to a SHA-256 digest.
- Added versioned transfer-envelope schema with integrity verification, idempotency field and byte limits.

## v0.39.0 — Plugin and Model Registry Boundaries
- Added validated plugin manifest schema, provenance hash and optional Ed25519 signature verification.
- Third-party plugin execution requires an explicit external sandbox and per-invocation policy/approval gate.
- Added model/runtime registry and truthful runtime detection for ForgeLM, llama.cpp/GGUF, Ollama, Transformers and ONNX Runtime.
- Added a local llama.cpp probe/chat adapter; remote model runtime endpoints are blocked by default.

## v0.40.0 — Quarantined Web Ingestion
- External content explicitly has no instruction authority.
- Added URL canonicalization, prompt-injection/PII/secret signals, global content deduplication and quarantine state.
- Separated retrieval eligibility from training eligibility.
- Bulk imports require explicit `--training-approved` in addition to source/license eligibility.

## v0.41.0 — Data Lifecycle + Hybrid Retrieval
- Added source retention, soft deletion and hard purge controls with retrieval/training exclusion.
- Upgraded local retrieval to hybrid FTS5 + sparse-vector ranking.
- Added recall@k/MRR evaluation utility.

## v0.42.0 — Learning Registry + Adversarial CI
- Added machine-readable learning-method registry covering causal pretraining, SFT, LoRA/QLoRA, DPO, RAG, continual replay, distillation, multimodal and federated status boundaries.
- Added adaptation prerequisite/planning CLI and deterministic continual-learning replay snapshots.
- Added security/adversarial tests for prompt injection, approval replay, transfer tampering, plugin validation and state-transition abuse.
- Expanded CI with Python compilation, contract/registry validation and public-repository privacy checks.


## v0.43.0 — Control-Plane Modernization
- Migrated AgentRegistry, accounts, subscriptions, legacy control plugins and availability evidence from direct JSON files to the transactional SQLite governance store.
- Added legacy JSON import/rename compatibility so existing local state is preserved.
- Added a tamper-evident SHA-256 audit chain; the first v0.43 record anchors the exact legacy audit prefix.
- Added `GET /api/audit/verify` and status-level audit integrity reporting.
- Added transactional plugin idempotency/replay protection with exact request hashing and key-collision denial.
- Added `Idempotency-Key` HTTP support for plugin execution.
- Generalized authoritative CI and release-manifest refresh from the retired v0.34 branch to all `build/*` branches.
- Added architecture/data-flow/plugin/model/security/operations documentation matching the target UAI blueprint.
- Added dedicated behavioral verification for migration, audit tamper detection, bounded agent capabilities and plugin exactly-once behavior.
## v0.44.0 — Governed Plugin Gateway
- Added operation-scoped plugin manifests with per-operation risk, schemas, capability requirements, secrets, idempotency and resource budgets.
- Added a single PluginGateway that performs input validation, destination allowlist checks, runtime-capability evidence checks, policy evaluation, exact approval validation and bounded autonomy before execution.
- Added a scoped plugin secret broker; only manifest-approved secret names can be requested and exact secret values are redacted from plugin output.
- Added SandboxRunner with minimal environment, temporary HOME/TMPDIR, timeout, cancellation and bounded output capture.
- HTTP plugin execution now forwards `Idempotency-Key` into transactional replay protection and accepts explicit operation names.
- Added dedicated adversarial/behavioral verification for schema rejection, allowlist denial, replay/collision behavior, approval mutation rejection, secret redaction, missing capability evidence, output-schema failure, output limits, timeout, cancellation and autonomy exhaustion.
- Hard OS-level filesystem/network/CPU/memory isolation remains external-sandbox dependent and is retained as PARTIAL rather than overstated.

## v0.45.0 — Provenance Document Data Plane
- Added a local SQLite/WAL document plane with canonical source identity, revision history, content hashes, immutable content-addressed text objects and deterministic chunks.
- Added explicit retrieval eligibility, source training eligibility and separate training approval.
- Added FTS5 document-chunk retrieval with source/document/chunk/revision provenance.
- Added citation-bearing OneChat document retrieval and document HTTP APIs.
- Governed direct-web ingestion now also persists into the provenance document plane and reports PARTIAL if that persistence step fails.
- Added soft deletion and hard purge behavior that removes searchable chunks and cleans unreferenced objects.
- Added direct storage and live HTTP/OneChat verification suites.
- Multimodal evidence locations, dense retrieval/reranking and the full cross-artifact provenance graph remain PARTIAL/future rather than being claimed complete.

## v0.48.2 — Main Repair and Runtime Truth Reconciliation
- Repaired cumulative self-development validation after the native OneChat greeting changed.
- Migrated legacy plugin/document/API HTTP tests to current email/password Owner enrollment, server-side sessions and CSRF-protected state changes.
- Added dedicated native-conversation tests for bounded chat continuity, llama.cpp preference, ForgeLM fallback and truthful no-runtime behavior.
- Added dedicated capability-truth tests for CONNECTED, CONFIGURED, REGISTERED_SOURCE, DEGRADED, UNAVAILABLE, BLOCKED and EXPIRED.
- Bound feature-evidence metadata to the package version and reject duplicate feature IDs.
- Replaced CI's obsolete bearer-token localhost smoke path with first-run Owner enrollment plus cookie/CSRF OneChat execution.
- Reconciled the v0.46-v0.48 runtime features into the feature-evidence ledger.
- First-run independent ownership proof remains PARTIAL; no stronger enrollment guarantee is claimed.

## v0.49.0 — Evidence-Native Model Routing
- Added a health-aware local model router with privacy/offline/task/modality/context constraints and recorded fallback attempts.
- Routed native conversation through the router while preserving ForgeLM/llama.cpp truth and fallback behavior.
- Added integrity-hashed evidence envelopes to OneChat answers.
- Added cited chunk excerpts to document-backed answer evidence.
- Added `explain answer` for structured evidence summaries without exposing chain-of-thought.
- Added stable browser chat IDs so live UI turns share conversation context.
- Added a truthful PARTIAL state for conversation rehydration after process restart.
- Added email/password owner bootstrap for local first run, explicit credential rotation for upgrades, active-session revocation, and explicit retirement tests for legacy bearer-owner tokens.



## v0.51.0 — Durable Conversation Rehydration
- Rehydrates recent persisted OneChat user/assistant turns for the same `chatId` after a process restart.
- Applies the existing context-token budget and 40-turn cap during restoration and keeps unrelated chat IDs isolated.
- Makes restored history available before follow-up intent classification and before local model routing/generation.
- Adds an auditable rehydration event and dedicated regression coverage in `verification/conversation-memory-v051.test.mjs`.


## v0.52.0 — Bounded Shadow R&D, Light Source Maintenance and Governance Protection
- Added bounded shadow-agent research/R&D infrastructure with explicit worker/resource budgets, persistent lifecycle state, quarantined candidates and disagreement-aware expansion signals.
- Added research, literature, model-evaluation, dataset-quality, retrieval, safety-red-team, architecture, experiment and synthesis profiles plus additional specialized research roles.
- Added bounded light-agent source-maintenance infrastructure with detached worktree creation, patch evidence, test/security/shadow review and rollback cleanup.
- Added explicit protected-governance rule declarations, emergency stop, local policy records, capability boundaries, audit-integrity facade and truthful trusted-device registry.
- Added owner-authenticated HTTP surfaces for shadow runs, light patches, promotion eligibility, emergency stop and trusted devices.
- Added a machine-readable platform roadmap catalog covering requested models, runtimes, learning approaches, retrieval/memory layers, plugins, connectors, tool abilities and evaluation metrics.
- Added `verification/shadow-light-v052.test.mjs` and authoritative CI integration.
- No shadow candidate self-deploys or directly enters training, no light agent can directly merge protected `main`, and incomplete multimodal/dense/federated/formal-verification/enterprise features remain explicitly non-complete.

