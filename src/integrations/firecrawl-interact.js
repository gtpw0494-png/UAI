const trimSlash = value => String(value || "").replace(/\/+$/, "");
const now = () => new Date().toISOString();

export class FirecrawlInteractAdapter {
  constructor({apiKey=process.env.FIRECRAWL_API_KEY||"",baseUrl=process.env.FIRECRAWL_BASE_URL||"https://api.firecrawl.dev",audit=null,fetchImpl=globalThis.fetch}={}) {
    this.apiKey=apiKey; this.baseUrl=trimSlash(baseUrl); this.audit=audit; this.fetchImpl=fetchImpl;
  }
  status() {
    return {id:"firecrawl-interact",availability:this.apiKey?"CONFIGURED":"UNAVAILABLE",executable:Boolean(this.apiKey),external:true,trust:"UNTRUSTED_INPUT",capabilities:["scrape","interact-prompt","interact-code","session-stop"],checkedAt:now()};
  }
  _headers(){return {"content-type":"application/json",authorization:`Bearer ${this.apiKey}`};}
  _blocked(message){return {state:"BLOCKED",provider:"firecrawl",message};}
  async _request(path,{method="POST",body}={}) {
    if(!this.apiKey)return {state:"UNAVAILABLE",provider:"firecrawl",message:"Configure FIRECRAWL_API_KEY."};
    try{
      const r=await this.fetchImpl(`${this.baseUrl}${path}`,{method,headers:this._headers(),body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(Number(process.env.UAI_FIRECRAWL_TIMEOUT_MS||60000))});
      const raw=await r.text(); let json; try{json=JSON.parse(raw);}catch{json={raw:raw.slice(0,4000)};}
      if(!r.ok)return {state:r.status===401||r.status===403?"DENIED":"ERROR",provider:"firecrawl",message:`HTTP ${r.status}: ${JSON.stringify(json).slice(0,1200)}`};
      const evidence={type:"firecrawl-interact",path,method,at:now(),external:true,trust:"UNTRUSTED_INPUT"}; this.audit?.append?.(evidence);
      return {state:"SUCCESS",provider:"firecrawl",data:json,evidence:[evidence]};
    }catch(error){return {state:"ERROR",provider:"firecrawl",message:String(error?.message||error)};}
  }
  async scrape(url,{formats=["markdown"],profile=null}={}) {
    let parsed; try{parsed=new URL(url);}catch{return this._blocked("A valid http(s) URL is required.");}
    if(!["http:","https:"].includes(parsed.protocol))return this._blocked("Only http(s) URLs are allowed.");
    const body={url:parsed.href,formats}; if(profile)body.profile=profile;
    return this._request("/v2/scrape",{body});
  }
  async interact(scrapeId,{prompt=null,code=null,language="node",timeout=30,approvedCode=false}={}) {
    if(!scrapeId)return this._blocked("scrapeId is required.");
    if(Boolean(prompt)===Boolean(code))return this._blocked("Provide exactly one of prompt or code.");
    if(code&&!approvedCode)return this._blocked("Browser code execution requires an independently approved UAI action envelope.");
    if(code&&!["node","python","bash"].includes(language))return this._blocked("Unsupported interaction language.");
    const body=prompt?{prompt}:{code,language,timeout};
    return this._request(`/v2/scrape/${encodeURIComponent(scrapeId)}/interact`,{body});
  }
  stop(scrapeId){if(!scrapeId)return Promise.resolve(this._blocked("scrapeId is required."));return this._request(`/v2/scrape/${encodeURIComponent(scrapeId)}/interact`,{method:"DELETE"});}
}
