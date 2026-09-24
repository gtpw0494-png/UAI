import fs from "node:fs";import path from "node:path";import crypto from "node:crypto";import {encodeIU,decodeIU} from "./iubin.js";
export class KnowledgeStore{
  constructor(root="./data"){this.root=root;fs.mkdirSync(root,{recursive:true});this.indexFile=path.join(root,"index.json");if(!fs.existsSync(this.indexFile))fs.writeFileSync(this.indexFile,"[]");}
  list(){return JSON.parse(fs.readFileSync(this.indexFile,"utf8"));}
  add(entry){const id=entry.id&&this.list().every(x=>x.id!==entry.id)?entry.id:crypto.randomUUID();const item={...entry,id,createdAt:entry.createdAt||new Date().toISOString()};const file=`${id}.iub`;fs.writeFileSync(path.join(this.root,file),encodeIU(item));const idx=this.list();idx.push({id,file,title:item.title||id,kind:item.kind||"knowledge",createdAt:item.createdAt,source:item.source||"local"});fs.writeFileSync(this.indexFile,JSON.stringify(idx,null,2));return item;}
  get(id){const meta=this.list().find(x=>x.id===id);if(!meta)return null;return decodeIU(fs.readFileSync(path.join(this.root,meta.file)));}
  search(q){const needle=String(q||"").toLowerCase();return this.list().map(m=>this.get(m.id)).filter(x=>JSON.stringify(x).toLowerCase().includes(needle));}
  importRecord(record){const originalId=record?.id||null;const stored=this.add({...record,importedAt:new Date().toISOString(),importedOriginalId:originalId});return stored;}
}
