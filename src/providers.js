const trimSlash = s => String(s || "").replace(/\/+$/, "");
const env = name => process.env[name] || "";
const now = () => new Date().toISOString();

// Provider definitions intentionally describe integration capabilities, not availability.
// A provider becomes CONNECTED only after a successful runtime call.
const PROVIDERS = [
  { id:"openai", label:"OpenAI", kind:"openai-compatible", keyEnv:"OPENAI_API_KEY", baseEnv:"OPENAI_BASE_URL", defaultBase:"https://api.openai.com/v1", modelEnv:"OPENAI_MODEL", defaultModel:"gpt-6", capabilities:["chat","code","vision","image"] },
  { id:"anthropic", label:"Anthropic/Claude", kind:"anthropic", keyEnv:"ANTHROPIC_API_KEY", baseEnv:"ANTHROPIC_BASE_URL", defaultBase:"https://api.anthropic.com/v1", modelEnv:"ANTHROPIC_MODEL", defaultModel:"claude-sonnet-5", capabilities:["chat","code","vision"] },
  { id:"gemini", label:"Google Gemini", kind:"gemini", keyEnv:"GEMINI_API_KEY", baseEnv:"GEMINI_BASE_URL", defaultBase:"https://generativelanguage.googleapis.com/v1beta", modelEnv:"GEMINI_MODEL", defaultModel:"gemini-3.7-flash", capabilities:["chat","code","vision","image"] },
  { id:"xai", label:"xAI/Grok", kind:"openai-compatible", keyEnv:"XAI_API_KEY", baseEnv:"XAI_BASE_URL", defaultBase:"https://api.x.ai/v1", modelEnv:"XAI_MODEL", defaultModel:"grok-4.6", capabilities:["chat","code","vision","image"] },
  { id:"deepseek", label:"DeepSeek", kind:"openai-compatible", keyEnv:"DEEPSEEK_API_KEY", baseEnv:"DEEPSEEK_BASE_URL", defaultBase:"https://api.deepseek.com", modelEnv:"DEEPSEEK_MODEL", defaultModel:"deepseek-v4.1-flash", capabilities:["chat","code","reasoning"] },
  { id:"cohere", label:"Cohere", kind:"cohere", keyEnv:"COHERE_API_KEY", baseEnv:"COHERE_BASE_URL", defaultBase:"https://api.cohere.com/v2", modelEnv:"COHERE_MODEL", defaultModel:"command-a", capabilities:["chat","code"] },
  { id:"minimax", label:"MiniMax", kind:"openai-compatible", keyEnv:"MINIMAX_API_KEY", baseEnv:"MINIMAX_BASE_URL", defaultBase:"https://api.minimax.io/v1", modelEnv:"MINIMAX_MODEL", defaultModel:"MiniMax-M3", capabilities:["chat","code","vision"] },
  { id:"inference", label:"Inference.net / specialty", kind:"openai-compatible", keyEnv:"INFERENCE_API_KEY", baseEnv:"INFERENCE_BASE_URL", defaultBase:"https://api.inference.net/v1", modelEnv:"INFERENCE_MODEL", defaultModel:"schematron-v2-small", capabilities:["chat","code","vision","structured-output"] },
  { id:"puter", label:"Puter", kind:"openai-compatible", keyEnv:"PUTER_API_KEY", baseEnv:"PUTER_BASE_URL", defaultBase:"https://api.puter.com/v1", modelEnv:"PUTER_MODEL", defaultModel:"gpt-5-nano", capabilities:["chat","code","vision","image"] },
  { id:"huggingface", label:"Hugging Face / open ecosystem", kind:"generic-json", keyEnv:"HUGGINGFACE_API_KEY", baseEnv:"HUGGINGFACE_ENDPOINT", defaultBase:"", modelEnv:"HUGGINGFACE_MODEL", defaultModel:"", capabilities:["chat","code","vision","image"] },
  { id:"custom", label:"Custom OpenAI-compatible endpoint", kind:"openai-compatible", keyEnv:"UAI_PROVIDER_API_KEY", baseEnv:"UAI_PROVIDER_BASE_URL", defaultBase:"", modelEnv:"UAI_PROVIDER_MODEL", defaultModel:"", capabilities:["chat","code","vision","image","structured-output"] }
];

export const providerDefinitions = () => PROVIDERS.map(x => ({...x, capabilities:[...x.capabilities]}));

export class ProviderHub {
  constructor(audit) { this.audit = audit; this.runtime = new Map(); this.providers = providerDefinitions(); }
  config(def) {
    const key = env(def.keyEnv), base = trimSlash(env(def.baseEnv) || def.defaultBase), model = env(def.modelEnv) || def.defaultModel;
    const observed = this.runtime.get(def.id);
    return { id:def.id, label:def.label, kind:def.kind, model, base, capabilities:def.capabilities, availability:observed?.availability || (key && base ? "CONFIGURED" : "UNAVAILABLE"), executable:Boolean(key && base), reason:key && base ? null : `Configure ${def.keyEnv}${base ? "" : ` and ${def.baseEnv}`}` };
  }
  list() { return this.providers.map(x => this.config(x)); }
  get(id) { const def=this.providers.find(x=>x.id===id); if(!def) throw new Error(`Unknown provider: ${id}`); return {def,cfg:this.config(def),key:env(def.keyEnv)}; }
  async _request(id, operation, payload, extract) {
    const {def,cfg,key}=this.get(id); if(!cfg.executable) return {state:"UNAVAILABLE",provider:id,model:cfg.model,message:cfg.reason};
    const started=Date.now();
    try {
      let url, headers={"content-type":"application/json"};
      if(def.kind==="openai-compatible") { url=`${cfg.base}/${operation==="image"?"images/generations":"chat/completions"}`; headers.authorization=`Bearer ${key}`; }
      else if(def.kind==="anthropic") { url=`${cfg.base}/messages`; headers["x-api-key"]=key; headers["anthropic-version"]="2023-06-01"; }
      else if(def.kind==="gemini") { url=`${cfg.base}/models/${encodeURIComponent(cfg.model)}:${operation==="image"?"generateContent":"generateContent"}?key=${encodeURIComponent(key)}`; }
      else if(def.kind==="cohere") { url=`${cfg.base}/chat`; headers.authorization=`Bearer ${key}`; }
      else { url=cfg.base; headers.authorization=`Bearer ${key}`; }
      const r=await fetch(url,{method:"POST",headers,body:JSON.stringify(payload),signal:AbortSignal.timeout(Number(process.env.UAI_PROVIDER_TIMEOUT_MS||60000))});
      const raw=await r.text(); let json; try { json=JSON.parse(raw); } catch { json={raw:raw.slice(0,4000)}; }
      if(!r.ok) throw new Error(`HTTP ${r.status}: ${JSON.stringify(json).slice(0,1200)}`);
      const value=extract(json); if(value===undefined||value===null||value==="") throw new Error("Provider response contained no recognized output");
      this.runtime.set(id,{availability:"CONNECTED",lastSuccess:now()});
      const evidence={type:"provider-call",provider:id,model:cfg.model,operation,latencyMs:Date.now()-started}; this.audit?.append(evidence);
      return {state:"SUCCESS",provider:id,model:cfg.model,output:value,text:typeof value==="string"?value:undefined,evidence:[evidence]};
    } catch(error) { this.runtime.set(id,{availability:"ERROR",lastError:now()}); this.audit?.append({type:"provider-error",provider:id,operation,error:String(error.message||error)}); return {state:"ERROR",provider:id,model:cfg.model,message:String(error.message||error)}; }
  }
  chat(id,message,system="You are a concise research assistant.",options={}) {
    const {def,cfg}=this.get(id); const messages=[{role:"system",content:system},{role:"user",content:String(message)}];
    let payload,extract;
    if(def.kind==="anthropic") { payload={model:cfg.model,max_tokens:options.maxTokens||1024,system,messages}; extract=j=>j?.content?.map?.(x=>x?.text||"").join(""); }
    else if(def.kind==="gemini") { payload={systemInstruction:{parts:[{text:system}]},contents:[{role:"user",parts:[{text:String(message)}]}]}; extract=j=>j?.candidates?.[0]?.content?.parts?.map(x=>x.text||"").join(""); }
    else if(def.kind==="cohere") { payload={model:cfg.model,messages}; extract=j=>j?.message?.content?.map?.(x=>x?.text||"").join("")||j?.text; }
    else if(def.kind==="generic-json") { payload={inputs:String(message),parameters:{max_new_tokens:options.maxTokens||512}}; extract=j=>Array.isArray(j)?j[0]?.generated_text:j?.generated_text||j?.text; }
    else { payload={model:cfg.model,messages,temperature:options.temperature,max_tokens:options.maxTokens}; extract=j=>j?.choices?.[0]?.message?.content; }
    return this._request(id,"chat",payload,extract);
  }
  vision(id,message,images=[],options={}) { return this.chat(id,{text:String(message),images},options.system||"You analyze images accurately.",options); }
  image(id,prompt,options={}) { const {cfg}=this.get(id); return this._request(id,"image",{model:cfg.model,prompt:String(prompt),size:options.size||"1024x1024",n:options.n||1,response_format:options.responseFormat||"url"},j=>j?.data||j?.images||j?.candidates?.[0]?.content?.parts); }
  async health(id) { const c=this.config(this.providers.find(x=>x.id===id)); return {state:"SUCCESS",...c,checkedAt:now()}; }
}
