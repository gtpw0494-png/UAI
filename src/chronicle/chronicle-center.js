import crypto from "node:crypto";
import {PlatformStateStore} from "../platform-state-store.js";

const iso=()=>new Date().toISOString();
const canonical=v=>Array.isArray(v)?"["+v.map(canonical).join(",")+"]":v&&typeof v==="object"?"{"+Object.keys(v).sort().map(k=>JSON.stringify(k)+":"+canonical(v[k])).join(",")+"}":JSON.stringify(v);
const digest=v=>crypto.createHash("sha256").update(typeof v==="string"?v:canonical(v)).digest("hex");
const words=s=>String(s||"").toLowerCase().match(/[a-z0-9_.:+/-]{2,}/g)||[];

export class ChronicleCenter{
  constructor({stateRoot,audit=null,memoryStore=null,provenanceGraph=null,learning=null}={}){
    this.db=new PlatformStateStore(stateRoot);
    this.audit=audit;
    this.memoryStore=memoryStore;
    this.provenanceGraph=provenanceGraph;
    this.learning=learning;
  }
  _events(limit=10000){
    return this.db.list("chronicle-event",Math.max(1,Math.min(50000,Number(limit)||10000))).records||[];
  }
  status(){
    const rows=this._events();
    const latest=rows.at(-1)||null;
    const days=new Set(rows.map(x=>String(x.observedAt||x.createdAt||"").slice(0,10)).filter(Boolean));
    return {state:"SUCCESS",version:"0.74.0",events:rows.length,days:days.size,lastEventId:latest?.id||null,lastHash:latest?.integrity?.digest||null,trainingDefault:false,store:this.db.status()};
  }
  record({eventType,subjectId=null,sourceId="uai:runtime",ownerId=null,payload={},state="SUCCESS",verified=false,trainingEligible=false,observedAt=null,relations=[]}={}){
    const type=String(eventType||"").trim();
    if(!type)return {state:"BLOCKED",message:"eventType required."};
    const previous=this._events(50000).at(-1)||null;
    const id="chronicle-"+crypto.randomUUID();
    const body={id,eventType:type,subjectId:subjectId?String(subjectId):null,sourceId:String(sourceId||"uai:runtime"),ownerId:ownerId?String(ownerId):null,payload:payload&&typeof payload==="object"?payload:{value:payload},state:String(state||"UNKNOWN"),verified:verified===true,trainingEligible:trainingEligible===true&&verified===true,observedAt:observedAt||iso(),createdAt:iso(),previousHash:previous?.integrity?.digest||null};
    body.integrity={algorithm:"sha256",digest:digest({...body,integrity:undefined})};
    const stored=this.db.create("chronicle-event",body);
    if(stored.state!=="SUCCESS")return stored;
    let provenanceNode=null;
    if(this.provenanceGraph){
      const p=this.provenanceGraph.addNode({type:"chronicle-event",subjectId:id,sourceId:body.sourceId,ownerId:body.ownerId,hash:body.integrity.digest,metadata:{eventType:type,state:body.state,verified:body.verified}});
      provenanceNode=p?.node||null;
      for(const rel of Array.isArray(relations)?relations:[]){
        if(provenanceNode&&rel?.toNodeId&&rel?.relation)this.provenanceGraph.addEdge({fromId:provenanceNode.id,toId:rel.toNodeId,relation:String(rel.relation),metadata:rel.metadata||{}});
      }
    }
    this.audit?.append({type:"chronicle.recorded",chronicleId:id,eventType:type,subjectId:body.subjectId,state:body.state,verified:body.verified,trainingEligible:body.trainingEligible});
    return {state:"SUCCESS",event:body,provenanceNode};
  }
  recordChatTurn(record={}){
    if(!record?.id)return {state:"BLOCKED",message:"chat-turn record id required."};
    const attachments=(record.attachments||[]).map(a=>({id:a.id||null,modality:a.modality||null,label:a.label||null,sourceId:a.sourceId||null,contentHash:a.contentHash||null,bytes:Number(a.bytes||0)}));
    return this.record({eventType:"conversation.turn",subjectId:record.id,sourceId:"onechat:"+String(record.chatId||"unknown"),ownerId:record.ownerId||null,state:record.state||"UNKNOWN",verified:record.verified===true,trainingEligible:false,payload:{chatId:record.chatId||null,user:String(record.user||""),answer:String(record.answer||""),responseMode:record.responseMode||null,evidenceId:record.evidenceEnvelope?.id||null,evidenceDigest:record.evidenceEnvelope?.integrity?.digest||null,attachments}});
  }
  recordAction({actionId,capability,request,result,state,verified=false,ownerId=null,sourceId="action-fabric"}={}){
    return this.record({eventType:"action.result",subjectId:actionId||null,sourceId,ownerId,state:state||"UNKNOWN",verified,trainingEligible:false,payload:{capability:capability||null,request:request||{},result:result||{}}});
  }
  recall(query,{ownerId=null,limit=20,asOf=null}={}){
    const terms=words(query);if(!terms.length)return {state:"BLOCKED",message:"query required.",results:[]};
    let rows=this._events(50000);
    if(ownerId)rows=rows.filter(x=>!x.ownerId||x.ownerId===ownerId);
    if(asOf)rows=rows.filter(x=>String(x.observedAt||"")<=String(asOf));
    const scored=rows.map(x=>{const hay=words([x.eventType,x.subjectId,x.sourceId,canonical(x.payload)].join(" "));const set=new Set(hay);const score=terms.reduce((n,t)=>n+(set.has(t)?1:0),0)/(terms.length||1);return {score,event:x};}).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||String(b.event.observedAt).localeCompare(String(a.event.observedAt))).slice(0,Math.max(1,Math.min(200,Number(limit)||20)));
    this.audit?.append({type:"chronicle.recall",query:String(query).slice(0,500),ownerId:ownerId||null,results:scored.length});
    return {state:"SUCCESS",query,asOf:asOf||null,results:scored};
  }
  timeline(subjectId,{limit=200}={}){
    const id=String(subjectId||"").trim();if(!id)return {state:"BLOCKED",message:"subjectId required.",events:[]};
    const events=this._events(50000).filter(x=>x.subjectId===id).slice(-Math.max(1,Math.min(2000,Number(limit)||200)));
    return {state:"SUCCESS",subjectId:id,events};
  }
  digest(day=new Date().toISOString().slice(0,10)){
    const rows=this._events(50000).filter(x=>String(x.observedAt||x.createdAt||"").slice(0,10)===day);
    const counts={};for(const x of rows)counts[x.eventType]=(counts[x.eventType]||0)+1;
    const summary={day,newEvents:rows.length,eventTypes:counts,verified:rows.filter(x=>x.verified).length,failed:rows.filter(x=>!["SUCCESS","PARTIAL"].includes(x.state)).length,subjects:[...new Set(rows.map(x=>x.subjectId).filter(Boolean))].slice(0,500)};
    const hash=digest(summary);
    const existing=(this.db.list("chronicle-digest",10000,{day}).records||[]).at(-1);
    if(existing)return {state:"SUCCESS",digest:existing,reused:true};
    const rec={id:"chronicle-digest-"+day+"-"+hash.slice(0,12),day,summary,integrity:{algorithm:"sha256",digest:hash},createdAt:iso()};
    const r=this.db.create("chronicle-digest",rec);
    if(r.state==="SUCCESS")this.audit?.append({type:"chronicle.digest",day,eventCount:rows.length,digest:hash});
    return r.state==="SUCCESS"?{state:"SUCCESS",digest:rec,reused:false}:r;
  }
}