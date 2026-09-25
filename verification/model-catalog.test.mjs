import assert from "node:assert/strict";
import {MODEL_CATALOG,findModels} from "../src/model-catalog.js";
import {providerDefinitions} from "../src/providers.js";
const providers=new Set(providerDefinitions().map(x=>x.id));
for(const model of MODEL_CATALOG) assert.ok(providers.has(model.provider),`${model.id} has no provider`);
for(const id of ["gpt-6","claude-sonnet-5","gemini-3.7-flash","grok-4.6","command-a-plus","schematron-v2-small","minimax-m3","flux-schnell","qwen","deepseek-r1"]) assert.equal(findModels(id)[0]?.id,id);
assert.ok(MODEL_CATALOG.some(x=>x.capabilities.includes("image")));
console.log(`model catalog verification passed (${MODEL_CATALOG.length} entries)`);
