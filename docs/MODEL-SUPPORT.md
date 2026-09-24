# UAI Model Support

UAI separates model registration from runtime availability.

## Current model paths

### ForgeLM
Local PyTorch research model with:
- causal decoder architecture;
- train/save/load;
- tokenizer fallback;
- KV-cache inference;
- optional MoE/future-token objectives;
- CPU CI verification.

### llama.cpp
Local OpenAI-compatible runtime adapter. Localhost is allowed by default; remote endpoints are blocked unless explicitly enabled.

### Registry-only / runtime-conditional
The model registry may describe Ollama, Transformers, ONNX or GGUF artifacts without claiming those runtimes are connected.

## Target provider interface

Future providers should converge on:
- `generate()`
- `stream()`
- `embed()`
- `countTokens()`
- `health()`
- `capabilities()`

## Model routing inputs

The target router should consider:
- required capability;
- privacy classification;
- local-only policy;
- latency/resource budget;
- hardware availability;
- model evaluation evidence;
- fallback reason.

Every model call should record model/provider/version, prompt version, tokenization metadata, runtime parameters and latency.

## Training posture

Verified today:
- small local ForgeLM training;
- deterministic dataset construction;
- replay/regression foundations.

Partial/unavailable:
- production-scale distributed pretraining;
- LoRA/QLoRA/DPO execution;
- multimodal training;
- federated/private learning.

Those remain explicitly truth-gated.
