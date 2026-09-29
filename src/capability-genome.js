import crypto from "node:crypto";
import {PlatformStateStore} from "./platform-state-store.js";
const digest=x=>crypto.createHash("sha256").update(JSON.stringify(x)).digest("hex");
export class CapabilityGenomeRegistry{
 constructor({stateRoot,audit=null}={}){this.db=new PlatformStateStore(stateRoot);this.audit=audit;}
 candidate(capability={}){
  if(!capability.id)return {state:"BLOCKED",message:"capability id required"};
  const genome={id:"genome-"+crypto.randomUUID(),schema:"uai.capability-genome.v1",capabilityId:capability.id,interface:capability.interface||null,inputs:capability.inputs||[],outputs:capability.outputs||[],permissions:capability.permissions||[],risk:capability.risk||"unknown",dependencies:capability.dependencies||[],environment:capability.environment||{},evidence:capability.evidence||[],tests:capability.tests||[],health:capability.health||capability.availability||"UNKNOWN",version:String(capability.version||"candidate"),status:"CANDIDATE",confidence:Number(capability.confidence||0),lastSuccessfulExecution:capability.lastSuccessfulExecution||null,createdAt:new Date().toISOString()};
  genome.digest=digest(genome);const r=this.db.create("capability-genome",genome);this.audit?.append?.({type:"capability.genome.candidate",genomeId:genome.id,capabilityId:genome.capabilityId,digest:genome.digest});return r.state==="SUCCESS"?{state:"SUCCESS",genome}:r;
 }
 promote(id,{approved=false,testState="UNKNOWN"}={}){
  const rec=this.db.get("capability-genome",id).record;if(!rec)return {state:"UNAVAILABLE",message:"Genome not found"};
  if(!approved||testState!=="SUCCESS")return {state:"BLOCKED",message:"Genome promotion requires explicit approval and successful verification."};
  const active={...rec,status:"ACTIVE",promotedAt:new Date().toISOString(),promotionEvidence:{approved:true,testState}};active.digest=digest(active);const r=this.db.create("capability-genome",active,{replace:true});this.audit?.append?.({type:"capability.genome.promoted",genomeId:id,capabilityId:rec.capabilityId});return r.state==="SUCCESS"?{state:"SUCCESS",genome:active}:r;
 }
 list(limit=200){return this.db.list("capability-genome",limit).records||[];}
}
