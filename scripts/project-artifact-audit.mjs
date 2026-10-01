import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT_RE = /(uai|intraultuniversalion|witforge|forgelm|chronicle|snake[-_ ]?(lab|overwatch)?)/i;
const SENSITIVE_RE = /(^|[._-])(secret|secrets|token|tokens|password|passwd|credential|credentials|session|cookie|cookies|private[-_ ]?key|api[-_ ]?key)([._-]|$)|(^|\/)\.env($|\.)|\.(pem|key|p12|pfx)$/i;
const SKIP_DIRS = new Set(['.git', 'node_modules', '__pycache__', '.venv', 'venv']);

function sha256File(filePath) {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(filePath);
    stream.on('error', reject);
    stream.on('data', chunk => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

function classify(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.zip') return 'archive';
  if (['.md', '.txt', '.docx', '.pdf', '.json', '.yaml', '.yml'].includes(ext)) return 'document';
  if (['.js', '.mjs', '.cjs', '.ts', '.tsx', '.py', '.sh', '.html', '.css'].includes(ext)) return 'source';
  if (['.pt', '.pth', '.bin', '.gguf', '.onnx', '.safetensors'].includes(ext)) return 'model-artifact';
  return 'other';
}

async function walk(root, current = root, out = []) {
  const entries = await readdir(current, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(current, entry.name);
    if (entry.isDirectory()) {
      await walk(root, full, out);
      continue;
    }
    if (!entry.isFile()) continue;
    const info = await stat(full);
    const relativePath = path.relative(root, full).split(path.sep).join('/');
    out.push({
      relativePath,
      sizeBytes: info.size,
      kind: classify(relativePath),
      sensitive: SENSITIVE_RE.test(relativePath),
      projectRelevant: PROJECT_RE.test(relativePath) || PROJECT_RE.test(path.basename(root)),
      sha256: await sha256File(full),
    });
  }
  return out;
}

export async function buildInventory(roots, { includeAll = false } = {}) {
  if (!Array.isArray(roots) || roots.length === 0) throw new Error('At least one artifact root is required.');
  const rootRecords = [];
  const entries = [];
  for (const rawRoot of roots) {
    const root = path.resolve(rawRoot);
    const info = await stat(root).catch(() => null);
    if (!info?.isDirectory()) throw new Error('Artifact root is not a directory: ' + rawRoot);
    const rootLabel = path.basename(root) || 'root';
    const rootEntries = await walk(root);
    const selected = includeAll ? rootEntries : rootEntries.filter(item => item.projectRelevant);
    rootRecords.push({ label: rootLabel, scannedFiles: rootEntries.length, selectedFiles: selected.length });
    for (const item of selected) entries.push({ root: rootLabel, ...item });
  }
  entries.sort((a, b) => (a.root + '/' + a.relativePath).localeCompare(b.root + '/' + b.relativePath));
  const summary = {
    totalFiles: entries.length,
    archives: entries.filter(x => x.kind === 'archive').length,
    sourceFiles: entries.filter(x => x.kind === 'source').length,
    documents: entries.filter(x => x.kind === 'document').length,
    modelArtifacts: entries.filter(x => x.kind === 'model-artifact').length,
    sensitiveFiles: entries.filter(x => x.sensitive).length,
  };
  return {
    schema: 'uai.project-artifact-inventory.v1',
    createdAt: new Date().toISOString(),
    policy: {
      rawPromptsAndChatsPublishedByDefault: false,
      archivesExecutedOrExtractedByDefault: false,
      secretsPublishedByDefault: false,
      note: 'Inventory and hashes establish provenance. Publication or activation requires explicit review and existing UAI governance.',
    },
    roots: rootRecords,
    summary,
    entries,
  };
}

function parseArgs(argv) {
  const roots = [];
  let output = 'state/project-artifact-inventory.json';
  let includeAll = false;
  let strict = false;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--output') {
      output = argv[++i];
      if (!output) throw new Error('--output requires a path');
    } else if (arg === '--all') {
      includeAll = true;
    } else if (arg === '--strict') {
      strict = true;
    } else {
      roots.push(arg);
    }
  }
  if (roots.length === 0) {
    const envRoots = (process.env.UAI_PROJECT_ARTIFACT_ROOTS || '')
      .split(path.delimiter)
      .map(x => x.trim())
      .filter(Boolean);
    roots.push(...envRoots);
  }
  return { roots, output, includeAll, strict };
}

export async function main(argv = process.argv.slice(2)) {
  const { roots, output, includeAll, strict } = parseArgs(argv);
  if (roots.length === 0) {
    console.error('Usage: node scripts/project-artifact-audit.mjs <artifact-root> [more-roots] [--output file] [--all] [--strict]');
    console.error('Or set UAI_PROJECT_ARTIFACT_ROOTS using ' + JSON.stringify(path.delimiter) + ' as the separator.');
    return 2;
  }
  const inventory = await buildInventory(roots, { includeAll });
  const outputPath = path.resolve(output);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(inventory, null, 2) + '\n', 'utf8');
  console.log('Project artifact inventory: ' + inventory.summary.totalFiles + ' file(s), ' + inventory.summary.archives + ' archive(s), ' + inventory.summary.sensitiveFiles + ' sensitive path(s).');
  console.log('Wrote ' + outputPath);
  if (strict && inventory.summary.sensitiveFiles > 0) {
    console.error('Strict mode failed because potentially sensitive paths were found.');
    return 3;
  }
  return 0;
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  const code = await main();
  process.exitCode = code;
}
