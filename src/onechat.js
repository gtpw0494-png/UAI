import {ResponseComposer} from "./response-composer.js";
import crypto from "node:crypto";
const stateRank=new Map([["SUCCESS",6],["PARTIAL",5],["UNKNOWN",4],["UNAVAILABLE",3],["BLOCKED",2],["DENIED",2],["FAILURE",1],["ERROR",0]]);
const ok=s=>s==="SUCCESS";
function result(state,message,data={}){return {state,message,...data};}
function parseDevelop(message){const m=String(message).match(/^develop\s+file\s+([^\n]+)\n([\s\S]+)$/i);return m?{path:m[1].trim(),content:m[2]}:null;}
function ids(message,re){const m=String(message).match(re);return m?m.slice(1):null;}
export class OneChatRouter{
 constructor(services){Object.assign(this,{sourceRegistry:[]},services);this.responseComposer=services.responseComposer||new ResponseComposer();}
 allocations(message){
  const t=String(message||""),a=[];
  if(/^(?:plan|run|resume|cancel)\s+task\b|^task\s+status\b|^(?:list|show)\s+tasks\b/i.test(t.trim()))return [{agent:"explorative",reason:"explicit durable task-lifecycle command"}];
  if(/research|source registry|source snapshot|reference sources|openai|gpt-oss|grok|deepseek|gemma|hugging face|claude|gemini|bixby|darkai|arena/i.test(t))a.push({agent:"research",reason:"model/source research"});
  if(/web|internet|url|common crawl|fineweb|wikipedia|wikimedia|stack exchange|crawl|website/i.test(t))a.push({agent:"web-research",reason:"governed web research/corpus intent"});
  if(/document|citation|provenance|source graph|evidence search|retrieval source/i.test(t))a.push({agent:"documents",reason:"provenance-aware document retrieval intent"});
  if(/research|analyse|analyze|compare|definition|knowledge|evidence|study|semantic search|semantic retrieve/i.test(t))a.push({agent:"knowledge",reason:"knowledge/research intent"});
  if(/\bdefine\b|definition of|meaning of|wordnet|lexicon|dictionary|synonym|antonym|hypernym|hyponym|related word|lexical relation/i.test(t))a.push({agent:"lexicon",reason:"local lexical-definition intent"});
  if(/banter|chitchat|chat example|conversation example|dialogue example|oasst|openassistant|casual reply|humorous reply|technical banter/i.test(t))a.push({agent:"dialogue",reason:"local conversational-corpus intent"});
  if(/build|develop|implement|code|repair|update|upgrade|repository|proposal|stage|promote|rollback/i.test(t))a.push({agent:"development",reason:"governed development intent"});
  if(/forgelm|local model|model status|neural|train model|language model|checkpoint|tokenizer/i.test(t))a.push({agent:"forgelm",reason:"local neural-model intent"});
  if(/learning|training data|dataset|verified trace|prepare corpus/i.test(t))a.push({agent:"learning",reason:"learning-fabric intent"});
  if(/agent|orchestrate|collaborat|workflow|task\b|resume task|cancel task|action envelope/i.test(t))a.push({agent:"explorative",reason:"agent/orchestration/task-lifecycle intent"});
  if(/account|subscription|billing|plugin|model registry|runtime model|llama|gguf|observability|metrics|capabilit|availability|approval|policy|autonomy|lease|data lifecycle|retention|delete source|system status|dependencies|hardware|release integrity|langgraph|oxford|fabricat|octoprint|storage database|sqlite/i.test(t))a.push({agent:"systems",reason:"system-service intent"});
  if(!a.length)a.push({agent:"explorative",reason:"general conversation/knowledge exploration"});
  return a.filter((x,i)=>a.findIndex(y=>y.agent===x.agent)===i);
 }
 async execute(agent,message){
  if(agent==="web-research"){
    if(/web corpus status|web sources|source classes|common crawl|fineweb|wikimedia|wikipedia|stack exchange/i.test(message)){const s=this.webCorpus?.status();return s?{...s,message:`Web corpus registry contains ${s.sourceClasses} governed source classes and ${s.records} locally ingested record(s).`}:result("UNAVAILABLE","Web corpus service is not configured.");}
    const m=String(message).match(/(?:ingest|fetch|research)\s+url\s+(https?:\/\/\S+)(?:\s+license\s+([A-Za-z0-9_.+-]+))?/i);
    if(m)return this.webCorpus?await this.webCorpus.ingestUrl({url:m[1],license:m[2]||"UNKNOWN",licenseSource:m[2]?"USER_DECLARED":"UNVERIFIED",promoteTraining:/training[- ]approved/i.test(message)}):result("UNAVAILABLE","Web corpus service is not configured.");
    return result("SUCCESS","Web Research Agent is ready. Ask for web corpus status or `ingest url https://...`; fetched content keeps URL, retrieval time, robots result, license state and training eligibility.");
  }
  if(agent==="documents"){
    if(!this.documentStore)return result("UNAVAILABLE","Provenance document store is not configured.");
    if(/document(?: data)? plane status|document store status|documents status/i.test(message)){const s=await this.documentStore.status();return {...s,message:"Document data plane contains "+(s.documents||0)+" document revision(s) and "+(s.chunks||0)+" chunk(s)."};}
    if(/(?:list|show)\s+documents/i.test(message)){const s=await this.documentStore.list({limit:50});return result(s.state||"SUCCESS",(s.documents?.length||0)+" document revision(s) are visible in the local data plane.",s);}
    const get=String(message).match(/(?:show|get|inspect)\s+document\s+(doc-[\w-]+)/i);if(get)return this.documentStore.get(get[1]);
    const del=String(message).match(/(?:forget|delete|soft delete)\s+document\s+(doc-[\w-]+)/i);if(del)return this.documentStore.delete(del[1],"OneChat user-requested deletion");
    const purge=String(message).match(/purge\s+document\s+(doc-[\w-]+)/i);if(purge)return this.documentStore.purge(purge[1],"OneChat user-requested purge");
    const q=String(message).match(/(?:document|evidence|provenance)\s+(?:search|retrieve|find)\s+(.+)/i);if(q)return this.documentStore.search(q[1].trim(),8);
    return result("SUCCESS","Document agent is ready. Ask for document data plane status, list documents, or document search <query>.",{commands:["document data plane status","list documents","document search <query>","show document <doc-id>"]});
  }
  if(agent==="lexicon"){
    if(!this.storageDb)return result("UNAVAILABLE","SQLite language database is not configured.");
    const relm=String(message).match(/(?:synonyms?|antonyms?|hypernyms?|hyponyms?|related(?:\s+words?)?)\s+(?:for|of|to)?\s*([^?!.\n]+)/i);
    if(relm){const map={synonym:"similar-to",synonyms:"similar-to",antonym:"antonym",antonyms:"antonym",hypernym:"hypernym",hypernyms:"hypernym",hyponym:"hyponym",hyponyms:"hyponym"};const key=relm[0].trim().split(/\s+/)[0].toLowerCase();return this.storageDb.related(relm[1].trim(),map[key]||"",12);}
    const m=String(message).match(/(?:define|definition of|meaning of)\s+([^?!.\n]+)/i);const term=(m?m[1]:message).trim();
    return this.storageDb.define(term,8);
  }
  if(agent==="dialogue"){
    if(!this.storageDb)return result("UNAVAILABLE","SQLite language database is not configured.");
    const m=String(message).match(/(?:banter|chitchat|conversation|dialogue)(?:\s+(?:about|on|for))?\s*(.*)$/i);let query=(m?.[1]||"").trim();let style="";const sm=query.match(/\bstyle\s+(casual|technical|humorous|enthusiastic|short|question)(?:\s*,\s*(casual|technical|humorous|enthusiastic|short|question))*/i);if(sm){style=sm[0].replace(/^style\s+/i,"");query=query.replace(sm[0],"").trim();}return this.storageDb.banter(query,8,style);
  }
  if(agent==="forgelm"){
    if(/train\s+tokenizer|tokenizer\s+train/i.test(message)&&this.modelLab){const n=Number((message.match(/(\d+)/)||[])[1]||512);return this.modelLab.trainTokenizer(Math.max(280,Math.min(n,32000)));}
    if(/train/i.test(message)){
      const n=Number((message.match(/(\d+)\s*steps?/i)||[])[1]||40);const pm=message.match(/preset\s+([\w-]+)/i);const preset=pm?pm[1]:"termux-tiny";
      return this.modelLab?this.modelLab.train({steps:Math.max(1,Math.min(n,10000)),preset}):this.forgelm.train(Math.max(1,Math.min(n,10000)));
    }
    if(/benchmark/i.test(message)&&this.modelLab)return this.modelLab.benchmark();
    if(/presets?|model lab/i.test(message)&&this.modelLab)return this.modelLab.status();
    if(/status|checkpoint/i.test(message)){const s=await this.forgelm.status();return {...s,message:s.state==="SUCCESS"?`ForgeLM runtime ${s.state}; checkpoint ${s.checkpointExists?"is available":"is not available"}; device ${s.device||"unknown"}.`:(s.message||"ForgeLM status unavailable.")};}
    return this.forgelm.chat(message,64);
  }
  if(agent==="learning"){
    if(/prepare|dataset|training data|corpus/i.test(message)&&this.modelLab)return this.modelLab.prepareDataset();
    return /export|build|dataset|training data/i.test(message)?this.learning.build():result("SUCCESS","Learning agent is ready. Ask to prepare the verified ForgeLM dataset.",{file:this.learning.file});
  }
  if(agent==="research"){
    if(/source snapshot|analy[sz]e reference sources|inspect reference sources/i.test(message)&&this.modelLab)return this.modelLab.analyzeSources();
    const hits=this.sourceRegistry.filter(x=>new RegExp(x.name.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"i").test(message)||message.toLowerCase().includes((x.name.split(" ")[0]||"").toLowerCase()));
    return result("SUCCESS",hits.length?`Matched ${hits.length} registered research source(s).`:"No named source matched; returning the governed source registry boundary.",{sources:hits.length?hits:this.sourceRegistry});
  }
  if(agent==="explorative"){
    if(/list\s+agents|show\s+agents/i.test(message))return result("SUCCESS",`${this.agents.list().length} logical agents registered.`,{agents:this.agents.list()});
    const spawn=ids(message,/spawn\s+agent\s+([^\n,]+)(?:,?\s*capabilities?\s*:?\s*([\w., -]+))?/i);if(spawn){const caps=(spawn[1]||"").split(/[ ,]+/).map(x=>x.trim()).filter(Boolean);return this.agents.spawn({parentId:"explorative",name:spawn[0].trim(),role:"derived-specialist",capabilities:caps});}
    if(this.tasks){
      const status=String(message).match(/task\s+status\s+(task-[\w-]+)/i);if(status)return this.tasks.status(status[1]);
      const resume=String(message).match(/resume\s+task\s+(task-[\w-]+)/i);if(resume)return this.tasks.resume(resume[1]);
      const cancel=String(message).match(/cancel\s+task\s+(task-[\w-]+)/i);if(cancel)return this.tasks.cancel(cancel[1]);
      if(/(?:list|show)\s+tasks/i.test(message)){const tasks=this.tasks.list({limit:20});return result("SUCCESS",`There are ${tasks.length} persisted task(s) in the current view.`,{tasks});}
      const run=String(message).match(/run\s+task\s*:?\s*([\s\S]+)/i);if(run)return this.tasks.run({request:run[1].trim()});
      const plan=String(message).match(/plan\s+task\s*:?\s*([\s\S]+)/i);if(plan){const p=this.tasks.plan(plan[1].trim());return result(p.state,`Task plan contains ${p.steps.length} step(s).`,{plan:p});}
    }
    return this.explorative.chat(message);
  }
  if(agent==="knowledge"){
    const sem=String(message).match(/semantic\s+(?:search|retrieve)\s+(.+)/i);if(sem&&this.storageDb?.semanticSearch)return this.storageDb.semanticSearch(sem[1].trim(),"all",8);
    const cmp=ids(message,/compare\s+definition\s+([^:]+):\s*([\s\S]+)/i);if(cmp)return this.knowledge.compareDefinition(cmp[0].trim(),cmp[1].trim());
    if(/^(research|study)\s*:/i.test(message))return this.research.examine({title:"OneChat research note",source:"user:onechat",text:message.replace(/^[^:]+:/,"").trim()});
    return this.explorative.chat(message);
  }
  if(agent==="development"){
    const stage=ids(message,/stage\s+proposal\s+([\w-]+)/i);if(stage)return this.selfdev.stage(stage[0]);
    const promote=ids(message,/promote\s+stage\s+([\w-]+)\s+approval\s+([\w-]+)/i);if(promote)return this.selfdev.promote(promote[0],promote[1]);
    const d=parseDevelop(message);if(d)return this.development.propose({request:`OneChat file development: ${d.path}`,path:d.path,content:d.content});
    return this.development.propose({request:message});
  }
  if(agent==="systems"){
    if(/(?:show|list)\s+approvals?/i.test(message)&&this.approvalStore){const approvals=this.approvalStore.list({limit:50});return result("SUCCESS",`${approvals.length} approval record(s).`,{approvals});}
    const approvalDecision=String(message).match(/\b(approve|deny)\s+(approval-[\w-]+)/i);if(approvalDecision&&this.approvalStore)return this.approvalStore.decide(approvalDecision[2],approvalDecision[1].toUpperCase()==="APPROVE"?"APPROVE":"DENY");
    if(/policy/i.test(message)&&this.policyEngine){const risk=(message.match(/\b(low|medium|high|critical)\b/i)||[])[1]||"low";return this.policyEngine.evaluate({operation:message,risk,physical:/physical|fabricat/i.test(message),mutatesSource:/source|code|mutat|develop/i.test(message),external:/external|api|web/i.test(message),requiresCredential:/credential|account|billing/i.test(message)});}
    if(/(?:show|list)\s+autonomy|autonomy\s+status/i.test(message)&&this.autonomyStore){const leases=this.autonomyStore.list();return result("SUCCESS",`${leases.length} autonomy lease(s).`,{leases});}
    const revokeLease=String(message).match(/revoke\s+autonomy\s+(lease-[\w-]+)/i);if(revokeLease&&this.autonomyStore)return this.autonomyStore.revoke(revokeLease[1]);
    const grantLease=String(message).match(/grant\s+autonomy(?:\s+scope\s+([\w.,-]+))?(?:\s+max\s+(\d+))?(?:\s+(\d+)\s+minutes?)?/i);if(grantLease&&this.autonomyStore){const scope=(grantLease[1]||"explore,research").split(',').filter(Boolean);const maxActions=Math.min(1000,Math.max(1,Number(grantLease[2]||10)));const minutes=Math.min(1440,Math.max(1,Number(grantLease[3]||60)));return this.autonomyStore.grant({scope,riskCeiling:"medium",maxActions,durationMs:minutes*60000});}
    if(/availability/i.test(message)&&this.availabilityStatus){const s=await this.availabilityStatus();return result("SUCCESS",`Availability evidence snapshot: ${s.connected}/${s.total} core capabilities CONNECTED${s.configured?`, ${s.configured} CONFIGURED`:""}.`,{availability:s});}
    if(/model registry|runtime model/i.test(message)&&this.modelRegistry){const s=this.modelRegistry.status();return result("SUCCESS",`Model registry tracks ${s.models.length} model/runtime entries without treating registration as runtime availability.`,s);}
    if(/llama|gguf/i.test(message)&&this.llamaRuntime){const s=await this.llamaRuntime.status();return result(s.availability==="CONNECTED"?"SUCCESS":s.availability,s.availability==="CONNECTED"?`llama.cpp runtime is connected with ${s.models?.length||0} loaded model record(s).`:(s.reason||"llama.cpp runtime unavailable."),s);}
    if(/observability|metrics/i.test(message)&&this.observability)return this.observability.summary();
    if(/plugin/i.test(message)&&this.pluginRegistry){const plugins=this.pluginRegistry.list();return result("SUCCESS",`${plugins.length} v1 plugin manifest(s) are registered. Third-party execution remains sandbox-gated.`,{plugins});}
    if(/data lifecycle|retention/i.test(message)&&this.storageDb?.lifecycleStatus)return this.storageDb.lifecycleStatus();
    const ds=String(message).match(/(?:delete|soft delete)\s+source\s+([\w.-]+)/i);if(ds&&this.storageDb?.deleteSource)return this.storageDb.deleteSource(ds[1]);
    if(/storage database|sqlite/i.test(message)&&this.storageDb){const s=await this.storageDb.status();return {...s,message:s.state==="SUCCESS"?`SQLite storage is ready with ${s.counts?.definitions||0} definitions and ${s.counts?.dialogue_messages||0} dialogue messages.`:(s.message||"Storage database unavailable.")};}
    if(/hardware/i.test(message)&&this.modelLab)return this.modelLab.hardware();
    if(/release integrity/i.test(message))return result("SUCCESS","Release integrity is exposed in the live /api/status evidence and verified against the shipped manifest.");
    if(/dependencies/i.test(message)){const d=this.dependencyStatus();return result(d.state||"UNKNOWN",`Neural dependency scan completed. ${Object.values(d.dependencies||{}).filter(x=>x==="CONNECTED").length} Python dependency modules are currently importable.`,d);}
    if(/(?:probe|activate|check)\s+capabilit/i.test(message)&&this.runtimeServices){const services=await this.runtimeServices.probe();const lg=this.langgraph?await this.langgraph.status():null;const caps=this.capabilityStatus?await this.capabilityStatus():[];return result("SUCCESS",`Capability probe completed: ${caps.filter(x=>x.availability==="CONNECTED").length}/${caps.length} core capabilities are CONNECTED.`,{services,langgraph:lg,capabilities:caps});}
    if(/capabilit/i.test(message)&&this.capabilityStatus){const caps=await this.capabilityStatus();const connected=caps.filter(x=>x.availability==="CONNECTED");const configured=caps.filter(x=>x.availability==="CONFIGURED");const missing=caps.filter(x=>!["CONNECTED","CONFIGURED"].includes(x.availability));return result("SUCCESS",`${connected.length}/${caps.length} core capabilities are CONNECTED${configured.length?`, with ${configured.length} additional CONFIGURED`:""}.`,{connected:connected.length,total:caps.length,configured:configured.length,missing:missing.map(x=>({id:x.id,availability:x.availability,reason:x.reason}))});}
    if(/langgraph/i.test(message)&&this.langgraph){if(/run|workflow|execute/i.test(message))return this.langgraph.run(message);const s=await this.langgraph.status();return result(s.availability==="CONNECTED"?"SUCCESS":"UNAVAILABLE",s.reason,s);}
    if(/oxford/i.test(message)&&this.runtimeServices){const m=String(message).match(/oxford\s+compare\s+([^:]+):\s*([\s\S]+)/i);if(m)return this.runtimeServices.oxford.compare(m[1].trim(),m[2].trim());const s=this.runtimeServices.oxford.status();return result(s.availability==="CONNECTED"?"SUCCESS":s.availability,s.reason,s);}
    if(/fabricat|octoprint/i.test(message)&&this.runtimeServices){if(/probe|connect|status/i.test(message)){const r=/probe|connect/i.test(message)?await this.runtimeServices.fabrication.probe():this.runtimeServices.fabrication.status();return r.state? r : result(r.availability==="CONNECTED"?"SUCCESS":r.availability,r.reason,r);}const s=this.runtimeServices.fabrication.status();return result(s.availability==="CONNECTED"?"SUCCESS":s.availability,"Physical job execution is only exposed through the approval-gated fabrication adapter; ask for fabrication status/probe first.",s);}
    if(/accounts?/i.test(message))return result("SUCCESS",`${this.control.accounts.list().length} local account record(s).`,{accounts:this.control.accounts.list()});
    if(/subscriptions?|billing/i.test(message)){if(this.runtimeServices&&/live|stripe|billing/i.test(message)){const s=this.runtimeServices.billing.status();if(s.availability==="CONNECTED")return this.runtimeServices.billing.list({limit:10,status:"all"});return result(s.availability,s.reason,{liveBilling:s});}return result("SUCCESS",`${this.control.subscriptions.list().length} user-recorded subscription(s).`,{subscriptions:this.control.subscriptions.list(),liveBilling:this.runtimeServices?.billing?.status?.()||null});}
    if(/plugins?/i.test(message))return result("SUCCESS",`${this.control.plugins.list().length} plugin manifest(s).`,{plugins:this.control.plugins.list()});
    return result("SUCCESS","Systems agent is connected to local registries and capability adapters. Ask for capabilities, dependencies, LangGraph, Oxford, billing, fabrication, accounts, subscriptions or plugins.");
  }
  return result("UNAVAILABLE",`No executable collaboration route for agent ${agent}.`);
 }
 async handle(input={}){
  const message=String(input.message||"").trim();if(!message)return {state:"BLOCKED",message:"Chat message is empty.",allocations:[],contributions:[]};
  const chatId=input.chatId||`chat-${crypto.randomUUID()}`,allocations=this.allocations(message),contributions=[];
  for(const a of allocations)contributions.push({agent:a.agent,reason:a.reason,result:await this.execute(a.agent,message)});
  const failed=contributions.filter(x=>!ok(x.result?.state));const verification=result(failed.length?"PARTIAL":"SUCCESS",failed.length?`${failed.length} collaborating result(s) were not successful; see evidence. All result states are preserved.`:"Verification passed for the operations executed in this turn.",{checked:contributions.map(x=>({agent:x.agent,state:x.result?.state||"UNKNOWN"}))});
  contributions.push({agent:"verifier",reason:"truth-state verification",result:verification});
  const ranked=contributions.filter(x=>x.agent!=="verifier").map(x=>x.result).sort((a,b)=>(stateRank.get(b.state)||0)-(stateRank.get(a.state)||0));const best=ranked[0]||verification;
  const composed=this.responseComposer.compose({message,allocations,contributions});
  const answer=composed.message||best.message||"Collaboration completed.";
  const finalState=failed.length?(ranked.some(x=>x.state==="SUCCESS")?"PARTIAL":best.state):"SUCCESS";
  const record=this.store.add({kind:"chat-turn",title:"OneChat turn",chatId,user:message,allocations,contributions,state:finalState,answer,responseMode:composed.mode,verified:finalState==="SUCCESS"});
  this.audit?.append({type:"onechat.turn",chatId,knowledgeId:record.id,allocations:allocations.map(x=>x.agent),state:finalState,responseMode:composed.mode});
  return {state:finalState,chatId,message:answer,responseMode:composed.mode,modelUsed:composed.modelUsed===true,modelQuality:composed.quality||null,evidence:composed.evidence||null,allocations,contributions,knowledgeId:record.id,truth:"Only operations actually executed are reported as such. Raw seed-model text is quality-gated before it may become the primary reply."};
 }
}
