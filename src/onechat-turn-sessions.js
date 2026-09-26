import crypto from "node:crypto";

const terminal=new Set(["SUCCESS","PARTIAL","FAILURE","ERROR","DENIED","BLOCKED","UNAVAILABLE","CANCELLED","TIMEOUT"]);

export class OneChatTurnSessions{
  constructor({onechat,audit=null,maxEvents=200}={}){
    this.onechat=onechat;this.audit=audit;this.maxEvents=Math.max(20,maxEvents);this.sessions=new Map();
  }
  _emit(s,type,data={}){
    const e={seq:(s.seq||0)+1,at:new Date().toISOString(),type,...data};s.seq=e.seq;s.updatedAt=e.at;s.events.push(e);
    if(s.events.length>this.maxEvents)s.events.splice(0,s.events.length-this.maxEvents);
    return e;
  }
  start(input={}){
    const id="turn-session-"+crypto.randomUUID(),controller=new AbortController(),now=new Date().toISOString();
    const s={id,chatId:input.chatId||null,ownerId:input.ownerId||null,state:"QUEUED",createdAt:now,updatedAt:now,seq:0,events:[],controller,result:null,error:null,cancelRequested:false};
    this.sessions.set(id,s);this._emit(s,"state",{state:"QUEUED",message:"Turn queued."});
    queueMicrotask(()=>this._run(s,input));
    return this.public(s);
  }
  async _run(s,input){
    try{
      if(s.controller.signal.aborted)return this._cancelled(s,"Cancelled before execution.");
      s.state="RUNNING";this._emit(s,"state",{state:"RUNNING",message:"Turn execution started."});
      const result=await this.onechat.handle({...input,signal:s.controller.signal,onEvent:e=>this._emit(s,e?.type||"progress",e||{})});
      if(s.controller.signal.aborted||s.cancelRequested)return this._cancelled(s,"Generation cancelled; late result discarded.");
      s.result=result;s.state=terminal.has(result?.state)?result.state:"SUCCESS";
      this._emit(s,"result",{state:s.state,result});
      this.audit?.append?.({type:"onechat.turn.session.completed",sessionId:s.id,chatId:s.chatId,state:s.state});
    }catch(e){
      if(s.controller.signal.aborted||s.cancelRequested)return this._cancelled(s,"Generation cancelled.");
      s.state="ERROR";s.error=String(e?.message||e);this._emit(s,"error",{state:"ERROR",message:s.error});
      this.audit?.append?.({type:"onechat.turn.session.error",sessionId:s.id,chatId:s.chatId,error:s.error});
    }
  }
  _cancelled(s,message){
    s.state="CANCELLED";s.result=null;this._emit(s,"state",{state:"CANCELLED",message});
    this.audit?.append?.({type:"onechat.turn.session.cancelled",sessionId:s.id,chatId:s.chatId});
    return this.public(s);
  }
  cancel(id,{ownerId=null}={}){
    const s=this.sessions.get(String(id));if(!s)return {state:"UNAVAILABLE",message:"Turn session not found."};
    if(s.ownerId&&ownerId&&s.ownerId!==ownerId)return {state:"DENIED",message:"Turn session is owned by another identity."};
    if(terminal.has(s.state))return {state:s.state,message:"Turn session is already terminal.",session:this.public(s)};
    s.cancelRequested=true;s.state="CANCEL_REQUESTED";this._emit(s,"state",{state:"CANCEL_REQUESTED",message:"Cancellation requested."});
    try{s.controller.abort()}catch{}
    return {state:"CANCEL_REQUESTED",session:this.public(s)};
  }
  get(id,{ownerId=null,since=0}={}){
    const s=this.sessions.get(String(id));if(!s)return {state:"UNAVAILABLE",message:"Turn session not found."};
    if(s.ownerId&&ownerId&&s.ownerId!==ownerId)return {state:"DENIED",message:"Turn session is owned by another identity."};
    return {state:"SUCCESS",session:this.public(s),events:s.events.filter(e=>e.seq>Number(since||0))};
  }
  public(s){
    return {id:s.id,chatId:s.chatId,state:s.state,createdAt:s.createdAt,updatedAt:s.updatedAt,seq:s.seq,cancelRequested:s.cancelRequested===true,result:s.result,error:s.error};
  }
}
export default OneChatTurnSessions;
