import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

function atomicWrite(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = file + ".tmp-" + process.pid + "-" + Date.now();
  fs.writeFileSync(tmp, text, "utf8");
  fs.renameSync(tmp, file);
}

export class VerifiedKnowledgeStore {
  constructor({ stateRoot = path.resolve("state") } = {}) {
    this.dir = path.join(stateRoot, "knowledge-autonomy");
    this.file = path.join(this.dir, "verified-facts.json");
    fs.mkdirSync(this.dir, { recursive: true });
    if (!fs.existsSync(this.file)) atomicWrite(this.file, "[]\n");
  }
  read() {
    try { const v=JSON.parse(fs.readFileSync(this.file,"utf8")); return Array.isArray(v)?v:[]; }
    catch { return []; }
  }
  factId(fact) {
    return crypto.createHash("sha256").update([fact.subject,fact.claim,fact.source_id,fact.source_url].join("|")).digest("hex");
  }
  upsertMany(facts=[]) {
    const rows=this.read(); const byId=new Map(rows.map(x=>[x.fact_id,x]));
    let written=0;
    for (const raw of facts) {
      if (!raw?.verification?.verified || !raw?.verification?.training_rights_verified || !raw?.training_eligible) continue;
      const fact={...raw,fact_id:raw.fact_id||this.factId(raw),stored_at:new Date().toISOString()};
      byId.set(fact.fact_id,fact); written++;
    }
    const next=[...byId.values()].sort((a,b)=>String(a.fact_id).localeCompare(String(b.fact_id)));
    atomicWrite(this.file, JSON.stringify(next,null,2)+"\n");
    return {state:"SUCCESS",written,total:next.length};
  }
  filterTrainingEligible(limit=100) {
    return this.read().filter(x=>x.training_eligible===true && x.verification?.verified===true && x.verification?.training_rights_verified===true).slice(0,Math.max(0,Number(limit)||100));
  }
  snapshot() {
    const rows=this.read();
    return {state:"SUCCESS",count:rows.length,training_eligible:rows.filter(x=>x.training_eligible===true).length,integrity_sha256:crypto.createHash("sha256").update(JSON.stringify(rows)).digest("hex")};
  }
}
export default VerifiedKnowledgeStore;
