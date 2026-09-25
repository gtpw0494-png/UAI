const clean=x=>String(x??"").trim();
const quality=t=>{t=clean(t);if(!t)return false;if(/<\|[^|]+\|>/.test(t))return false;return t.length>=12;};
export class ConversationEngine{
 constructor({llamaRuntime=null,forgelm=null,store=null,audit=null}={}){this.llamaRuntime=llamaRuntime;this.forgelm=forgelm;this.store=store;this.audit=audit;this.history=new Map();}
 _history(chatId){return this.history.get(chatId)||[];}
 _remember(chatId,role,content){const h=this._history(chatId);h.push({role,content:clean(content)});while(h.length>20)h.shift();this.history.set(chatId,h);}
 async chat({chatId,message,context=[]}={}){
  const id=chatId||"default",msg=clean(message);if(!msg)return {state:"BLOCKED",message:"Chat message is empty."};
  const prior=this._history(id),system="You are UAI OneChat, a capable local-first conversational assistant. Answer naturally and directly. Use supplied verified context when relevant. Never claim an action, source, connection, or fact was verified unless the context says so. Do not expose hidden reasoning. If information is unavailable, say so plainly.";
  if(this.llamaRuntime){const status=await this.llamaRuntime.status();if(status.availability==="CONNECTED"){const prompt=[...prior,...context].slice(-16).map(x=>`${x.role}: ${x.content}`).join("\n")+"\nuser: "+msg;const r=await this.llamaRuntime.chat(prompt,{maxTokens:512,system});if(r.state==="SUCCESS"&&quality(r.text)){this._remember(id,"user",msg);this._remember(id,"assistant",r.text);this.audit?.append({type:"conversation.reply",chatId:id,runtime:"llama.cpp",model:r.model||null});return {state:"SUCCESS",message:clean(r.text),runtime:"llama.cpp",model:r.model||null,modelUsed:true};}}}
  if(this.forgelm){const r=await this.forgelm.chat(msg,256);if(r?.state==="SUCCESS"&&quality(r.text)){this._remember(id,"user",msg);this._remember(id,"assistant",r.text);this.audit?.append({type:"conversation.reply",chatId:id,runtime:"forgelm"});return {state:"SUCCESS",message:clean(r.text),runtime:"forgelm",modelUsed:true};}}
  return {state:"UNAVAILABLE",message:"No promoted conversational model runtime is currently available. Connect a local llama.cpp model or promote a verified ForgeLM checkpoint.",modelUsed:false};
 }
}
