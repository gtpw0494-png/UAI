import fs from "node:fs";
import path from "node:path";
function writeJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});const tmp=file+".tmp-"+process.pid;fs.writeFileSync(tmp,JSON.stringify(value,null,2)+"\n");fs.renameSync(tmp,file)}
export class KnowledgeJobStore{
 constructor({stateRoot=path.resolve("state")}={}){this.file=path.join(stateRoot,"knowledge-autonomy","jobs.json");if(!fs.existsSync(this.file))writeJson(this.file,[])}
 read(){try{const v=JSON.parse(fs.readFileSync(this.file,"utf8"));return Array.isArray(v)?v:[]}catch{return[]}}
 record(entry={}){const rows=this.read();const row={id:entry.id||`kj-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,created_at:new Date().toISOString(),...entry};rows.push(row);writeJson(this.file,rows.slice(-1000));return row}
 list(limit=50){return this.read().slice(-Math.max(1,Number(limit)||50)).reverse()}
}
export default KnowledgeJobStore;
