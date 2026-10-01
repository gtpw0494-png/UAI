import crypto from "node:crypto";
import {PlatformStateStore} from "./platform-state-store.js";

const cleanList=value=>[...(Array.isArray(value)?value:[])].map(x=>String(x).trim()).filter(Boolean);
const words=value=>new Set(String(value||"").toLowerCase().match(/[a-z0-9][a-z0-9_-]{2,}/g)||[]);

export class ForgeMuseum{
  constructor({stateRoot,audit=null}={}){this.db=new PlatformStateStore(stateRoot);this.audit=audit;}
  retire({name,purpose="",failedBecause=[],replacedBy=null,resurrectionConditions=[],evidence=[],sourceVersion=null,notes=""}={}){
    const title=String(name||"").trim();if(!title)return {state:"BLOCKED",message:"Exhibit name is required."};
    const exhibit={id:"museum-"+crypto.randomUUID(),schema:"uai.forgemuseum.v1",name:title,purpose:String(purpose||""),failedBecause:cleanList(failedBecause),replacedBy:replacedBy?String(replacedBy):null,resurrectionConditions:cleanList(resurrectionConditions),evidence:Array.isArray(evidence)?evidence:[],sourceVersion:sourceVersion?String(sourceVersion):null,notes:String(notes||""),state:"RETIRED",trainingEligible:false,automaticResurrection:false,createdAt:new Date().toISOString()};
    const out=this.db.create("forge-museum-exhibit",exhibit);this.audit?.append?.({type:"forgemuseum.retired",exhibitId:exhibit.id,name:exhibit.name});return out.state==="SUCCESS"?{state:"SUCCESS",exhibit}:out;
  }
  list(limit=100){return this.db.list("forge-museum-exhibit",limit).records||[];}
  resurrectionCandidates({conditions=[],limit=100}={}){
    const active=new Set(cleanList(conditions));const rows=this.list(limit).filter(x=>(x.resurrectionConditions||[]).length>0&&(x.resurrectionConditions||[]).every(c=>active.has(String(c))));
    return {state:"SUCCESS",candidates:rows.map(x=>({...x,resurrectionState:"ELIGIBLE_FOR_REVIEW",automaticResurrection:false}))};
  }
  match(text,{limit=5}={}){
    const q=words(text),rows=this.list(500).map(x=>{const d=words([x.name,x.purpose,...(x.failedBecause||[]),...(x.resurrectionConditions||[])].join(" "));let overlap=0;for(const w of q)if(d.has(w))overlap++;return {exhibit:x,score:q.size?overlap/q.size:0};}).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,Math.max(1,Math.min(50,Number(limit)||5)));
    return {state:"SUCCESS",matches:rows};
  }
  status(){const exhibits=this.list(10000);return {state:"SUCCESS",exhibits:exhibits.length,retired:exhibits.filter(x=>x.state==="RETIRED").length,automaticResurrection:false};}
}
