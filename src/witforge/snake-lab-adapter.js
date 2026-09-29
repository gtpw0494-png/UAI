import {createRequire} from "node:module";
import path from "node:path";

export class NativeSnakeLabAdapter{
  constructor({root,audit=null}={}){
    this.root=root;this.audit=audit;this.lab=null;this.error=null;
    try{
      const require=createRequire(import.meta.url);
      const mod=require(path.join(root,"legacy","witforge-source","snake-lab.js"));
      this.lab=new mod.SnakeLab({root,audit:(...args)=>audit?.append?.({type:"snake-lab.legacy",args})});
    }catch(e){this.error=String(e?.message||e);}
  }
  status(){return this.lab?this.lab.inspect():{state:"UNAVAILABLE",message:this.error||"Snake Lab is unavailable.",agent:{id:"snake-overwatch",authority:"NONE"}};}
  run(input){return this.lab?this.lab.run(input):this.status();}
  improve(input){return this.lab?this.lab.improve(input):this.status();}
  inventory(){return this.lab?this.lab.inventory():this.status();}
  reset(confirm){return this.lab?this.lab.reset(confirm):this.status();}
}
