import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

class JsonRegistry {
  constructor(file, seed=[]){this.file=file;fs.mkdirSync(path.dirname(file),{recursive:true});if(!fs.existsSync(file))fs.writeFileSync(file,JSON.stringify(seed,null,2));}
  list(){return JSON.parse(fs.readFileSync(this.file,"utf8"));}
  add(item){const all=this.list();const rec={id:item.id||crypto.randomUUID(),createdAt:new Date().toISOString(),...item};all.push(rec);fs.writeFileSync(this.file,JSON.stringify(all,null,2));return rec;}
}

export class ControlCenter {
  constructor(stateRoot,audit){
    this.audit=audit;
    this.accounts=new JsonRegistry(path.join(stateRoot,"accounts.json"));
    this.subscriptions=new JsonRegistry(path.join(stateRoot,"subscriptions.json"));
    this.plugins=new JsonRegistry(path.join(stateRoot,"plugins.json"),[
      {id:"local-knowledge",name:"Local Knowledge",kind:"builtin",availability:"CONNECTED",capabilities:["knowledge.read","knowledge.write"]},
      {id:"local-development",name:"Local Development",kind:"builtin",availability:"CONNECTED",capabilities:["source.inspect","source.propose","source.apply"]}
    ]);
  }
  addAccount(input){
    const rec=this.accounts.add({name:String(input.name||"Account"),provider:String(input.provider||"local"),externalId:String(input.externalId||""),notes:String(input.notes||""),credentialState:"NOT_STORED_HERE"});
    this.audit?.append({type:"account.add",accountId:rec.id,provider:rec.provider});return rec;
  }
  addSubscription(input){
    const rec=this.subscriptions.add({name:String(input.name||"Subscription"),provider:String(input.provider||"manual"),plan:String(input.plan||""),amount:input.amount??null,currency:String(input.currency||""),renewal:String(input.renewal||""),source:"USER_RECORDED",liveBillingVerified:false});
    this.audit?.append({type:"subscription.add",subscriptionId:rec.id,provider:rec.provider});return rec;
  }
  registerPlugin(input){
    const rec=this.plugins.add({name:String(input.name||"Plugin"),kind:String(input.kind||"manifest"),endpoint:String(input.endpoint||""),capabilities:Array.isArray(input.capabilities)?input.capabilities.map(String):[],availability:"REGISTERED_NOT_VERIFIED"});
    this.audit?.append({type:"plugin.register",pluginId:rec.id});return rec;
  }
}
