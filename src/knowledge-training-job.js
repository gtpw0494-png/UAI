import crypto from "node:crypto";
import { spawn } from "node:child_process";

function run(command,args,{cwd=process.cwd(),env=process.env,timeoutMs=300000}={}){
  return new Promise(resolve=>{
    const child=spawn(command,args,{cwd,env:{...env},stdio:["ignore","pipe","pipe"]}); let stdout="",stderr="",settled=false;
    const finish=(out)=>{if(settled)return;settled=true;clearTimeout(timer);resolve(out)};
    child.stdout.on("data",d=>stdout+=d); child.stderr.on("data",d=>stderr+=d);
    child.on("error",e=>finish({state:"UNAVAILABLE",message:String(e.message||e),stdout,stderr}));
    child.on("close",code=>finish({state:code===0?"SUCCESS":"FAILURE",code,stdout,stderr}));
    const timer=setTimeout(()=>{child.kill("SIGTERM");finish({state:"TIMEOUT",stdout,stderr})},timeoutMs);
  });
}
export class KnowledgeTrainingJob {
  constructor({root=process.cwd(),stateRoot="state",python=process.env.PYTHON||"python3",runner=run}={}){this.root=root;this.stateRoot=stateRoot;this.python=python;this.runner=runner}
  async execute(batch,{steps=Number(process.env.IUV_KNOWLEDGE_TRAIN_STEPS||20),preset=process.env.IUV_KNOWLEDGE_TRAIN_PRESET||"termux-tiny"}={}){
    const count=Number(batch?.count||batch?.batch?.length||0);
    if(!count)return{state:"BLOCKED",message:"No verified training examples are available.",trained:false};
    const jobId="knowledge-train-"+crypto.randomUUID();
    const args=["model/cli.py","train","--steps",String(Math.max(1,steps)),"--preset",preset];
    const result=await this.runner(this.python,args,{cwd:this.root,env:{...process.env,IUV_KNOWLEDGE_BATCH_ID:jobId}});
    return{...result,job_id:jobId,trained:result.state==="SUCCESS",batch_count:count,preset,steps:Math.max(1,steps),command:[this.python,...args]};
  }
}
export default KnowledgeTrainingJob;
