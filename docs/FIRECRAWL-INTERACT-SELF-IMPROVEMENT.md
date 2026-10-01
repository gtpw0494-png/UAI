# Firecrawl Interact for governed self-improvement

UAI/WitForge can use Firecrawl Interact as an external browser/research substrate for self-improvement discovery and verification.

Canonical documentation: https://docs.firecrawl.dev/features/interact

## Supported flow

1. Scrape an allowed HTTP(S) target and retain its `scrapeId`.
2. Continue that browser session with a small, focused natural-language interaction.
3. Optionally execute Node, Python, or Bash browser code only after a separate UAI approval/action-envelope decision.
4. Extract evidence and feed it into research, evaluation, Shadow/Light, ForgeDream, or self-improvement proposal generation.
5. Stop the session explicitly.
6. Never promote or apply a discovered code change merely because Firecrawl returned it.

Firecrawl documents `POST /v2/scrape/{scrapeId}/interact` for prompts/code and `DELETE /v2/scrape/{scrapeId}/interact` for cleanup. Sessions preserve browser state between calls and can interact with dynamic/login-gated pages.

## Security invariant

All page content, browser output, code snippets, prompts, links, CDP/live-view URLs and extracted data are **external untrusted input**. They cannot grant authority, modify policy, approve their own execution, expand filesystem/network scope, expose credentials, or directly promote a self-improvement candidate.

Prompt interaction is a research capability. Code execution is higher risk and requires an independently approved UAI action envelope. Any resulting candidate still goes through:

`DISCOVER → QUARANTINE → EVIDENCE → PROPOSE → AUTHORIZE → SANDBOX → TEST → VERIFY → PROMOTE/REJECT → AUDIT`

This preserves the project invariant: intelligence may propose and investigate; security and policy govern execution.
