import fs from "node:fs";
import path from "node:path";

export class WitForgeCompatibility {
  constructor({root,audit=null}={}){
    this.root=root;
    this.audit=audit;
    this.sourceRoot=path.join(root,"legacy","witforge-source");
  }
  status(){
    const exists=fs.existsSync(this.sourceRoot);
    const modules=[
      "brain.js","kernel.js","action-fabric.js","device-adapters.js","forge-memory.js",
      "mental-health.js","snake-lab.js","arena-engine.js","engagement.js","platform.js",
      "model/forgelm/modeling_forgelm.py","spec/SPEC-168.md"
    ];
    const inventory=modules.map(rel=>({path:rel,present:exists&&fs.existsSync(path.join(this.sourceRoot,rel))}));
    const present=inventory.filter(x=>x.present).length;
    return {
      state:exists?"SUCCESS":"UNAVAILABLE",
      sourceRoot:this.sourceRoot,
      namespace:"legacy/witforge-source",
      commonJsBoundary:true,
      inventory,
      present,
      expected:inventory.length,
      executionPolicy:"Native UAI remains authoritative. WitForge modules are compatibility-backed or migration-source until individually ported and verified.",
      mergedSource:exists
    };
  }
  manifest(){
    const file=path.join(this.root,"integration","WITFORGE-MERGE-MANIFEST.json");
    if(!fs.existsSync(file))return {state:"UNAVAILABLE",message:"Merge manifest has not been generated yet."};
    try{return {state:"SUCCESS",manifest:JSON.parse(fs.readFileSync(file,"utf8"))};}
    catch(e){return {state:"FAILURE",message:String(e.message||e)};}
  }
}
