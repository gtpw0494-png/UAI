import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const STATES = new Set(['NEW','PLANNING','WAITING_APPROVAL','AUTHORIZED','EXECUTING','VERIFYING','CORRECTING','CONTINUING','RECOVERING','COMPLETED','FAILED','CANCELLED']);

export class TaskStore {
  constructor(stateRoot, audit=null){
    fs.mkdirSync(stateRoot,{recursive:true});
    this.file=path.join(stateRoot,'tasks.json');
    this.audit=audit;
    if(!fs.existsSync(this.file))fs.writeFileSync(this.file,'[]\n');
  }
  _read(){try{return JSON.parse(fs.readFileSync(this.file,'utf8'));}catch{return [];}}
  _write(rows){fs.writeFileSync(this.file,JSON.stringify(rows,null,2)+'\n');}
  list({limit=100,state=null}={}){let rows=this._read();if(state)rows=rows.filter(x=>x.state===state);return rows.slice(-Math.max(1,Number(limit)||100)).reverse();}
  get(id){return this._read().find(x=>x.id===id)||null;}
  create({request='',plan={steps:[]},title='Agent task',envelopeId=null}={}){
    const now=new Date().toISOString();
    const task={id:`task-${crypto.randomUUID()}`,title,request:String(request),state:'NEW',plan,outputs:[],nextStep:0,envelopeId,createdAt:now,updatedAt:now,history:[{state:'NEW',at:now,reason:'task-created'}]};
    const rows=this._read();rows.push(task);this._write(rows);this.audit?.append({type:'task.persist.create',taskId:task.id,envelopeId});return task;
  }
  update(id,patch={}){const rows=this._read();const i=rows.findIndex(x=>x.id===id);if(i<0)return null;const now=new Date().toISOString();rows[i]={...rows[i],...patch,updatedAt:now};this._write(rows);return rows[i];}
  transition(id,state,{reason='',details=null}={}){
    if(!STATES.has(state))throw new Error(`Unsupported task state: ${state}`);
    const rows=this._read();const i=rows.findIndex(x=>x.id===id);if(i<0)return null;
    const now=new Date().toISOString();const history=[...(rows[i].history||[]),{state,at:now,reason:String(reason||''),details}];
    rows[i]={...rows[i],state,updatedAt:now,history};this._write(rows);this.audit?.append({type:'task.persist.transition',taskId:id,state,reason});return rows[i];
  }
}
