import crypto from "node:crypto";
import {GovernanceDb} from "../governance-db.js";
import {LightAgentRegistry} from "./light-agent-registry.js";
import {WorktreeManager} from "./worktree-manager.js";
import {PatchEvaluator} from "./patch-evaluator.js";
import {PromotionGate} from "../shadow/promotion-gate.js";
import {normalizeAgentBudget,zeroUsage} from "../agent-budget.js";
const iso=()=>new Date().toISOString();
export const LIGHT_STATES=Object.freeze(["OBSERVED","PROPOSED","WORKTREE_CREATED","IMPLEMENTING","TESTING","SECURITY_REVIEW","SHADOW_REVIEW","STAGED","PROMOTION_ELIGIBLE","PROMOTED","MONITORED","ROLLED_BACK","REJECTED"]);
const transitions={
OBSERVED:["PROPOSED","REJECTED"],PROPOSED:["WORKTREE_CREATED","REJECTED"],WORKTREE_CREATED:["IMPLEMENTING","TESTING","REJECTED"],IMPLEMENTING:["TESTING","REJECTED"],
TESTING:["SECURITY_REVIEW","REJECTED"],SECURITY_REVIEW:["SHADOW_REVIEW","REJECTED"],SHADOW_REVIEW:["STAGED","REJECTED"],STAGED:["PROMOTION_ELIGIBLE","REJECTED"],
PROMOTION_ELIGIBLE:["PROMOTED","REJECTED"],PROMOTED:["MONITORED","ROLLED_BACK"],MONITORED:["ROLLED_BACK"],ROLLED_BACK:[],REJECTED:[]
};
export class LightCoordinator{
  constructor({root,stateRoot,audit=null,maxWorkers=2}={}){
    this.root=root;this.stateRoot=stateRoot;this.audit=audit;this.db=new GovernanceDb(stateRoot);this.registry=new LightAgentRegistry();
    this.worktrees=new WorktreeManager({root,stateRoot,audit});this.evaluator=new PatchEvaluator();this.promotion=new PromotionGate({audit});this.maxWorkers=Math.max(1,Math.min(8,Number(maxWorkers)||2));
  }
  status(){const patches=this.list({limit:10000}),active=patches.filter(x=>!["PROMOTED","MONITORED","ROLLED_BACK","REJECTED"].includes(x.state)).length;return {state:"SUCCESS",mode:"ISOLATED_WORKTREE_ONLY",maxWorkers:this.maxWorkers,agents:this.registry.list().length,patches:patches.length,active,worktreeAvailable:this.worktrees.available(),directMainCommit:false};}
  get(id){return this.db.get("light-patch",id).record||null;}
  list({limit=100,state=null}={}){let rows=this.db.list("light-patch",limit).records||[];if(state)rows=rows.filter(x=>x.state===state);return rows;}
  _transition(id,state,event={}){
    const cur=this.db.get("light-patch",id);if(!cur.record)return {state:"FAILURE",message:"Light patch not found."};
    if(!LIGHT_STATES.includes(state)||!transitions[cur.record.state]?.includes(state))return {state:"BLOCKED",message:`Illegal light transition ${cur.record.state} -> ${state}.`};
    const body={...cur.record,state,updatedAt:iso()};const r=this.db.cas("light-patch",id,cur.version,body,{type:"light.transition",from:cur.record.state,to:state,...event});
    if(r.state==="SUCCESS")this.audit?.append({type:"light.patch.transition",patchId:id,from:cur.record.state,to:state});return r.state==="SUCCESS"?body:r;
  }
  propose({agentType,objective,baseRef="HEAD",risk=null,dependencies=[],budget={}}={}){
    const profile=this.registry.get(agentType);if(!profile)return {state:"BLOCKED",message:"Unknown light-agent type.",available:this.registry.list().map(x=>x.id)};
    if(!String(objective||"").trim())return {state:"BLOCKED",message:"Patch objective is required."};
    const active=this.list({limit:10000}).filter(x=>!["PROMOTED","MONITORED","ROLLED_BACK","REJECTED"].includes(x.state)).length;
    if(active>=this.maxWorkers)return {state:"BLOCKED",message:"Light-agent worker pool is at its bounded concurrency limit.",active,maxWorkers:this.maxWorkers};
    const id="light-"+crypto.randomUUID(),now=iso(),record={id,agentType:profile.id,objective:String(objective).slice(0,20000),baseRef:String(baseRef||"HEAD"),state:"OBSERVED",
      budget:normalizeAgentBudget(budget),usage:zeroUsage(),changedFiles:[],reason:String(objective).slice(0,4000),tests:[],risk:risk||profile.risk||"medium",dependencies,rollbackPoint:baseRef,evidence:[],createdAt:now,updatedAt:now};
    const r=this.db.create("light-patch",record);if(r.state!=="SUCCESS")return r;const proposed=this._transition(id,"PROPOSED",{reason:"light-agent-proposal"});return {state:"SUCCESS",patch:proposed,profile};
  }
  createWorktree(id){
    const patch=this.get(id);if(!patch)return {state:"FAILURE",message:"Light patch not found."};if(patch.state!=="PROPOSED")return {state:"BLOCKED",message:"Patch must be PROPOSED before worktree creation."};
    const w=this.worktrees.create(id,patch.baseRef);if(w.state!=="SUCCESS")return w;const next=this._transition(id,"WORKTREE_CREATED",{worktree:w.worktree.path});
    return {state:"SUCCESS",patch:next,worktree:w.worktree};
  }
  recordImplementation(id,{changedFiles=[],evidence=[]}={}){
    const cur=this.db.get("light-patch",id);if(!cur.record)return {state:"FAILURE",message:"Light patch not found."};
    if(!["WORKTREE_CREATED","IMPLEMENTING"].includes(cur.record.state))return {state:"BLOCKED",message:"Patch is not in an implementation state."};
    let record=cur.record,version=cur.version;if(record.state==="WORKTREE_CREATED"){record={...record,state:"IMPLEMENTING"};const a=this.db.cas("light-patch",id,version,record,{type:"light.transition",to:"IMPLEMENTING"});if(a.state!=="SUCCESS")return a;version=a.version;}
    const body={...record,changedFiles:[...new Set(changedFiles.map(String))],evidence:Array.isArray(evidence)?evidence:[],updatedAt:iso()};const r=this.db.cas("light-patch",id,version,body,{type:"light.implementation.recorded"});
    return r.state==="SUCCESS"?{state:"SUCCESS",patch:body}:r;
  }
  evaluate(id,input={}){
    let patch=this.get(id);if(!patch)return {state:"FAILURE",message:"Light patch not found."};
    if(patch.state==="IMPLEMENTING")patch=this._transition(id,"TESTING");if(patch.state!=="TESTING")return {state:"BLOCKED",message:"Patch must reach TESTING before evaluation.",current:patch.state};
    const ev=this.evaluator.evaluate({...input,changedFiles:input.changedFiles||patch.changedFiles,dependencies:input.dependencies||patch.dependencies,risk:input.risk||patch.risk,evidence:input.evidence||patch.evidence});
    if(!ev.eligible){this._transition(id,"REJECTED",{blockers:ev.blockers});return {...ev,patch:this.get(id)};}
    this._transition(id,"SECURITY_REVIEW");this._transition(id,"SHADOW_REVIEW");this._transition(id,"STAGED");
    const cur=this.db.get("light-patch",id),body={...cur.record,tests:ev.evidenceRecord.tests,evidence:[...(cur.record.evidence||[]),ev.evidenceRecord],evaluation:ev,updatedAt:iso()};
    this.db.cas("light-patch",id,cur.version,body,{type:"light.evidence.recorded"});return {state:"SUCCESS",patch:body,evaluation:ev};
  }
  markPromotionEligible(id,authorization){
    const patch=this.get(id);if(!patch)return {state:"FAILURE",message:"Light patch not found."};if(patch.state!=="STAGED")return {state:"BLOCKED",message:"Only STAGED patches can enter the promotion gate."};
    const checks=patch.evaluation?.checks||{},gate=this.promotion.evaluate({kind:"light",record:patch,authorization,checks});
    if(!gate.eligible)return gate;const next=this._transition(id,"PROMOTION_ELIGIBLE",{authorizedBy:gate.authorizedBy});return {state:"SUCCESS",patch:next,promotion:gate,message:"Patch is promotion-eligible. This action does not merge or commit to protected main."};
  }
  recordPromoted(id,authorization){
    const patch=this.get(id);if(!patch)return {state:"FAILURE",message:"Light patch not found."};
    if(patch.state!=="PROMOTION_ELIGIBLE")return {state:"BLOCKED",message:"Patch is not promotion-eligible."};
    if(!authorization?.allowed||!authorization?.auth?.authenticated||authorization.auth.role!=="owner")return {state:"DENIED",message:"Authenticated local-owner authority is required to record promotion."};
    const next=this._transition(id,"PROMOTED",{authorizedBy:authorization.auth.identityId});return {state:"SUCCESS",patch:next,message:"Promotion recorded. Source merging remains outside the light-agent authority boundary."};
  }
  rollback(id,reason="rollback"){
    const patch=this.get(id);if(!patch)return {state:"FAILURE",message:"Light patch not found."};
    const cleanup=this.worktrees.remove(id,reason);if(["PROMOTED","MONITORED"].includes(patch.state))return {state:"SUCCESS",patch:this._transition(id,"ROLLED_BACK",{reason}),cleanup};
    if(!["ROLLED_BACK","REJECTED"].includes(patch.state))return {state:"SUCCESS",patch:this._transition(id,"REJECTED",{reason}),cleanup};
    return {state:"SUCCESS",patch,cleanup};
  }
}
