import crypto from "node:crypto";
import {PlatformStateStore} from "./platform-state-store.js";

const list=v=>[...(Array.isArray(v)?v:[])].map(x=>String(x).trim()).filter(Boolean);
function rng(seed){let s=Number.parseInt(crypto.createHash("sha256").update(String(seed)).digest("hex").slice(0,8),16)>>>0;return()=>((s=(1664525*s+1013904223)>>>0)/4294967296);}

export class ForgeCanary{
  constructor({stateRoot,audit=null}={}){this.db=new PlatformStateStore(stateRoot);this.audit=audit;}
  createProfile({name="Synthetic user",device="android",network="variable",experience="mixed",behaviors=[],permissions=[],traits={}}={}){
    const profile={id:"canary-profile-"+crypto.randomUUID(),schema:"uai.forgecanary.profile.v1",name:String(name),device:String(device),network:String(network),experience:String(experience),behaviors:list(behaviors),permissions:list(permissions),traits:traits&&typeof traits==="object"?traits:{},synthetic:true,realIdentity:false,realCredentials:false,state:"ACTIVE",createdAt:new Date().toISOString()};
    const out=this.db.create("forge-canary-profile",profile);this.audit?.append?.({type:"forgecanary.profile.created",profileId:profile.id});return out.state==="SUCCESS"?{state:"SUCCESS",profile}:out;
  }
  getProfile(id){return this.db.get("forge-canary-profile",id);}
  getRun(id){return this.db.get("forge-canary-run",id);}
  profiles(limit=100){return this.db.list("forge-canary-profile",limit).records||[];}
  simulate({profileId,seed=null,days=7,buildRef=null,failureArchetypes=[]}={}){
    const found=this.getProfile(profileId);if(found.state!=="SUCCESS")return {state:"UNAVAILABLE",message:"Canary profile not found."};
    const profile=found.record,worldSeed=seed||crypto.randomBytes(16).toString("hex"),random=rng(worldSeed),n=Math.max(1,Math.min(90,Number(days)||7)),events=[],failures=list(failureArchetypes);
    const networks=profile.network==="variable"?["offline","unstable","online"]:[profile.network];
    for(let day=1;day<=n;day++){
      const network=networks[Math.floor(random()*networks.length)]||"unknown";
      const interrupted=(profile.behaviors.includes("interrupts")||random()<0.25)&&random()<0.7;
      const lowMemory=profile.device.toLowerCase().includes("low")||profile.traits?.lowMemory===true||random()<0.15;
      const injected=failures.length&&random()<0.35?failures[Math.floor(random()*failures.length)]:null;
      events.push({day,network,interrupted,lowMemory,failureArchetype:injected});
    }
    const run={id:"canary-run-"+crypto.randomUUID(),schema:"uai.forgecanary.run.v1",profileId:profile.id,buildRef:buildRef?String(buildRef):null,seed:worldSeed,events,synthetic:true,isolated:true,realWorldEffects:false,realIdentity:false,realCredentials:false,trainingEligible:false,state:"SUCCESS",createdAt:new Date().toISOString()};
    const out=this.db.create("forge-canary-run",run);this.audit?.append?.({type:"forgecanary.run.completed",runId:run.id,profileId:profile.id,events:events.length});return out.state==="SUCCESS"?{state:"SUCCESS",run}:out;
  }
  runs(limit=100){return this.db.list("forge-canary-run",limit).records||[];}
  status(){return {state:"SUCCESS",profiles:this.profiles(10000).length,runs:this.runs(10000).length,realWorldEffects:false};}
}
