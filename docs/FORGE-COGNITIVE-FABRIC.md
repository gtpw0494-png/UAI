# Forge Cognitive Fabric / ForgeNGN

Version target: **0.78.0**. This is an additive experimental layer; the verified ForgeLM core remains the production baseline until separate promotion succeeds.

## Components

- **ForgeNGN — Neural Gearing Network**: seeded random-DAG compute gears, causal attention, temporal leaky mixing, event-like Pulse Gates, soft/hard clutch routing, compute regularization, candidate-only structural growth and pathway consolidation.
- **Capability Confidence Router**: separates model, evidence and execution confidence. `VERIFIED` requires independent verification; confidence never grants authority.
- **Evidence-Gain Scout**: ranks candidate observations by expected information gain vs cost. `readOnlyClaim` is metadata, never trusted permission.
- **Evidence Portfolio Optimizer**: selects a small non-redundant set of observations under a cost/probe budget.
- **Forge Cognitive Fabric**: combines those outputs into advisory analysis while preserving the UAI governance path.

## Governance boundary

Neural and heuristic outputs may propose confidence, capability hypotheses, evidence probes, compute gears and growth candidates. They may not grant a capability, mark evidence verified, approve an action, bypass policy, mint a scoped token, mutate the live model topology or promote a model artifact.

Runtime path:

`OneChat → ForgeLM/ForgeNGN candidate → claim/evidence truth → confidence/evidence planning → Decision Proof → Policy Engine → Capability Firewall → approval/scoped token → execution → independent verification`

Growth path:

`metrics → GrowthPlanner → ForgeDream → ForgeCanary → held-out evaluation → ForgeCurriculum → governed model promotion → signed artifact`

## Truth status

Source code and tests in this build make the subsystem `IMPLEMENTED_UNVERIFIED_REPO` until authoritative CI passes on the exact integration commit. Even after repository CI, ForgeNGN remains a candidate architecture until trained/evaluated and explicitly promoted by the existing model lifecycle.

## Termux

```bash
cd ~/UAI
python3 model/test_neural_gearing.py
python3 model/test_cognitive_learning_heads.py
node verification/forge-cognitive-fabric.test.mjs
python3 model/train_neural_gearing.py --steps 10 --device cpu
npm test
```
