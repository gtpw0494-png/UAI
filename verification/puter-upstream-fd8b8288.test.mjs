import assert from "node:assert/strict";
import {ProviderHub, providerDefinitions} from "../src/providers.js";

const BASELINE="fd8b8288d34a23302173f5b49dac84198e6f028a";
const before={...process.env};
const originalFetch=globalThis.fetch;
process.env.PUTER_AUTH_TOKEN="integration-test-token";
process.env.PUTER_BASE_URL="https://api.puter.test/puterai/openai/v1";
process.env.PUTER_MODEL="openai/gpt-5-nano";

const reply=(json,status=200)=>({ok:status>=200&&status<300,status,text:async()=>JSON.stringify(json)});

try {
  const puter=providerDefinitions().find(x=>x.id==="puter");
  assert.ok(puter);
  assert.equal(puter.keyEnv,"PUTER_AUTH_TOKEN");
  assert.ok(puter.capabilities.includes("tools"));

  const hub=new ProviderHub();
  assert.equal(hub.list().find(x=>x.id==="puter").availability,"CONFIGURED");

  globalThis.fetch=async()=>reply({error:{message:"expired app token"}},401);
  const expired=await hub.chat("puter","hello");
  assert.notEqual(expired.state,"SUCCESS");
  assert.match(expired.message,/401/);

  globalThis.fetch=async()=>reply({error:{message:"permission denied"}},403);
  const denied=await hub.chat("puter","hello");
  assert.notEqual(denied.state,"SUCCESS");
  assert.match(denied.message,/403/);

  globalThis.fetch=async()=>reply({choices:[{message:{content:null,tool_calls:[{id:"c1",type:"function",function:{name:"write_file",arguments:'{"path":"outside"}'}}]}}]});
  const proposed=await hub.chat("puter","write it","external provider",{tools:[{name:"write_file",parameters:{type:"object",properties:{path:{type:"string"}}}}]});
  assert.equal(proposed.state,"SUCCESS");
  assert.equal(proposed.toolCalls.length,1);
  // ProviderHub only returns the proposal. Execution must occur through governed UAI capability paths.
  assert.equal(proposed.toolCalls[0].function.name,"write_file");

  globalThis.fetch=async()=>reply({choices:[{message:{content:"ok"}}]});
  const ok=await hub.chat("puter","hello");
  assert.equal(ok.state,"SUCCESS");
  assert.equal(ok.text,"ok");

  console.log(`Puter upstream compatibility verification passed: ${BASELINE}`);
} finally {
  globalThis.fetch=originalFetch;
  for(const key of Object.keys(process.env)) if(!(key in before)) delete process.env[key];
  for(const [key,value] of Object.entries(before)) process.env[key]=value;
}
