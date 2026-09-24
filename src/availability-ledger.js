import fs from 'node:fs';
import path from 'node:path';

export class AvailabilityLedger {
  constructor(stateRoot){fs.mkdirSync(stateRoot,{recursive:true});this.file=path.join(stateRoot,'availability.json');if(!fs.existsSync(this.file))fs.writeFileSync(this.file,'[]\n');}
  _read(){try{return JSON.parse(fs.readFileSync(this.file,'utf8'));}catch{return [];}}
  _write(rows){fs.writeFileSync(this.file,JSON.stringify(rows.slice(-50),null,2)+'\n');}
  record(capabilities=[]){
    const observedAt=new Date().toISOString();
    const entries=capabilities.map(c=>({id:c.id,availability:c.availability||'UNKNOWN',executable:c.executable===true,reason:c.reason||null,constraints:c.constraints||[],evidenceClass:c.availability==='CONNECTED'?(c.executable?'LOCAL_OR_LIVE_RUNTIME':'REGISTERED_SOURCE'):(c.availability==='CONFIGURED'?'CONFIGURATION_ONLY':'NO_CONNECTED_EVIDENCE')}));
    const snap={observedAt,total:entries.length,connected:entries.filter(x=>x.availability==='CONNECTED').length,configured:entries.filter(x=>x.availability==='CONFIGURED').length,entries};
    const rows=this._read();rows.push(snap);this._write(rows);return snap;
  }
  latest(){const rows=this._read();return rows.at(-1)||{observedAt:null,total:0,connected:0,configured:0,entries:[]};}
}
