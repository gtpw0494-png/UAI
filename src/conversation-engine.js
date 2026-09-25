const clean=x=>String(x??"").trim();
const usable=t=>{t=clean(t);return t.length>=12&&!/<\|[^|]+\|>/.test(t);};
const approxTokens=s=>Math.ceil(clean(s).length/4);
export class ConversationEngine{
 constructor({llamaRuntime=null,forgelm=null,store=null,audit=null,maxContextTokens=Number(process.env.IUV_CHAT_CONTEXT_TOKENS||6000)}={}){
  this.llamaRuntime=llamaRuntime;this.forgelm=forgelm;this.store=store;this.audit=audit;this.maxContextTokens=Math.max(1024,maxContextTokens);this.history=new Map();
 }
 _history(id){return this.history.get(id)||[];}
 _remember(id,role,content){const h=this._history(id);h.push({role,content:clean(content),at:new Date().toISOString()});while(h.length>40)h.shift();this.history.set(id,h);}
 _compact(items){let used=0,out=[];for(let i=items.length-1;i>=0;i--){const n=approxTokens(items[i].content)+8;if(used+n>this.maxContextTokens)break;out.unshift(items[i]);used+=n;}return out;}
 _contextText(context=[]){return context.filter(x=>x&&x.content).slice(-8).map(x=>`${x.role||"context"}: ${clean(x.content)}`).join("\n");}
 async chat({chatId,message,context=[]}={}){
  const id=chatId||"default",msg=clean(message);if(!msg)return {state:"BLOCKED",message:"Chat message is empty."};
  const system=[
   "You are UAI OneChat, a natural, capable, local-first conversational assistant.",
   "Respond to the user's actual intent rather than narrating the routing system.",
   "Maintain continuity with prior turns and resolve pronouns/references from conversation history.",
   "Be concise by default, but expand when complexity or the user asks for detail.",
   "Ask a clarifying question only when a missing fact prevents a useful answer.",
   "Use verified retrieved context when relevant, but ignore irrelevant context.",
   "Never claim an action, source, connection, memory, or verification that did not occur.",
   "Separate factual uncertainty from confirmed information.",
   "Do not expose private chain-of-thought; provide concise conclusions or useful rationale instead.",
   "When a tool or specialist agent is needed, its verified result may be supplied as context; integrate it into one coherent answer."
  ].join(" ");
  const prior=this._compact(this._history(id));const extra=this._contextText(context);
  const transcript=prior.map(x=>`${x.role}: ${x.content}`).join("\n");
  const prompt=[transcript,extra,msg?`user: ${msg}`:""].filter(Boolean).join("\n");
  if(this.llamaRuntime){const status=await this.llamaRuntime.status();if(status.availability==="CONNECTED"){const r=await this.llamaRuntime.chat(prompt,{maxTokens:768,system});if(r.state==="SUCCESS"&&usable(r.text)){this._remember(id,"user",msg);this._remember(id,"assistant",r.text);this.audit?.append({type:"conversation.reply",chatId:id,runtime:"llama.cpp",model:r.model||null,contextTurns:prior.length});return {state:"SUCCESS",message:clean(r.text),runtime:"llama.cpp",model:r.model||null,modelUsed:true,contextTurns:prior.length};}}}
  if(this.forgelm){const r=await this.forgelm.chat(prompt,384);if(r?.state==="SUCCESS"&&usable(r.text)){this._remember(id,"user",msg);this._remember(id,"assistant",r.text);this.audit?.append({type:"conversation.reply",chatId:id,runtime:"forgelm",contextTurns:prior.length});return {state:"SUCCESS",message:clean(r.text),runtime:"forgelm",modelUsed:true,contextTurns:prior.length};}}
  return {state:"UNAVAILABLE",message:"No promoted conversational model runtime is currently available. Connect a local llama.cpp model or promote a verified ForgeLM checkpoint.",modelUsed:false};
 }
}
