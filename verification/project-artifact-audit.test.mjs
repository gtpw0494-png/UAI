import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildInventory } from '../scripts/project-artifact-audit.mjs';

const root = await mkdtemp(path.join(os.tmpdir(), 'artifact-audit-test-'));
await mkdir(path.join(root, 'WitForge'), { recursive: true });
await writeFile(path.join(root, 'WitForge', 'Witforge.txt'), 'spec\n');
await writeFile(path.join(root, 'WitForge', 'ForgeLM-v2.26.0.zip'), 'not-a-real-zip-but-a-stable-test-payload');
await writeFile(path.join(root, 'WitForge', 'owner-token.txt'), 'do-not-publish');
await writeFile(path.join(root, 'unrelated.txt'), 'ignore me');

const inventory = await buildInventory([root]);
assert.equal(inventory.schema, 'uai.project-artifact-inventory.v1');
assert.equal(inventory.summary.totalFiles, 3);
assert.equal(inventory.summary.archives, 1);
assert.equal(inventory.summary.documents, 2);
assert.equal(inventory.summary.sensitiveFiles, 1);
assert.equal(inventory.entries.some(x => x.relativePath === 'unrelated.txt'), false);
assert.equal(inventory.entries.every(x => /^[0-9a-f]{64}$/.test(x.sha256)), true);
assert.equal(inventory.entries.find(x => x.relativePath.endsWith('owner-token.txt')).sensitive, true);
assert.equal(inventory.policy.rawPromptsAndChatsPublishedByDefault, false);

const allInventory = await buildInventory([root], { includeAll: true });
assert.equal(allInventory.summary.totalFiles, 4);

console.log('Project artifact audit tests passed');
