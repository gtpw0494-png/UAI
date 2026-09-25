import {inspectExternalContent,sanitizeExternalText} from "../content-security.js";

const clean=x=>String(x??"").replace(/\s+/g," ").trim();
const stripHtml=s=>clean(String(s||"").replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi," ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," "));
const decode=s=>String(s||"").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#x27;|&#39;/g,"'").replace(/&lt;/g,"<").replace(/&gt;/g,">");
const host=u=>{try{return new URL(u).hostname.replace(/^www\./,"");}catch{return "";}};
function normalizeUrl(raw){
  try{
    const u=new URL(raw);
    if(u.hostname.includes("duckduckgo.com")&&u.searchParams.get("uddg"))return decodeURIComponent(u.searchParams.get("uddg"));
    if(!["http:","https:"].includes(u.protocol))return null;
    u.hash="";return u.toString();
  }catch{return null;}
}
function parseDdg(html,limit){
  const out=[],re=/<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?(?:class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/[^>]+>)?/gi;
  let m;while((m=re.exec(html))&&out.length<limit){
    const url=normalizeUrl(decode(m[1]));if(!url)continue;
    out.push({title:decode(stripHtml(m[2]))||host(url),url,domain:host(url),snippet:decode(stripHtml(m[3]||"")),provider:"duckduckgo-html"});
  }
  return out;
}
export class PublicWebSearchProvider{
  constructor({timeoutMs=12000,maxResults=10}={}){this.timeoutMs=timeoutMs;this.maxResults=maxResults;}
  async health(){
    try{const r=await fetch("https://html.duckduckgo.com/html/?q=uai+health",{headers:{"user-agent":"UAI-Research/0.50"},signal:AbortSignal.timeout(Math.min(this.timeoutMs,6000))});return {availability:r.ok?"CONNECTED":"DEGRADED",executable:r.ok,provider:"duckduckgo-html",status:r.status};}
    catch(e){return {availability:"UNAVAILABLE",executable:false,provider:"duckduckgo-html",reason:String(e.message||e)};}
  }
  async search(query,{limit=this.maxResults}={}){
    const q=clean(query);if(!q)return {state:"BLOCKED",message:"Research query is empty.",results:[]};
    let r;try{r=await fetch("https://html.duckduckgo.com/html/?q="+encodeURIComponent(q),{headers:{"user-agent":"UAI-Research/0.50"},signal:AbortSignal.timeout(this.timeoutMs)});}
    catch(e){return {state:"UNAVAILABLE",message:String(e.message||e),provider:"duckduckgo-html",results:[]};}
    if(!r.ok)return {state:"UNAVAILABLE",message:`Search provider returned HTTP ${r.status}.`,provider:"duckduckgo-html",results:[]};
    const results=parseDdg(await r.text(),Math.max(1,Math.min(25,Number(limit)||10)));
    return {state:results.length?"SUCCESS":"UNAVAILABLE",message:results.length?`Found ${results.length} public web result(s).`:"Search returned no parseable public results.",provider:"duckduckgo-html",query:q,results};
  }
  async open(url,{maxBytes=800000}={}){
    let u;try{u=new URL(url);if(!["http:","https:"].includes(u.protocol))throw new Error("Unsupported protocol.");}catch(e){return {state:"BLOCKED",message:String(e.message||e),url};}
    let r;try{r=await fetch(u,{redirect:"follow",headers:{"user-agent":"UAI-Research/0.50"},signal:AbortSignal.timeout(this.timeoutMs)});}catch(e){return {state:"UNAVAILABLE",message:String(e.message||e),url};}
    if(!r.ok)return {state:"UNAVAILABLE",message:`HTTP ${r.status}`,url:r.url};
    const type=(r.headers.get("content-type")||"").toLowerCase();if(!type.includes("text")&&!type.includes("json")&&!type.includes("xml"))return {state:"BLOCKED",message:`Unsupported research content type ${type||"unknown"}.`,url:r.url};
    const buf=Buffer.from(await r.arrayBuffer());if(buf.length>maxBytes)return {state:"BLOCKED",message:"Research page exceeds size limit.",url:r.url,bytes:buf.length};
    const raw=buf.toString("utf8"),text=sanitizeExternalText(type.includes("html")?stripHtml(raw):raw).slice(0,180000),security=inspectExternalContent(text);
    return {state:text.length>20?"SUCCESS":"UNAVAILABLE",url:r.url,title:(raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]&&decode(stripHtml(RegExp.$1)))||host(r.url),domain:host(r.url),retrievedAt:new Date().toISOString(),contentType:type,text,security,instructionAuthority:"NONE"};
  }
}
