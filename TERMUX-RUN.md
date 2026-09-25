# Termux run — v0.49.0

## Owner email/password login

UAI v0.49 uses email/password owner login with server-side sessions and CSRF. Legacy owner bearer tokens are not accepted.

First local bootstrap:

```bash
cd ~/UAI
export UAI_OWNER_EMAIL="gtpw0494@gmail.com"
read -rsp 'Owner password: ' UAI_OWNER_PASSWORD; echo
export UAI_OWNER_PASSWORD
chmod +x scripts/run-owner-local.sh
./scripts/run-owner-local.sh
```

Existing installation credential rotation:

```bash
cd ~/UAI
export UAI_OWNER_EMAIL="gtpw0494@gmail.com"
read -rsp 'Owner password: ' UAI_OWNER_PASSWORD; echo
export UAI_OWNER_PASSWORD
node scripts/configure-owner.mjs --replace
unset UAI_OWNER_PASSWORD
npm start
```

The password is not committed to Git, stored in browser storage, or returned by the API. The governance database stores a salted scrypt verifier. Credential rotation revokes active owner sessions.

From the GitHub working copy:

```bash
cd ~/UAI
git pull origin main
pkg install -y python sqlite nodejs git curl
npm test
npm start
```

OneChat task lifecycle examples:

```text
plan task: research local model architecture
run task: research local model architecture
show tasks
task status task-<id>
resume task task-<id>
cancel task task-<id>
availability report
```

Language/storage operations remain:

```bash
npm run storage:init
npm run language:fetch
npm run language:export
npm run semantic:build
python3 storage/db.py related --term intelligence --relation hypernym
python3 storage/semantic.py search --query "machine intelligence" --kind all --limit 8
```

Tokenizer tooling remains Torch-independent:

```bash
python3 model/tokenizer.py status
python3 model/tokenizer.py train --corpus model/data/training-corpus.txt --vocab-size 1024 --engine auto
```

ForgeLM neural training still requires a compatible PyTorch runtime.

## v0.42 verification commands

```bash
cd ~/intraultuniversalion-v0.6.0/intraultuniversalion-v0.6.0
npm test
npm run test:security
python3 model/adaptation.py status
python3 storage/lifecycle.py status
python3 model/continual.py snapshot --limit 500
npm start
```

Useful OneChat checks:

```text
model registry
llama runtime status
observability metrics
data lifecycle
availability report
show approvals
show autonomy
```

To bulk-import web material for retrieval only, omit `--training-approved`. Add that flag only after source/license/security review when the records are genuinely approved for training.
