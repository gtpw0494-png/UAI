import crypto from "node:crypto";

export class CloudKnowledgeStore {
  constructor({ endpoint=process.env.IUV_KNOWLEDGE_CLOUD_URL||"", apiKey=process.env.IUV_KNOWLEDGE_CLOUD_KEY||"", table=process.env.IUV_KNOWLEDGE_CLOUD_TABLE||"uai_verified_knowledge", fetchImpl=globalThis.fetch }={}) {
    this.endpoint=String(endpoint||"").replace(/\/$/,""); this.apiKey=String(apiKey||""); this.table=table; this.fetch=fetchImpl;
  }
  status(){return{state:this.endpoint&&this.apiKey?"AVAILABLE":"UNAVAILABLE",configured:Boolean(this.endpoint&&this.apiKey),provider:"postgres-rest-compatible",table:this.table,required:["IUV_KNOWLEDGE_CLOUD_URL","IUV_KNOWLEDGE_CLOUD_KEY"],truth:"Cloud storage is optional and is not CONNECTED until a live write/read succeeds."}}
  headers(extra={}){return{"content-type":"application/json","apikey":this.apiKey,"authorization":`Bearer ${this.apiKey}`,...extra}}
  async putMany(facts=[]){
    if(!this.status().configured)return{state:"UNAVAILABLE",written:0,message:"Cloud knowledge store is not configured."};
    const rows=facts.filter(x=>x?.verification?.verified&&x?.training_eligible).map(x=>({...x,cloud_record_id:x.fact_id||crypto.createHash("sha256").update(JSON.stringify(x)).digest("hex")}));
    if(!rows.length)return{state:"SUCCESS",written:0};
    try{const r=await this.fetch(`${this.endpoint}/rest/v1/${encodeURIComponent(this.table)}?on_conflict=cloud_record_id`,{method:"POST",headers:this.headers({prefer:"resolution=merge-duplicates,return=minimal"}),body:JSON.stringify(rows)});return r.ok?{state:"SUCCESS",written:rows.length,httpStatus:r.status}:{state:"FAILURE",written:0,httpStatus:r.status,message:"Cloud write rejected."}}catch(e){return{state:"UNAVAILABLE",written:0,message:String(e?.message||e)}}
  }
}
export default CloudKnowledgeStore;
