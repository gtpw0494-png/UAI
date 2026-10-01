# Forge Evolution Lab

Forge Evolution Lab connects five local-first experimental systems without granting them execution authority:

- **ForgeMuseum** preserves retired designs, failure evidence and explicit resurrection conditions. Resurrection is review-only.
- **ForgeCanary** creates synthetic user profiles and deterministic synthetic histories. It never uses real identities, real credentials or real-world effects.
- **ForgeRosetta** maps provider-specific interfaces into Universal Capability Language operations. A verified mapping is still proposal-only and cannot grant authority.
- **ForgeCurriculum** records capability scores and selects the next weak skill or prerequisite. It cannot start model training automatically.
- **ForgeDream** remains the isolated simulation lab. Canary scenarios may seed Dream worlds, but only verified successful Dream results become training-eligible.

The app exposes read/status information through the Innovation surface and authenticated state-changing routes under `/api/innovation/*`. All HTTP state changes remain subject to the existing owner authentication, CSRF, policy, emergency-stop and audit boundaries.

## Truth boundary

Source presence does not imply production verification. The combined subsystem is recorded as `IMPLEMENTED_UNVERIFIED_REPO` until authoritative repository CI and the dedicated verification test succeed on the exact commit.
