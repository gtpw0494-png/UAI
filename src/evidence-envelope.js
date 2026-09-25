import crypto from "node:crypto";
export const SUPPORT_STATES=Object.freeze(["SUPPORTED","PARTIALLY_SUPPORTED","CONFLICTING","STALE","INFERENCE","OPINION","UNSUPPORTED"]);
export function normalizeClaim(c={}){
 const status=SUPPORT_STATES.includes(c.status)?c.status:"UNSUPPORTED";
 return {claim:String(c.claim||""),support:Array.isArray(c.support)?c.support.map(s=>({source_id:s.source_id||null,document_revision:s.document_revision||null,chunk_id:s.chunk_id||null,quote:s.quote||null,score:Number.isFinite(s.score)?s.score:null})):[],status,confidence:Number.isFinite(c.confidence)?Math.max(0,Math.min(1,c.confidence)):null,contradictions:Array.isArray(c.contradictions)?c.contradictions:[]};
}
export class EvidenceEnvelope{
 constructor({answer="",model=null,retrievalRun=null,claims=[],toolCalls=[],freshness=null}={}){
  this.id="evidence-"+crypto.randomUUID();this.answer=String(answer);this.model=model;this.retrieval_run=retrievalRun;this.claims=claims.map(normalizeClaim);this.tool_calls=Array.isArray(toolCalls)?toolCalls:[];this.freshness=freshness;this.created_at=new Date().toISOString();
 }
 summary(){const support=Object.fromEntries(SUPPORT_STATES.map(x=>[x,0]));for(const c of this.claims)support[c.status]=(support[c.status]||0)+1;return {id:this.id,claims:this.claims.length,support,model:this.model,retrieval_run:this.retrieval_run,created_at:this.created_at};}
}
