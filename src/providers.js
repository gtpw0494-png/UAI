const trimSlash = s => String(s || "").replace(/\/+$/, "");

export class ProviderHub {
  constructor(audit) {
    this.audit = audit;
    this.runtime = new Map();
    this.providers = [
      { id:"openai", label:"OpenAI", kind:"openai-compatible", keyEnv:"OPENAI_API_KEY", baseEnv:"OPENAI_BASE_URL", defaultBase:"https://api.openai.com/v1", modelEnv:"OPENAI_MODEL", defaultModel:"gpt-5.6" },
      { id:"deepseek", label:"DeepSeek", kind:"openai-compatible", keyEnv:"DEEPSEEK_API_KEY", baseEnv:"DEEPSEEK_BASE_URL", defaultBase:"https://api.deepseek.com", modelEnv:"DEEPSEEK_MODEL", defaultModel:"deepseek-chat" },
      { id:"xai", label:"xAI/Grok", kind:"openai-compatible", keyEnv:"XAI_API_KEY", baseEnv:"XAI_BASE_URL", defaultBase:"https://api.x.ai/v1", modelEnv:"XAI_MODEL", defaultModel:"grok-4" },
      { id:"anthropic", label:"Anthropic/Claude", kind:"anthropic", keyEnv:"ANTHROPIC_API_KEY", baseEnv:"ANTHROPIC_BASE_URL", defaultBase:"https://api.anthropic.com/v1", modelEnv:"ANTHROPIC_MODEL", defaultModel:"claude-sonnet-4-5" },
      { id:"gemini", label:"Google Gemini", kind:"gemini", keyEnv:"GEMINI_API_KEY", baseEnv:"GEMINI_BASE_URL", defaultBase:"https://generativelanguage.googleapis.com/v1beta", modelEnv:"GEMINI_MODEL", defaultModel:"gemini-2.5-flash" },
      { id:"huggingface", label:"Hugging Face", kind:"generic-json", keyEnv:"HUGGINGFACE_API_KEY", baseEnv:"HUGGINGFACE_ENDPOINT", defaultBase:"", modelEnv:"HUGGINGFACE_MODEL", defaultModel:"" }
    ];
  }
  config(def) {
    const key = process.env[def.keyEnv] || "";
    const base = trimSlash(process.env[def.baseEnv] || def.defaultBase || "");
    const model = process.env[def.modelEnv] || def.defaultModel || "";
    const observed = this.runtime.get(def.id);
    return { id:def.id,label:def.label,kind:def.kind,model,base,availability:observed?.availability || (key && base ? "CONFIGURED" : "UNAVAILABLE"), executable:Boolean(key && base), reason:key && base ? "Credentials/config present; CONNECTED is only asserted after a successful live request." : `Set ${def.keyEnv}${def.defaultBase ? "" : ` and ${def.baseEnv}`} to enable.` };
  }
  list() { return this.providers.map(d => this.config(d)); }
  get(id) { const d=this.providers.find(x=>x.id===id); if(!d) throw new Error("Unknown provider"); return { def:d, cfg:this.config(d), key:process.env[d.keyEnv]||"" }; }
  async chat(id, message, system="You are a concise research assistant.") {
    const { def,cfg,key }=this.get(id);
    if(!cfg.executable) return { state:"UNAVAILABLE",provider:id,message:cfg.reason };
    const started=Date.now();
    try {
      let url, headers={"content-type":"application/json"}, body, extract;
      if(def.kind==="openai-compatible"){
        url=`${cfg.base}/chat/completions`; headers.authorization=`Bearer ${key}`;
        body={model:cfg.model,messages:[{role:"system",content:system},{role:"user",content:String(message)}]};
        extract=j=>j?.choices?.[0]?.message?.content;
      } else if(def.kind==="anthropic"){
        url=`${cfg.base}/messages`; headers["x-api-key"]=key; headers["anthropic-version"]="2023-06-01";
        body={model:cfg.model,max_tokens:1024,system,messages:[{role:"user",content:String(message)}]};
        extract=j=>Array.isArray(j?.content)?j.content.map(x=>x?.text||"").join(""):undefined;
      } else if(def.kind==="gemini"){
        url=`${cfg.base}/models/${encodeURIComponent(cfg.model)}:generateContent?key=${encodeURIComponent(key)}`;
        body={systemInstruction:{parts:[{text:system}]},contents:[{role:"user",parts:[{text:String(message)}]}]};
        extract=j=>j?.candidates?.[0]?.content?.parts?.map(x=>x.text||"").join("");
      } else {
        url=cfg.base; headers.authorization=`Bearer ${key}`; body={inputs:String(message),parameters:{max_new_tokens:512}};
        extract=j=>Array.isArray(j)?j[0]?.generated_text:j?.generated_text;
      }
      const r=await fetch(url,{method:"POST",headers,body:JSON.stringify(body),signal:AbortSignal.timeout(45000)});
      const raw=await r.text(); let json; try{json=JSON.parse(raw);}catch{json={raw:raw.slice(0,4000)}}
      if(!r.ok) throw new Error(`HTTP ${r.status}: ${JSON.stringify(json).slice(0,1000)}`);
      const text=extract(json);
      if(typeof text!=="string"||!text.trim()) throw new Error("Provider response contained no recognized text output");
      this.runtime.set(id,{availability:"CONNECTED",lastSuccess:new Date().toISOString()});
      const evidence={type:"provider-call",provider:id,model:cfg.model,latencyMs:Date.now()-started}; this.audit?.append(evidence);
      return {state:"SUCCESS",provider:id,model:cfg.model,text,evidence:[evidence]};
    } catch(error) {
      this.runtime.set(id,{availability:"ERROR",lastError:new Date().toISOString()});
      this.audit?.append({type:"provider-error",provider:id,error:String(error.message||error)});
      return {state:"ERROR",provider:id,message:String(error.message||error)};
    }
  }
}
