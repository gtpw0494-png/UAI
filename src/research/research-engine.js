import crypto from "node:crypto";

const words=s=>new Set(String(s||"").toLowerCase().match(/[a-z0-9]{3,}/g)||[]);
const overlap=(a,b)=>{const A=words(a),B=words(b);let n=0;for(const x of A)if(B.has(x))n++;return n/Math.max(1,A.size);};
const sentences=s=>String(s||"").split(/(?<=[.!?])\s+/).map(x=>x.trim()).filter(x=>x.length>45&&x.length<900);
function authority(domain=""){return /(^|\.)(gov|edu)$/.test(domain)||/\.gov\.|\.edu\./.test(domain)?3:/wikipedia\.org$/.test(domain)?2:1;}
function diversify(rows,max){
  const used=new Map(),out=[];
  for(const x of rows.sort((a,b)=>authority(b.domain)-authority(a.domain))){
    const n=used.get(x.domain)||0;if(n>=2)continue;used.set(x.domain,n+1);out.push(x);if(out.length>=max)break;
  }
  return out;
}
export class ResearchEngine{
  constructor({provider,documentStore=null,audit=null,maxSources=8}={}){this.provider=provider;this.documentStore=documentStore;this.audit=audit;this.maxSources=maxSources;}
  plan(query,{depth="standard"}={}){
    const q=String(query||"").trim(),parts=[q];
    if(depth==="deep"){
      parts.push(`${q} primary sources official documentation`,`${q} evidence limitations criticism`,`${q} latest developments`);
    }
    return {state:"SUCCESS",query:q,depth,queries:[...new Set(parts)].slice(0,4),strategy:"Search broadly, diversify domains, read selected pages, extract query-relevant evidence, preserve contradictory evidence, and synthesize only supported claims."};
  }
  async research(query,{depth="standard",maxSources=this.maxSources,store=true}={}){
    const plan=this.plan(query,{depth}),searches=[],all=[];
    for(const q of plan.queries){const s=await this.provider.search(q,{limit:10});searches.push({query:q,state:s.state,provider:s.provider,count:s.results?.length||0});if(s.results)all.push(...s.results);}
    const uniq=[];for(const r of all){if(!uniq.some(x=>x.url===r.url))uniq.push(r);}
    const selected=diversify(uniq,Math.max(2,Math.min(12,Number(maxSources)||8))),sources=[];
    for(const hit of selected){
      const page=await this.provider.open(hit.url);if(page.state!=="SUCCESS"||page.security?.risk==="HIGH")continue;
      const ranked=sentences(page.text).map(text=>({text,score:overlap(query,text)})).sort((a,b)=>b.score-a.score).filter(x=>x.score>0).slice(0,4);
      const source={source_id:"web-"+crypto.createHash("sha256").update(page.url).digest("hex").slice(0,16),title:page.title||hit.title,url:page.url,domain:page.domain,retrieved_at:page.retrievedAt,security:page.security,instruction_authority:"NONE",snippets:ranked};
      sources.push(source);
      if(store&&this.documentStore&&page.security?.risk!=="HIGH")await this.documentStore.ingest({source_id:source.source_id,source_name:source.title,source_type:"live-web-research",source_url:page.url,original_uri:page.url,canonical_uri:page.url,title:source.title,language:"unknown",mime_type:page.contentType,publisher:page.domain,retrieved_at:page.retrievedAt,license:"UNKNOWN",license_source:"UNVERIFIED",text:page.text,retrieval_eligible:true,source_training_eligible:false,training_approved:false,provenance:{researchQuery:query,instructionAuthority:"NONE"},security:page.security});
    }
    const evidence=sources.flatMap(s=>s.snippets.map(x=>({...x,source_id:s.source_id,title:s.title,url:s.url,domain:s.domain,retrieved_at:s.retrieved_at}))).sort((a,b)=>b.score-a.score);
    const state=evidence.length?"SUCCESS":sources.length?"PARTIAL":"UNAVAILABLE";
    const run={state,run_id:"research-"+crypto.randomUUID(),query,plan,searches,sources,evidence:evidence.slice(0,24),limitations:[],created_at:new Date().toISOString()};
    if(!sources.length)run.limitations.push("No readable public web sources were retrieved.");
    if(sources.length<3)run.limitations.push("Source diversity is limited; treat synthesis as preliminary.");
    if(sources.some(x=>x.security?.risk==="MEDIUM"))run.limitations.push("Some source text triggered medium-risk content signals and remains untrusted data.");
    this.audit?.append({type:"research.web.run",runId:run.run_id,query,depth,state,sources:sources.map(x=>x.url),evidenceCount:run.evidence.length});
    return run;
  }
}
