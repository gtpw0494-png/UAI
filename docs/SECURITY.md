# UAI Security Architecture

## Authority invariant

AI proposes. Policy, capability scope, approval and independent security checks authorize.

## Control boundaries

- External content has no instruction authority.
- Credentials stay outside model/plugin payloads unless a bounded adapter explicitly injects them.
- Capability registration is not connectivity.
- Plugin registration is not execution.
- Approval binds exact operation, arguments, actor, capability and tool version.
- Autonomy leases are scoped, expiring and revocable.
- Critical/physical/destructive actions require stronger authorization.

## Evidence integrity

v0.43 audit records form a SHA-256 hash chain. Existing legacy audit lines are not rewritten; the first v0.43 record anchors the exact legacy prefix digest. Subsequent tampering is detected by `AuditLog.verify()`.

The HTTP surface exposes `GET /api/audit/verify`.

## Replay protection

Plugin execution supports transactional idempotency:
- identical request/key -> stored result, no second execution;
- different request/same key -> DENIED;
- concurrent duplicate -> BLOCKED.

## Public repository boundary

Tracked files must not include:
- secrets or .env files;
- mutable state databases;
- local knowledge DBs;
- checkpoints/runs/tokenizers;
- vendor data/reference clones.

Authoritative CI scans this boundary.

## Known security work still ahead

- policy-as-data and declarative transition rules;
- full capability checks before every adapter invocation;
- hardened OS-level sandbox profiles;
- secret broker with narrowly scoped injection;
- encrypted-at-rest options;
- systematic dependency/secret scanning;
- stronger identity/session layer for multi-user deployments.
