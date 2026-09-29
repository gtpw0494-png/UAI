import {createRequire} from "node:module";
import path from "node:path";

export class NativeMentalHealthAdapter{
  constructor({root,audit=null}={}){
    this.root=root;this.audit=audit;this.service=null;this.error=null;
    try{
      const require=createRequire(import.meta.url);
      const mod=require(path.join(root,"legacy","witforge-source","mental-health.js"));
      this.service=new mod.MentalHealthService({root,audit:(...args)=>audit?.append?.({type:"mental-health.legacy",args})});
    }catch(e){this.error=String(e?.message||e);}
  }
  status(){return this.service?this.service.status():{state:"UNAVAILABLE",message:this.error||"Mental-health service is unavailable.",trainingEligible:false,retrievalEligible:false};}
  setConsent(v){return this.service?this.service.setConsent(v):this.status();}
  screen(input){return this.service?this.service.screen(input):this.status();}
  support(input){return this.service?this.service.support(input):this.status();}
  deleteAll(confirm){return this.service?this.service.deleteAll(confirm):this.status();}
}
