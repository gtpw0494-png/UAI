import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export class ActionEnvelopeStore {
  constructor(stateRoot,audit=null){
    fs.mkdirSync(stateRoot,{recursive:true});this.file=path.join(stateRoot,'action-envelopes.json');this.audit=audit;
    if(!fs.existsSync(this.file))fs.writeFileSync(this.file,'[]\n');
  }
  _read(){try{return JSON.parse(fs.readFileSync(this.file,'utf8'));}catch{return [];}}
  _write(rows){fs.writeFileSync(this.file,JSON.stringify(rows,null,2)+'\n');}
  list(limit=100){return this._read().slice(-Math.max(1,Number(limit)||100)).reverse();}
  get(id){return this._read().find(x=>x.id===id)||null;}
  create({subject='user:onechat',agent='task-engine',intent='',plan={steps:[]},capabilityScope=[]}={}){
    const now=new Date().toISOString();const id=`action-${crypto.randomUUID()}`;
    const envelope={id,subject,agent,intent:String(intent),plan,capabilityScope:[...new Set(capabilityScope)],authority:{decision:'ALLOW',basis:'bounded task orchestration; high-impact actions retain their own approval gates'},securityDecision:{decision:'ALLOW',reason:'planning/orchestration only; no security authority delegated'},approvalBinding:null,execution:{state:'NEW',startedAt:null,completedAt:null,steps:[]},verification:{state:'UNKNOWN',evidence:[]},recovery:{state:'NOT_REQUIRED',attempts:0,lastReason:null},auditLineage:[],createdAt:now,updatedAt:now,history:[{state:'NEW',at:now}]};
    const rows=this._read();rows.push(envelope);this._write(rows);const a=this.audit?.append({type:'action.envelope.create',actionId:id,intent:envelope.intent});if(a)this.appendAudit(id,a.id);return this.get(id);
  }
  update(id,patch={}){const rows=this._read();const i=rows.findIndex(x=>x.id===id);if(i<0)return null;rows[i]={...rows[i],...patch,updatedAt:new Date().toISOString()};this._write(rows);return rows[i];}
  transition(id,state,details={}){const rows=this._read();const i=rows.findIndex(x=>x.id===id);if(i<0)return null;const now=new Date().toISOString();const env=rows[i];
    const execution={...env.execution};if(state==='EXECUTING'&&!execution.startedAt)execution.startedAt=now;if(['COMPLETED','FAILED','CANCELLED'].includes(state))execution.completedAt=now;execution.state=state;
    const history=[...(env.history||[]),{state,at:now,details}];rows[i]={...env,execution,history,updatedAt:now};this._write(rows);this.audit?.append({type:'action.envelope.transition',actionId:id,state});return rows[i];}
  appendStep(id,stepResult){const env=this.get(id);if(!env)return null;return this.update(id,{execution:{...env.execution,steps:[...(env.execution?.steps||[]),stepResult]}});}
  verify(id,{state='UNKNOWN',evidence=[]}={}){return this.update(id,{verification:{state,evidence,verifiedAt:new Date().toISOString()}});}
  recover(id,reason){const env=this.get(id);if(!env)return null;return this.update(id,{recovery:{state:'RECOVERING',attempts:Number(env.recovery?.attempts||0)+1,lastReason:String(reason||''),at:new Date().toISOString()}});}
  appendAudit(id,auditId){const env=this.get(id);if(!env||!auditId)return env;return this.update(id,{auditLineage:[...(env.auditLineage||[]),auditId]});}
}
