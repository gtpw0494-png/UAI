import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { KnowledgeStore } from "./src/store.js";
import { ResearchAgent, DevelopmentAgent, ExplorativeAgent } from "./src/agents.js";
import { buildCapabilityRegistry } from "./src/capabilities.js";
import { ProviderHub } from "./src/providers.js";
import { KnowledgeEngine } from "./src/knowledge.js";
import { AgentRegistry, TaskEngine } from "./src/agent-system.js";
import { ControlCenter } from "./src/control-center.js";
import { OneChatRouter } from "./src/onechat.js";
import { ForgeLMBridge } from "./src/forgelm-bridge.js";
import { LearningFabric } from "./src/learning-fabric.js";
import { dependencyStatus } from "./src/dependency-status.js";
import { SelfDevelopmentEngine } from "./src/self-development.js";
import { ModelLab } from "./src/model-lab.js";
import { verifyRelease } from "./src/release-integrity.js";
import { exportKnowledgeRecord, importKnowledgeRecord } from "./src/transport.js";
import { THREE_LAWS, GOVERNANCE } from "./src/doctrine.js";
import { AuditLog } from "./src/audit.js";
import { WorkspaceManager } from "./src/workspace.js";
import { WebCorpus } from "./src/web-corpus.js";
import { RuntimeServices } from "./src/runtime-services.js";
import { LangGraphAdapter } from "./src/langgraph-adapter.js";
import { StorageDatabase } from "./src/storage-db.js";
import { TaskStore } from "./src/task-store.js";
import { ActionEnvelopeStore } from "./src/action-envelope.js";
import { AvailabilityLedger } from "./src/availability-ledger.js";
import { PolicyEngine } from "./src/policy-engine.js";
import { ApprovalStore } from "./src/approval-store.js";
import { AutonomyStore } from "./src/autonomy-store.js";
import { PluginRegistry } from "./src/plugin-registry.js";
import { ModelRegistry } from "./src/model-registry.js";
import { PluginExecutor } from "./src/plugin-executor.js";
import { LlamaCppRuntime } from "./src/model-runtime-adapter.js";
import { Observability } from "./src/observability.js";
import { IdempotencyStore } from "./src/idempotency-store.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageMeta = JSON.parse(fs.readFileSync(path.join(__dirname,"package.json"),"utf8"));
const APP_VERSION = packageMeta.version || "UNKNOWN";
const stateDir = path.join(__dirname, "state");
const store = new KnowledgeStore(path.join(__dirname, "data"));
const audit = new AuditLog(stateDir);
const workspace = new WorkspaceManager(__dirname, stateDir, audit);
const providerHub = new ProviderHub(audit);
const knowledge = new KnowledgeEngine(store);
const research = new ResearchAgent(store, knowledge);
const development = new DevelopmentAgent(store, workspace);
const explorative = new ExplorativeAgent(store, knowledge);
const agents = new AgentRegistry(stateDir, audit);
const taskStore = new TaskStore(stateDir, audit);
const actionEnvelopes = new ActionEnvelopeStore(stateDir, audit);
const availabilityLedger = new AvailabilityLedger(stateDir);
const policyEngine = new PolicyEngine();
const approvalStore = new ApprovalStore(stateDir,audit);
const autonomyStore = new AutonomyStore(stateDir,audit);
const pluginRegistry = new PluginRegistry(stateDir,audit);
const idempotencyStore = new IdempotencyStore(stateDir,audit);
const modelRegistry = new ModelRegistry();
const llamaRuntime = new LlamaCppRuntime();
const observability = new Observability(audit);
const pluginExecutor = new PluginExecutor({registry:pluginRegistry,approvalStore,policyEngine,idempotencyStore,audit});
const tasks = new TaskEngine({store,knowledge,providers:providerHub,research,development,explorative,agents,audit,taskStore,actionEnvelopes,policyEngine,approvalStore});
const control = new ControlCenter(stateDir, audit);
const forgelm = new ForgeLMBridge();
const learning = new LearningFabric({store,audit,root:__dirname});
const selfdev = new SelfDevelopmentEngine({root:__dirname,stateRoot:stateDir,store,workspace,audit});
const modelLab = new ModelLab({learning,audit,stateRoot:stateDir});
const webCorpus = new WebCorpus({root:__dirname,store,audit});
const runtimeServices = new RuntimeServices();
const langgraph = new LangGraphAdapter();
const storageDb = new StorageDatabase();
const sourceRegistry = JSON.parse(fs.readFileSync(path.join(__dirname,"research","source_registry.json"),"utf8")).sources;
const onechat = new OneChatRouter({research,development,explorative,tasks,knowledge,agents,store,audit,forgelm,learning,selfdev,control,sourceRegistry,dependencyStatus,modelLab,webCorpus,runtimeServices,langgraph,storageDb,policyEngine,approvalStore,autonomyStore,pluginRegistry,modelRegistry,llamaRuntime,observability,capabilityStatus:async()=>{const deps=dependencyStatus(),model=await forgelm.status(),lg=await langgraph.status();return buildCapabilityRegistry(providerHub,{deps,model,langgraph:lg,runtimeServices:runtimeServices.status(),sourceRegistry});},availabilityStatus:async()=>{const deps=dependencyStatus(),model=await forgelm.status(),lg=await langgraph.status();const caps=buildCapabilityRegistry(providerHub,{deps,model,langgraph:lg,runtimeServices:runtimeServices.status(),sourceRegistry});return availabilityLedger.record(caps);}});
const PORT = Number(process.env.PORT || 8787);

function send(res,status,data,type="application/json"){res.writeHead(status,{"content-type":`${type}; charset=utf-8`,"cache-control":"no-store"});res.end(type==="application/json"?JSON.stringify(data,null,2):data);}
function readBody(req){return new Promise((resolve,reject)=>{let d="";req.on("data",c=>{d+=c;if(d.length>4_000_000)req.destroy();});req.on("end",()=>{try{resolve(d?JSON.parse(d):{});}catch(e){reject(e);}});req.on("error",reject);});}

const server=http.createServer(async(req,res)=>{try{
  const url=new URL(req.url,`http://${req.headers.host}`);
  if(req.method==="GET"&&url.pathname==="/api/status"){const deps=dependencyStatus();const model=await forgelm.status();const lg=await langgraph.status();const services=runtimeServices.status();const storage=await storageDb.status();const capabilities=buildCapabilityRegistry(providerHub,{deps,model,langgraph:lg,runtimeServices:services,sourceRegistry});const availability=availabilityLedger.record(capabilities);return send(res,200,{name:"IntraultUniversalion",version:APP_VERSION,surface:"OneChat",doctrine:{laws:THREE_LAWS,governance:GOVERNANCE},sourceResearch:{count:sourceRegistry.length,policy:"Core research capabilities use governed public/open source references; proprietary model internals are never assumed."},capabilities,capabilitySummary:{connected:capabilities.filter(x=>x.availability==="CONNECTED").length,total:capabilities.length,configured:capabilities.filter(x=>x.availability==="CONFIGURED").length},availabilityEvidence:availability,taskSummary:{persisted:taskStore.list({limit:10000}).length},actionEnvelopeSummary:{persisted:actionEnvelopes.list(10000).length},optionalExternalAdapters:providerHub.list(),runtimeServices:services,langgraph:lg,storageDatabase:storage,languageData:{definitions:storage.counts?.definitions||0,dialogueMessages:storage.counts?.dialogue_messages||0,sources:storage.counts?.sources||0},knowledgeCount:store.list().length,auditCount:audit.list(10000).length,agentCount:agents.list().length,pluginCount:control.plugins.list().length,accountCount:control.accounts.list().length,subscriptionCount:control.subscriptions.list().length,neuralDependencies:deps,forgelm:model,releaseIntegrity:verifyRelease(__dirname),modelLab:modelLab.status(),governanceDatabase:taskStore.db.status(),modelRegistry:modelRegistry.status(),pluginRegistry:{count:pluginRegistry.list().length},auditIntegrity:audit.verify()});}
  if(req.method==="GET"&&url.pathname==="/api/research/sources")return send(res,200,{state:"SUCCESS",sources:sourceRegistry});
  if(req.method==="GET"&&url.pathname==="/api/models")return send(res,200,modelRegistry.status());
  if(req.method==="GET"&&url.pathname==="/api/model-runtime/llamacpp")return send(res,200,await llamaRuntime.status());
  if(req.method==="GET"&&url.pathname==="/api/observability")return send(res,200,observability.summary());
  if(req.method==="GET"&&url.pathname==="/api/plugins-v1")return send(res,200,{state:"SUCCESS",plugins:pluginRegistry.list()});
  if(req.method==="POST"&&url.pathname==="/api/plugins-v1/register"){const b=await readBody(req);return send(res,200,pluginRegistry.register(b.manifest||b));}
  if(req.method==="POST"&&url.pathname==="/api/plugins-v1/execute"){const b=await readBody(req);return send(res,200,await pluginExecutor.execute(String(b.pluginId||''),b.input||{},b.approvalId||null));}
  if(req.method==="GET"&&url.pathname==="/api/data-lifecycle")return send(res,200,await storageDb.lifecycleStatus());
  if(req.method==="GET"&&url.pathname==="/api/storage/status")return send(res,200,await storageDb.status());
  if(req.method==="GET"&&url.pathname==="/api/definitions"){return send(res,200,await storageDb.define(url.searchParams.get("term")||"",Number(url.searchParams.get("limit")||8)));}
  if(req.method==="GET"&&url.pathname==="/api/dialogue/search"){return send(res,200,await storageDb.banter(url.searchParams.get("q")||"",Number(url.searchParams.get("limit")||8),url.searchParams.get("style")||""));}
  if(req.method==="GET"&&url.pathname==="/api/lexicon/related"){return send(res,200,await storageDb.related(url.searchParams.get("term")||"",url.searchParams.get("relation")||"",Number(url.searchParams.get("limit")||12)));}
  if(req.method==="GET"&&url.pathname==="/api/semantic/search"){return send(res,200,await storageDb.semanticSearch(url.searchParams.get("q")||"",url.searchParams.get("kind")||"all",Number(url.searchParams.get("limit")||8)));}
  if(req.method==="POST"&&url.pathname==="/api/semantic/build"){return send(res,200,await storageDb.semanticBuild());}
  if(req.method==="GET"&&url.pathname==="/api/web/status")return send(res,200,webCorpus.status());
  if(req.method==="POST"&&url.pathname==="/api/capabilities/probe"){const probes=await runtimeServices.probe();const lg=await langgraph.status();const model=await forgelm.status();return send(res,200,{state:"SUCCESS",runtimeServices:probes,langgraph:lg,forgelm:model});}
  if(req.method==="GET"&&url.pathname==="/api/billing/subscriptions"){return send(res,200,await runtimeServices.billing.list({limit:url.searchParams.get("limit")||10,status:url.searchParams.get("status")||"all"}));}
  if(req.method==="POST"&&url.pathname==="/api/oxford/compare"){const b=await readBody(req);return send(res,200,await runtimeServices.oxford.compare(b.word,b.description));}
  if(req.method==="POST"&&url.pathname==="/api/fabrication/probe")return send(res,200,await runtimeServices.fabrication.probe());
  if(req.method==="POST"&&url.pathname==="/api/fabrication/job"){const b=await readBody(req);return send(res,200,await runtimeServices.fabrication.job(String(b.command||""),b.approval===true));}
  if(req.method==="POST"&&url.pathname==="/api/langgraph/run"){const b=await readBody(req);return send(res,200,await langgraph.run(b.message||""));}
  if(req.method==="POST"&&url.pathname==="/api/web/ingest")return send(res,200,await webCorpus.ingestUrl(await readBody(req)));
  if(req.method==="GET"&&url.pathname==="/api/knowledge")return send(res,200,store.list());
  if(req.method==="GET"&&url.pathname==="/api/agents")return send(res,200,agents.list());
  if(req.method==="GET"&&url.pathname==="/api/plugins")return send(res,200,control.plugins.list());
  if(req.method==="GET"&&url.pathname==="/api/accounts")return send(res,200,control.accounts.list());
  if(req.method==="GET"&&url.pathname==="/api/subscriptions")return send(res,200,control.subscriptions.list());
  if(req.method==="GET"&&url.pathname==="/api/audit")return send(res,200,audit.list(Number(url.searchParams.get("limit")||100)));
  if(req.method==="GET"&&url.pathname==="/api/audit/verify")return send(res,200,audit.verify());
  if(req.method==="GET"&&url.pathname==="/api/source/inspect")return send(res,200,workspace.inspect(url.searchParams.get("path")||"package.json"));
  if(req.method==="POST"&&url.pathname==="/api/research")return send(res,200,research.examine(await readBody(req)));
  if(req.method==="POST"&&url.pathname==="/api/plugins/register")return send(res,200,{state:"SUCCESS",plugin:control.registerPlugin(await readBody(req))});
  if(req.method==="POST"&&url.pathname==="/api/accounts")return send(res,200,{state:"SUCCESS",account:control.addAccount(await readBody(req))});
  if(req.method==="POST"&&url.pathname==="/api/subscriptions")return send(res,200,{state:"SUCCESS",subscription:control.addSubscription(await readBody(req))});
  if(req.method==="POST"&&url.pathname==="/api/knowledge/export"){const b=await readBody(req);const record=store.get(b.id);return record?send(res,200,{state:"SUCCESS",record:exportKnowledgeRecord(record)}):send(res,404,{state:"FAILURE",message:"Knowledge record not found."});}
  if(req.method==="POST"&&url.pathname==="/api/knowledge/import"){const b=await readBody(req);const decoded=importKnowledgeRecord(b.record);const stored=store.importRecord(decoded);audit.append({type:"knowledge.import",knowledgeId:stored.id,originalId:decoded.id||null});return send(res,200,{state:"SUCCESS",knowledgeId:stored.id});}
  if(req.method==="POST"&&url.pathname==="/api/agents/spawn")return send(res,200,agents.spawn(await readBody(req)));
  if(req.method==="GET"&&url.pathname==="/api/tasks")return send(res,200,{state:"SUCCESS",tasks:taskStore.list({limit:Number(url.searchParams.get("limit")||100),state:url.searchParams.get("state")||null})});
  if(req.method==="GET"&&url.pathname==="/api/tasks/status")return send(res,200,tasks.status(url.searchParams.get("id")||""));
  if(req.method==="POST"&&url.pathname==="/api/tasks/plan")return send(res,200,tasks.plan((await readBody(req)).request||""));
  if(req.method==="POST"&&url.pathname==="/api/tasks/run")return send(res,200,await tasks.run(await readBody(req)));
  if(req.method==="POST"&&url.pathname==="/api/tasks/resume"){const b=await readBody(req);return send(res,200,await tasks.resume(b.id||b.taskId||""));}
  if(req.method==="POST"&&url.pathname==="/api/tasks/cancel"){const b=await readBody(req);return send(res,200,tasks.cancel(b.id||b.taskId||""));}
  if(req.method==="GET"&&url.pathname==="/api/actions")return send(res,200,{state:"SUCCESS",actions:url.searchParams.get("id")?[actionEnvelopes.get(url.searchParams.get("id"))].filter(Boolean):actionEnvelopes.list(Number(url.searchParams.get("limit")||100))});
  if(req.method==="GET"&&url.pathname==="/api/availability")return send(res,200,{state:"SUCCESS",snapshot:availabilityLedger.latest()});
  if(req.method==="POST"&&url.pathname==="/api/policy/evaluate")return send(res,200,policyEngine.evaluate(await readBody(req)));
  if(req.method==="GET"&&url.pathname==="/api/approvals")return send(res,200,{state:"SUCCESS",approvals:approvalStore.list({status:url.searchParams.get("status")||null,limit:Number(url.searchParams.get("limit")||100)})});
  if(req.method==="POST"&&url.pathname==="/api/approvals/request")return send(res,200,{state:"SUCCESS",approval:approvalStore.request(await readBody(req))});
  if(req.method==="POST"&&url.pathname==="/api/approvals/decide"){const b=await readBody(req);return send(res,200,approvalStore.decide(b.id||b.approvalId,b.decision));}
  if(req.method==="GET"&&url.pathname==="/api/autonomy")return send(res,200,{state:"SUCCESS",leases:autonomyStore.list()});
  if(req.method==="POST"&&url.pathname==="/api/autonomy/grant")return send(res,200,autonomyStore.grant(await readBody(req)));
  if(req.method==="POST"&&url.pathname==="/api/autonomy/revoke"){const b=await readBody(req);return send(res,200,autonomyStore.revoke(b.id||b.leaseId));}
  if(req.method==="POST"&&url.pathname==="/api/autonomy/authorize"){const b=await readBody(req);return send(res,200,autonomyStore.authorize(b.id||b.leaseId,b));}
  if(req.method==="POST"&&url.pathname==="/api/knowledge/search"){const b=await readBody(req);return send(res,200,{state:"SUCCESS",results:knowledge.search(b.query,b.limit||10)});}
  if(req.method==="POST"&&url.pathname==="/api/knowledge/compare-definition"){const b=await readBody(req);return send(res,200,knowledge.compareDefinition(b.term,b.description));}
  if(req.method==="POST"&&url.pathname==="/api/develop")return send(res,200,development.propose(await readBody(req)));
  if(req.method==="POST"&&url.pathname==="/api/develop/apply"){const b=await readBody(req);return send(res,200,development.apply(b.proposalId,b.approvalId));}
  if(req.method==="POST"&&url.pathname==="/api/source/rollback"){const b=await readBody(req);return send(res,200,workspace.rollback(b.snapshotId,b.approval===true));}
  if(req.method==="POST"&&url.pathname==="/api/provider/chat"){const b=await readBody(req);const result=await providerHub.chat(b.provider,b.message,b.system);if(result.state==="SUCCESS"&&b.store!==false)store.add({kind:"provider-result",title:`${b.provider} result`,source:`provider:${b.provider}`,text:result.text,provider:b.provider,model:result.model});return send(res,200,result);}
  if(req.method==="POST"&&url.pathname==="/api/selfdev/stage"){const b=await readBody(req);return send(res,200,selfdev.stage(b.proposalId));}
  if(req.method==="POST"&&url.pathname==="/api/selfdev/promote"){const b=await readBody(req);return send(res,200,selfdev.promote(b.stageId,b.approvalId));}
  if(req.method==="GET"&&url.pathname==="/api/selfdev")return send(res,200,selfdev.list());
  if(req.method==="POST"&&url.pathname==="/api/learning/export")return send(res,200,learning.build(await readBody(req)));
  if(req.method==="GET"&&url.pathname==="/api/model/status")return send(res,200,await forgelm.status());
  if(req.method==="GET"&&url.pathname==="/api/model/lab")return send(res,200,modelLab.status());
  if(req.method==="POST"&&url.pathname==="/api/model/dataset")return send(res,200,await modelLab.prepareDataset());
  if(req.method==="POST"&&url.pathname==="/api/model/benchmark")return send(res,200,await modelLab.benchmark());
  if(req.method==="POST"&&url.pathname==="/api/model/tokenizer/train"){const b=await readBody(req);return send(res,200,await modelLab.trainTokenizer(b.vocabSize||512));}
  if(req.method==="POST"&&url.pathname==="/api/research/source-snapshot")return send(res,200,await modelLab.analyzeSources());
  if(req.method==="POST"&&url.pathname==="/api/model/train"){const b=await readBody(req);return send(res,200,await modelLab.train({steps:b.steps||80,preset:b.preset||"termux-tiny",gradAccum:b.gradAccum||1}));}
  if(req.method==="POST"&&url.pathname==="/api/model/chat"){const b=await readBody(req);return send(res,200,await forgelm.chat(b.message||"",b.maxNewTokens||64));}
  if(req.method==="POST"&&url.pathname==="/api/onechat")return send(res,200,await onechat.handle(await readBody(req)));
  if(req.method==="POST"&&url.pathname==="/api/chat")return send(res,200,await onechat.handle(await readBody(req)));
  if(req.method==="GET"){const rel=url.pathname==="/"?"index.html":url.pathname.slice(1);const fp=path.join(__dirname,"public",rel);if(fp.startsWith(path.join(__dirname,"public"))&&fs.existsSync(fp)&&fs.statSync(fp).isFile()){const ext=path.extname(fp);const type=ext===".css"?"text/css":ext===".js"?"text/javascript":"text/html";return send(res,200,fs.readFileSync(fp),type);}}
  send(res,404,{error:"Not found"});
}catch(e){send(res,500,{error:e.message});}});
server.listen(PORT,"127.0.0.1",()=>console.log(`IntraultUniversalion v${APP_VERSION} running at http://127.0.0.1:${PORT}`));
