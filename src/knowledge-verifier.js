import crypto from "node:crypto";

const hostOf=(u)=>{try{return new URL(u).hostname.toLowerCase()}catch{return ""}};
const domainMatches=(host,domain)=>host===domain||host.endsWith("."+domain);

export class KnowledgeVerifier {
  constructor({registry=[],minTrust=0.8,minIndependentSources=2}={}) {
    this.registry=Array.isArray(registry)?registry:[];
    this.minTrust=minTrust; this.minIndependentSources=minIndependentSources;
    this.sources=new Map(this.registry.filter(x=>x?.allowed).map(x=>[String(x.id),x]));
  }
  normalize(raw={}) {
    const source=this.sources.get(String(raw.source_id||""));
    const sourceUrl=String(raw.source_url||"");
    const host=hostOf(sourceUrl);
    const sourceDomain=String(source?.domain||"").toLowerCase();
    const sourceValid=Boolean(source && host && domainMatches(host,sourceDomain));
    return {
      subject:String(raw.subject||"").trim(),
      claim:String(raw.claim||"").replace(/\s+/g," ").trim(),
      source_id:String(raw.source_id||"unknown"),
      source_url:sourceUrl,
      source_trust:sourceValid?Number(source.trust||0):0,
      source_valid:sourceValid,
      observed_at:raw.observed_at||new Date().toISOString(),
      content_hash:raw.content_hash||null,
      metadata:raw.metadata&&typeof raw.metadata==="object"?raw.metadata:{}
    };
  }
  verifyGroup(items=[]) {
    const normalized=items.map(x=>this.normalize(x)).filter(x=>x.subject&&x.claim);
    const groups=new Map();
    for(const x of normalized){
      const key=crypto.createHash("sha256").update(x.subject.toLowerCase()+"|"+x.claim.toLowerCase()).digest("hex");
      if(!groups.has(key))groups.set(key,[]); groups.get(key).push(x);
    }
    const facts=[];
    for(const [claim_hash,group] of groups){
      const valid=group.filter(x=>x.source_valid&&x.source_trust>=this.minTrust);
      const independent=[...new Set(valid.map(x=>x.source_id))];
      const verified=independent.length>=this.minIndependentSources;
      const primary=valid.sort((a,b)=>b.source_trust-a.source_trust)[0]||group[0];
      facts.push({...primary,claim_hash,corroboration:independent.length,supporting_sources:valid.map(x=>({source_id:x.source_id,source_url:x.source_url,trust:x.source_trust,content_hash:x.content_hash})),verification:{verified,method:"independent-approved-source-corroboration",required_sources:this.minIndependentSources,independent_sources:independent.length},training_eligible:verified});
    }
    return {state:"SUCCESS",total_candidates:normalized.length,claims:facts.length,verified:facts.filter(x=>x.verification.verified).length,facts};
  }
}
export default KnowledgeVerifier;
