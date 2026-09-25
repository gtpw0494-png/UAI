const clean=x=>String(x??"").trim();
const connected=h=>h?.availability==="CONNECTED"&&h?.executable!==false;
const quality=e=>{
  if(!e||typeof e!=="object")return 0;
  const vals=["groundedness","toolAccuracy","answerQuality","reliability"].map(k=>Number(e[k])).filter(Number.isFinite);
  return vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:0;
};
function candidateScore(c,r){
  let s=100;
  if(c.local)s+=r.privacy==="local-only"?50:15;
  if(c.offline)s+=r.offline?30:5;
  if((c.tasks||[]).includes(r.task))s+=30;
  if((c.modalities||["text"]).includes(r.modality||"text"))s+=20;
  if(c.contextTokens&&r.contextTokens&&c.contextTokens>=r.contextTokens)s+=10;
  if(r.maxLatencyMs&&c.latencyMs&&c.latencyMs>r.maxLatencyMs)s-=25;
  s+=quality(c.evaluation)*20;
  return s;
}
function satisfies(c,r){
  if(r.privacy==="local-only"&&!c.local)return false;
  if(r.offline&&!c.offline)return false;
  if(r.task&&(c.tasks||[]).length&&!(c.tasks||[]).includes(r.task))return false;
  if(r.modality&&(c.modalities||[]).length&&!(c.modalities||[]).includes(r.modality))return false;
  if(r.contextTokens&&c.contextTokens&&c.contextTokens<r.contextTokens)return false;
  return true;
}
export class ModelRouter{
  constructor({candidates=[],audit=null}={}){
    this.candidates=[...candidates];this.audit=audit;
  }
  describe(){
    return {state:"SUCCESS",candidates:this.candidates.map(c=>({id:c.id,provider:c.provider,local:Boolean(c.local),offline:Boolean(c.offline),privacy:c.privacy||null,tasks:c.tasks||[],modalities:c.modalities||["text"],contextTokens:c.contextTokens||null,evaluation:c.evaluation||null}))};
  }
  async probe(){
    const out=[];
    for(const c of this.candidates){
      let h;
      try{h=await c.health();}catch(e){h={availability:"UNAVAILABLE",executable:false,reason:String(e.message||e)};}
      out.push({id:c.id,provider:c.provider,...h});
    }
    return out;
  }
  async route(requirements={}){
    const r={task:"chat",modality:"text",privacy:"local-only",offline:false,...requirements};
    const health=await this.probe(),ranked=[];
    for(const c of this.candidates){
      const h=health.find(x=>x.id===c.id)||{availability:"UNAVAILABLE",executable:false};
      if(!connected(h)||!satisfies(c,r))continue;
      ranked.push({candidate:c,health:h,score:candidateScore(c,r)});
    }
    ranked.sort((a,b)=>b.score-a.score||String(a.candidate.id).localeCompare(String(b.candidate.id)));
    if(!ranked.length)return {state:"UNAVAILABLE",message:"No connected model satisfies the requested execution constraints.",requirements:r,candidates:health};
    return {
      state:"SUCCESS",
      requirements:r,
      selected:{id:ranked[0].candidate.id,provider:ranked[0].candidate.provider,score:ranked[0].score,health:ranked[0].health},
      alternatives:ranked.slice(1,4).map(x=>({id:x.candidate.id,provider:x.candidate.provider,score:x.score,health:x.health})),
      ranked
    };
  }
  async generate(requirements={},prompt="",options={}){
    const route=await this.route(requirements);
    if(route.state!=="SUCCESS")return route;
    const attempts=[];
    const {acceptResult=null,...generationOptions}=options||{};
    for(const item of route.ranked){
      let result;
      const started=Date.now();
      try{result=await item.candidate.generate({prompt:String(prompt),...generationOptions});}
      catch(e){result={state:"ERROR",message:String(e.message||e)};}
      const text=clean(result?.text||result?.message);
      const accepted=result?.state==="SUCCESS"&&text&&(!acceptResult||acceptResult(text,result)!==false);
      const attempt={id:item.candidate.id,provider:item.candidate.provider,state:accepted?"SUCCESS":(result?.state==="SUCCESS"?"REJECTED_OUTPUT":result?.state||"UNKNOWN"),latencyMs:Date.now()-started};
      attempts.push(attempt);
      if(accepted){
        const out={...result,state:"SUCCESS",text,route:{requirements:route.requirements,selected:{id:item.candidate.id,provider:item.candidate.provider,score:item.score},alternatives:route.alternatives,attempts}};
        this.audit?.append({type:"model.route.generate",selected:item.candidate.id,provider:item.candidate.provider,attempts,requirements:route.requirements});
        return out;
      }
    }
    this.audit?.append({type:"model.route.failure",attempts,requirements:route.requirements});
    return {state:"UNAVAILABLE",message:"Connected model candidates did not produce a usable runtime result.",requirements:route.requirements,attempts,candidates:route.candidates};
  }
}

export function buildLocalModelCandidates({llamaRuntime=null,forgelm=null}={}){
  const out=[];
  if(llamaRuntime)out.push({
    id:"llamacpp-local",provider:"llama.cpp",local:true,offline:true,privacy:"local-only",
    tasks:["chat","planning","summarization","reasoning"],modalities:["text"],contextTokens:null,
    health:async()=>{const s=await llamaRuntime.status();return {...s,executable:s.executable!==false&&s.availability==="CONNECTED"};},
    generate:async({prompt,system="",maxTokens=768,model="local",messages=null,tools=null,temperature=0.7})=>llamaRuntime.chat(prompt,{system,maxTokens,model,messages,tools,temperature})
  });
  if(forgelm)out.push({
    id:"forgelm-local",provider:"forgelm",local:true,offline:true,privacy:"local-only",
    tasks:["chat","classification","summarization"],modalities:["text"],contextTokens:null,
    health:async()=>{const s=await forgelm.status();const ok=s?.state==="SUCCESS"&&s?.checkpointExists===true;return {availability:ok?"CONNECTED":"UNAVAILABLE",executable:ok,reason:ok?"Verified ForgeLM checkpoint is locally available.":(s?.message||"ForgeLM checkpoint is unavailable."),evidence:s};},
    generate:async({prompt,system="",maxTokens=384})=>forgelm.chat([system,prompt].filter(Boolean).join("\n\n"),maxTokens)
  });
  return out;
}
