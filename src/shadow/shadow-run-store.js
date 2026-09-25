import crypto from "node:crypto";
import {GovernanceDb} from "../governance-db.js";
import {normalizeAgentBudget,zeroUsage,checkBudget} from "../agent-budget.js";
const iso=()=>new Date().toISOString();
export const SHADOW_STATES=Object.freeze(["CREATED","QUEUED","RESEARCHING","SIMULATING","GENERATING","CRITIQUING","EVALUATING","PENDING_PROMOTION","ACCEPTED","REJECTED","EXPIRED","ARCHIVED"]);
const allowed={
CREATED:["QUEUED","REJECTED","EXPIRED"],QUEUED:["RESEARCHING","SIMULATING","REJECTED","EXPIRED"],RESEARCHING:["SIMULATING","GENERATING","REJECTED","EXPIRED"],
SIMULATING:["GENERATING","CRITIQUING","EVALUATING","REJECTED","EXPIRED"],GENERATING:["CRITIQUING","EVALUATING","PENDING_PROMOTION","REJECTED"],
CRITIQUING:["EVALUATING","REJECTED"],EVALUATING:["PENDING_PROMOTION","REJECTED"],PENDING_PROMOTION:["ACCEPTED","REJECTED","EXPIRED"],
ACCEPTED:["ARCHIVED"],REJECTED:["ARCHIVED"],EXPIRED:["ARCHIVED"],ARCHIVED:[]
};
export class ShadowRunStore{
  constructor(stateRoot,audit=null){this.db=new GovernanceDb(stateRoot);this.audit=audit;}
  create({agentType,objective,budget={},parentRunId=null,provenance={}}){
    const id="shadow-"+crypto.randomUUID(),now=iso(),record={id,agentType:String(agentType),objective:String(objective||"").slice(0,20000),parentRunId,budget:normalizeAgentBudget(budget),usage:zeroUsage(),state:"CREATED",provenance,createdAt:now,updatedAt:now};
    const r=this.db.create("shadow-run",record);if(r.state==="SUCCESS")this.audit?.append({type:"shadow.run.created",runId:id,agentType});return r.state==="SUCCESS"?record:r;
  }
  get(id){return this.db.get("shadow-run",id).record||null;}
  list({limit=100,state=null}={}){let rows=this.db.list("shadow-run",limit).records||[];if(state)rows=rows.filter(x=>x.state===state);return rows;}
  transition(id,state,event={}){
    const cur=this.db.get("shadow-run",id);if(!cur.record)return {state:"FAILURE",message:"Shadow run not found."};
    if(!SHADOW_STATES.includes(state)||!allowed[cur.record.state]?.includes(state))return {state:"BLOCKED",message:`Illegal shadow transition ${cur.record.state} -> ${state}.`};
    const body={...cur.record,state,updatedAt:iso()};const r=this.db.cas("shadow-run",id,cur.version,body,{type:"shadow.transition",from:cur.record.state,to:state,...event});
    if(r.state==="SUCCESS")this.audit?.append({type:"shadow.run.transition",runId:id,from:cur.record.state,to:state});return r.state==="SUCCESS"?body:r;
  }
  debit(id,delta){
    const cur=this.db.get("shadow-run",id);if(!cur.record)return {state:"FAILURE",message:"Shadow run not found."};
    const gate=checkBudget(cur.record.budget,cur.record.usage,delta);if(!gate.allowed)return {...gate,message:"Shadow run resource budget exceeded."};
    const body={...cur.record,usage:gate.next,updatedAt:iso()};const r=this.db.cas("shadow-run",id,cur.version,body,{type:"shadow.budget",delta});
    return r.state==="SUCCESS"?{state:"SUCCESS",record:body}:r;
  }
}
