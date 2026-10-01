# Project artifact compilation

UAI/WitForge treats historical project ZIPs, specifications, generated files, prompts/responses, model artifacts and source trees as **inputs with provenance**, not as authority.

The repository is public, so the default workflow inventories and hashes project artifacts locally without publishing raw chat exports, credentials, local state or unreviewed binary archives.

## Termux workflow

Place project material in one or more local staging folders, then run:

~~~bash
cd ~/UAI
npm install
npm run test:project-artifacts
npm run project:audit -- ~/UAI-project-artifacts
~~~

The default output is:

~~~text
state/project-artifact-inventory.json
~~~

That state file is intentionally ignored by Git. It contains SHA-256 hashes, sizes, classifications and sensitivity flags that can be reconciled against the repository and Chronicle/provenance records.

Multiple roots are supported:

~~~bash
npm run project:audit -- \
  ~/storage/downloads/UAI \
  ~/storage/downloads/WitForge \
  ~/storage/downloads/Chronicle
~~~

Use strict mode when preparing a publishable source set:

~~~bash
node scripts/project-artifact-audit.mjs ~/UAI-project-artifacts --strict
~~~

Strict mode returns a non-zero status when a path looks sensitive.

## Integration rules

1. ZIP files are hashed but are not executed or extracted automatically.
2. Raw prompts/responses and account exports are not published by default.
3. Files that look like tokens, passwords, sessions, cookies, private keys or environment files are flagged.
4. Model checkpoints remain separate from source-code claims. A checkpoint hash does not mean the model is production-ready.
5. A historical artifact is considered integrated only when it is preserved with provenance or mapped to a tested current implementation.
6. UAI-native code remains authoritative; preserved WitForge source stays behind the existing compatibility boundary until explicitly activated and verified.

This closes the tooling gap for reproducibly inventorying downloaded/library project material, but it does **not** by itself prove that every historical artifact has been reconciled. The lossless-integration audit remains the truth source for that claim.
