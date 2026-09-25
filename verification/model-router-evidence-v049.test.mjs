import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {EvidenceEnvelope,verifyEvidenceEnvelope} from "../src/evidence-envelope.js";
import {ModelRouter,buildLocalModelCandidates} from "../src/models/router.js";
import {ConversationEngine} from "../src/conversation-engine.js";
import {OneChatRouter} from "../src/onechat.js";

const auditRows=[];
const audit={append:x=>auditRows.push(x)};

const fallbackRouter=new ModelRouter({
  audit,
  candidates:[
    {
      id:"bad-local",provider:"fixture-a",local:true,offline:true,tasks:["chat"],modalities:["text"],
      health:async()=>({availability:"CONNECTED",executable:true}),
      generate:async()=>({state:"SUCCESS",text:"bad"})
    },
    {
      id:"good-local",provider:"fixture-b",local:true,offline:true,tasks:["chat"],modalities:["text"],
      health:async()=>({availability:"CONNECTED",executable:true}),
      generate:async()=>({state:"SUCCESS",text:"A sufficiently complete local answer from the fallback model.",model:"good-v1"})
    },
    {
      id:"remote",provider:"fixture-remote",local:false,offline:false,tasks:["chat"],modalities:["text"],
      health:async()=>({availability:"CONNECTED",executable:true}),
      generate:async()=>({state:"SUCCESS",text:"Remote answer"})
    }
  ]
});
const routed=await fallbackRouter.generate(
  {task:"chat",modality:"text",privacy:"local-only",offline:true},
  "hello",
  {acceptResult:text=>text.length>=12}
);
assert.equal(routed.state,"SUCCESS");
assert.equal(routed.route.selected.id,"good-local");
assert.deepEqual(routed.route.attempts.map(x=>x.state),["REJECTED_OUTPUT","SUCCESS"]);
assert.ok(!routed.route.alternatives.some(x=>x.id==="remote"));
assert.ok(auditRows.some(x=>x.type==="model.route.generate"&&x.selected==="good-local"));

const noRoute=new ModelRouter({candidates:[{
  id:"remote-only",provider:"remote",local:false,offline:false,tasks:["chat"],modalities:["text"],
  health:async()=>({availability:"CONNECTED",executable:true}),generate:async()=>({state:"SUCCESS",text:"remote"})
}]});
assert.equal((await noRoute.route({task:"chat",privacy:"local-only",offline:true})).state,"UNAVAILABLE");

const llamaStub={
  status:async()=>({availability:"CONNECTED",executable:true,models:[{id:"llama-fixture"}]}),
  chat:async()=>({state:"SUCCESS",text:"Reasoning response from the local llama runtime.",model:"llama-fixture"})
};
const forgeStub={
  status:async()=>({state:"SUCCESS",checkpointExists:true}),
  chat:async()=>({state:"SUCCESS",text:"ForgeLM response"})
};
const localRouter=new ModelRouter({candidates:buildLocalModelCandidates({llamaRuntime:llamaStub,forgelm:forgeStub})});
const reasoningRoute=await localRouter.route({task:"reasoning",privacy:"local-only",offline:true});
assert.equal(reasoningRoute.state,"SUCCESS");
assert.equal(reasoningRoute.selected.id,"llamacpp-local");

const envelope=new EvidenceEnvelope({
  responseId:"response-fixture",
  answer:"The fixture document supports this answer.",
  model:{id:"fixture-model",provider:"local"},
  claims:[{
    claim:"The fixture document supports this answer.",
    status:"SUPPORTED",
    confidence:0.9,
    support:[{source_id:"source-1",document_id:"doc-1",document_revision:2,chunk_id:"chunk-1",uri:"file:///fixture",quote:"supporting excerpt",score:0.8}]
  }],
  toolCalls:[{agent:"documents",state:"SUCCESS"}]
});
assert.equal(envelope.verify().state,"SUCCESS");
assert.equal(envelope.summary().support.SUPPORTED,1);
const tampered=JSON.parse(JSON.stringify(envelope));tampered.answer="tampered";
assert.equal(verifyEvidenceEnvelope(tampered).state,"DENIED");

class MemoryStore{
  constructor(){this.rows=[];}
  add(x){const row={...x,id:"row-"+(this.rows.length+1)};this.rows.push(row);return row;}
  list(){return this.rows.map(x=>({id:x.id}));}
  get(id){return this.rows.find(x=>x.id===id)||null;}
}
const store=new MemoryStore();
const conversation=new ConversationEngine({modelRouter:fallbackRouter,audit});
const chat=new OneChatRouter({conversation,store,audit});
const turn=await chat.handle({chatId:"chat-v049",message:"Give me a useful local answer"});
assert.equal(turn.state,"SUCCESS");
assert.equal(turn.responseMode,"native-conversation");
assert.equal(turn.evidenceEnvelope.schema_version,"uai.evidence.v1");
assert.equal(turn.evidenceEnvelope.claims[0].status,"INFERENCE");
assert.equal(verifyEvidenceEnvelope(turn.evidenceEnvelope).state,"SUCCESS");
assert.equal(turn.evidenceEnvelope.model.provider,"fixture-b");
assert.equal(turn.evidenceEnvelope.model.route.selected.id,"good-local");

const explained=await chat.handle({chatId:"chat-v049",message:"explain answer"});
assert.equal(explained.state,"SUCCESS");
assert.equal(explained.responseMode,"evidence-explanation");
assert.equal(explained.evidenceEnvelope.id,turn.evidenceEnvelope.id);
assert.match(explained.truth,/not private chain-of-thought/i);

const docStore=new MemoryStore();
const docChat=new OneChatRouter({
  documentStore:{
    search:async()=>({state:"SUCCESS",matches:[{
      source_id:"source-doc",document_id:"doc-9",chunk_id:"chunk-9",revision:3,
      canonical_uri:"file:///doc-9",text:"Exact supporting document excerpt.",bm25:-1.2,provenance:{owner:"fixture"}
    }]})
  },
  store:docStore,
  audit
});
const docTurn=await docChat.handle({chatId:"doc-chat",message:"document search supporting"});
assert.equal(docTurn.state,"SUCCESS");
assert.equal(docTurn.responseMode,"evidence-retrieval");
assert.equal(docTurn.evidenceEnvelope.claims[0].status,"SUPPORTED");
assert.equal(docTurn.evidenceEnvelope.claims[0].support[0].chunk_id,"chunk-9");
assert.equal(docTurn.evidenceEnvelope.claims[0].support[0].quote,"Exact supporting document excerpt.");
assert.equal(verifyEvidenceEnvelope(docTurn.evidenceEnvelope).state,"SUCCESS");

const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const app=fs.readFileSync(path.join(root,"public","app.js"),"utf8");
assert.match(app,/sessionStorage\.getItem\(CHAT_KEY\)/);
assert.match(app,/message:text,chatId/);
assert.match(app,/evidenceEnvelope\|\|x\.evidence/);

console.log("v0.49 evidence-native model routing tests passed");
