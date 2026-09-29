import crypto from "node:crypto";
import {PlatformStateStore} from "./platform-state-store.js";
const worlds=new Set(["RepoWorld","DeviceWorld","WebWorld","SecurityWorld","BusinessWorld","RecoveryWorld","ChaosWorld","SnakeWorld"]);
export class ForgeDreamLab{
 constructor({stateRoot,audit=null}={}){this.db=new PlatformStateStore(stateRoot);this.audit=audit;}
 create({world="ChaosWorld",seed=null,objective="",constraints=[],mutations=[]}={}){
  if(!worlds.has(world))return {state:"BLOCKED",message:"Unknown ForgeDream world."};
  const run={id:"dream-"+crypto.randomUUID(),schema:"uai.forgedream.v1",world,worldSeed:seed||crypto.randomBytes(16).toString("hex"),objective:String(objective),constraints:[...constraints],actions:[],policyDecisions:[],failures:[],recovery:[],verifiedResult:null,score:null,mutations:[...mutations],isolated:true,realWorldEffects:false,state:"CREATED",trainingEligible:false,createdAt:new Date().toISOString()};
  const r=this.db.create("forgedream-run",run);this.audit?.append?.({type:"forgedream.created",runId:run.id,world,seed:run.worldSeed});return r.state==="SUCCESS"?{state:"SUCCESS",run}:r;
 }
 finish(id,{actions=[],policyDecisions=[],failures=[],recovery=[],verifiedResult=null,score=0}={}){
  const run=this.db.get("forgedream-run",id).record;if(!run)return {state:"UNAVAILABLE",message:"ForgeDream run not found."};
  const truth=verifiedResult?.state||"UNKNOWN",done={...run,actions,policyDecisions,failures,recovery,verifiedResult,score:Number(score),state:truth,trainingEligible:truth==="SUCCESS"&&verifiedResult?.verified===true,completedAt:new Date().toISOString()};
  const r=this.db.create("forgedream-run",done,{replace:true});this.audit?.append?.({type:"forgedream.finished",runId:id,state:truth,trainingEligible:done.trainingEligible,score:done.score});return r.state==="SUCCESS"?{state:"SUCCESS",run:done}:r;
 }
 worlds(){return [...worlds];}
 list(limit=100){return this.db.list("forgedream-run",limit).records||[];}
}
