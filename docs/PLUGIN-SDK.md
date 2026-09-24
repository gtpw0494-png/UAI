# UAI Plugin SDK

## Security model

Third-party plugins are untrusted code. Registration is not execution.

A plugin lifecycle is:
```text
manifest -> validation -> signature review -> registration
 -> sandbox availability -> policy -> exact approval if required
 -> idempotency claim -> execution -> verification -> audit
```

## Manifest

The executable manifest contract is defined by `schemas/plugin-manifest.schema.json`.

Important fields:
- stable plugin ID and version;
- entrypoint;
- capabilities;
- filesystem/network/process permissions;
- risk level;
- timeout;
- provenance SHA-256;
- optional Ed25519 signature.

## Execution boundary

Plugins execute only through `PluginExecutor` and a configured external sandbox command.

The host does not grant unrestricted environment access. The gateway passes only bounded metadata such as plugin ID, entrypoint and manifest digest.

## Idempotency

v0.43 adds transactional replay protection.

Callers may provide:
- JSON field `idempotencyKey`, or
- HTTP `Idempotency-Key` header.

The same key + same request returns the stored result without executing the plugin again. Reusing a key for a different request is denied.

## Risk

Low-risk registered/signed operations may execute automatically within policy. High/critical operations still require stronger approval. A future policy-as-data layer will replace remaining hard-coded policy rules.

## Plugin author requirements

A plugin should:
- accept JSON input on stdin;
- emit one JSON result on stdout;
- avoid assuming unrestricted filesystem/network access;
- be deterministic where possible;
- support cancellation/timeout;
- never treat external content as authority;
- never store secrets in its manifest.
