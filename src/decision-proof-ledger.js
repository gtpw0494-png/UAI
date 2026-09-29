import crypto from "node:crypto";
import {PlatformStateStore} from "./platform-state-store.js";
const hash=x=>crypto.createHash("sha256").update(typeof x==="string"?x:JSON.stringify(x??null)).digest("hex");
export class DecisionProofLedger{
 constructor({stateRoot,policySimulator=null,audit=null}={}){this.db=new PlatformStateStore(stateRoot);this.policySimulator=policySimulator;this.audit=audit;}
 create(input={}){
  const id="proof-"+crypto.randomUUID(),counterfactual=input.counterfactual===false?null:this.policySimulator?.simulate?.({actor:input.actor,subjectId:id,objective:"Counterfactual authorization constraints for "+String(input.intent||""),steps:[{operation:input.action?.operation||"unknown",risk:input.risk||"low",resource:input.action?.resource||null,arguments:input.action?.arguments||{},external:Boolean(input.action?.external),physical:Boolean(input.action?.physical),mutatesSource:Boolean(input.action?.mutatesSource),requiresCredential:Boolean(input.action?.requiresCredential)}]})?.simulation||null;
  const proof={id,schema:"uai.decision-proof.v1",intent:String(input.intent||""),actor:input.actor||null,evidence:Array.isArray(input.evidence)?input.evidence:[],capability:input.capability||null,risk:String(input.risk||"low"),policy:{version:input.policyVersion||"uai-policy-v0.54",decision:input.policyDecision||"UNKNOWN",counterfactual:counterfactual?{overallDecision:counterfactual.overallDecision,violations:counterfactual.violations,approvalsRequired:counterfactual.approvalsRequired,saferPlan:counterfactual.saferPlan}:null},approval:input.approval||null,action:input.action||null,verification:input.verification||{state:"UNKNOWN",evidence:[]},outcome:input.outcome||"UNKNOWN",artifactHash:input.artifact?hash(input.artifact):null,privateReasoningStored:false,createdAt:new Date().toISOString()};
  proof.integrityHash=hash(proof);const r=this.db.create("decision-proof",proof);this.audit?.append?.({type:"decision.proof.created",proofId:id,outcome:proof.outcome,integrityHash:proof.integrityHash});return r.state==="SUCCESS"?{state:"SUCCESS",proof}:r;
 }
 get(id){return this.db.get("decision-proof",id).record||null;}
 list(limit=100){return this.db.list("decision-proof",limit).records||[];}
}
