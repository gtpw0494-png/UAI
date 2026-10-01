import crypto from "node:crypto";
import {PlatformStateStore} from "./platform-state-store.js";
const worlds=new Set(["RepoWorld","DeviceWorld","WebWorld","SecurityWorld","BusinessWorld","RecoveryWorld","ChaosWorld","SnakeWorld"]);
export class ForgeDreamLab{
 constructor({stateRoot,audit=null}={}){this.db=new PlatformStateStore(stateRoot);this.audit=audit;}
 create({world="ChaosWorld",seed=null,objective="",constraints=[],mutations=[],sourceContext=null}={}){
  if(!worlds.has(world))return {state:"BLOCKED",message:"Unknown ForgeDream world."};
  const run={id:"dream-"+crypto.randomUUID(),schema:"uai.forgedream.v2",world,worldSeed:seed||crypto.randomBytes(16).toString("hex"),objective:String(objective),constraints:[...constraints],actions:[],policyDecisions:[],failures:[],recovery:[],verifiedResult:null,score:null,mutations:[...mutations],sourceContext:sourceContext&&typeof sourceContext==="object"?sourceContext:null,isolated:true,realWorldEffects:false,state:"CREATED",trainingEligible:false,createdAt:new Date().toISOString()};
  const r=this.db.create("forgedream-run",run);this.audit?.append?.({type:"forgedream.created",runId:run.id,world,seed:run.worldSeed,sourceContext:run.sourceContext});return r.state==="SUCCESS"?{state:"SUCCESS",run}:r;
 }
 createFromCanary({canaryRun,objective="",world="ChaosWorld",constraints=[]}={}){
  if(!canaryRun?.synthetic||canaryRun.realWorldEffects!==false)return {state:"BLOCKED",message:"ForgeDream accepts only isolated synthetic Canary runs."};
  const mutations=(canaryRun.events||[]).slice(0,200).map(e=>({type:"canary-condition",day:e.day,network:e.network,interrupted:Boolean(e.interrupted),lowMemory:Boolean(e.lowMemory),failureArchetype:e.failureArchetype||null}));
  return this.create({world,seed:canaryRun.seed||null,objective:objective||"Replay ForgeCanary scenario "+canaryRun.id,constraints:[...constraints,"synthetic canary input only","no real-world effects","no self approval"],mutations,sourceContext:{type:"forgecanary",runId:canaryRun.id,profileId:canaryRun.profileId||null,buildRef:canaryRun.buildRef||null}});
 }
 finish(id,{actions=[],policyDecisions=[],failures=[],recovery=[],verifiedResult=null,score=0}={}){
  const found=this.db.get("forgedream-run",id),run=found.record;if(!run)return {state:"UNAVAILABLE",message:"ForgeDream run not found."};
  const truth=verifiedResult?.state||"UNKNOWN",done={...run,actions,policyDecisions,failures,recovery,verifiedResult,score:Number(score),state:truth,trainingEligible:truth==="SUCCESS"&&verifiedResult?.verified===true,completedAt:new Date().toISOString()};
  const r=this.db.cas("forgedream-run",id,found.version,done,{type:"finish",state:truth,score:done.score});this.audit?.append?.({type:"forgedream.finished",runId:id,state:truth,trainingEligible:done.trainingEligible,score:done.score});return r.state==="SUCCESS"?{state:"SUCCESS",run:done}:r;
 }
 worlds(){return [...worlds];}
 list(limit=100){return this.db.list("forgedream-run",limit).records||[];}
 trainingCandidates(limit=100){return this.list(limit).filter(x=>x.trainingEligible===true&&x.state==="SUCCESS"&&x.verifiedResult?.verified===true);}
 status(){const runs=this.list(10000);return {state:"SUCCESS",worlds:this.worlds(),runs:runs.length,trainingEligible:runs.filter(x=>x.trainingEligible===true).length,realWorldEffects:false};}
}
