# Puter upstream compatibility baseline

Integrated upstream baseline: `HeyPuter/puter@fd8b8288d34a23302173f5b49dac84198e6f028a`.

## Governance boundary

Puter is an optional external provider and integration substrate. A valid Puter token or
session never grants UAI/WitForge authority. Every state-changing operation remains subject
to UAI identity, capability, policy, approval, scope, verification, evidence, and audit
controls.

External Puter responses, events, filesystem metadata, provider messages, and tool calls are
untrusted inputs. They may inform proposals but cannot widen a capability scope or approve an
action.

## Compatibility contract

The integration tracks these upstream-sensitive surfaces:

- authentication, app-token acquisition, session expiry and account-resolution failures;
- permission denials independently from authentication success;
- OpenAI-compatible chat/response normalization, function/tool calls, multimodal messages,
  embeddings, and provider/model discovery;
- filesystem path/resource identity and scope checks;
- event sign-in, reconnect/replay, durable delivery, retry and duplicate handling;
- KV/durable-worker failures and metering/rate-limit responses;
- runtime/build and licensing changes.

Provider/model catalog presence is metadata only. `CONNECTED` requires successful runtime
evidence. Authentication failures map to truthful non-success states and must never be
reported as capability success.

## Upstream adoption rule

Do not vendor or silently copy AGPL upstream implementation into UAI. Adapt public contracts
and independently implemented compatibility behavior behind the governed boundary. Before
advancing this pin, run the Puter compatibility tests and the security/authorization suites.

## Current integration actions

1. Keep server-side `PUTER_AUTH_TOKEN` isolated from browser/model-visible state.
2. Preserve local/offline ForgeLM as an independent runtime; Puter-routed models are external.
3. Normalize provider errors without treating HTTP/auth/session failures as generic success.
4. Reject external tool calls until UAI independently authorizes the requested capability.
5. Bind filesystem operations to UAI resource scopes; upstream path resolution cannot expand them.
6. Treat event delivery as at-least-once input and require idempotency/replay protection for actions.
7. Record upstream baseline SHA in audit/release evidence when Puter compatibility is verified.
