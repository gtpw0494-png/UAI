import {spawn} from "node:child_process";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));

function run(script,args,timeout=120000){
  return new Promise(resolve=>{
    const p=spawn(process.env.PYTHON||"python3",[path.join(root,"model",script),...args],{cwd:path.join(root,"model")});
    let out="",err="",settled=false;
    const finish=payload=>{if(settled)return;settled=true;clearTimeout(timer);resolve(payload)};
    p.stdout.on("data",x=>out+=x);
    p.stderr.on("data",x=>err+=x);
    p.on("error",e=>finish({state:"UNAVAILABLE",message:String(e.message||e),script}));
    p.on("close",code=>{
      if(settled)return;
      let parsed=null;
      for(const line of String(out).trim().split(/\r?\n/).reverse()){try{parsed=JSON.parse(line);break}catch{}}
      finish(parsed&&typeof parsed==="object"?{...parsed,exitCode:code,script}:{state:code===0?"SUCCESS":"FAILURE",message:err||out||`exit ${code}`,exitCode:code,script});
    });
    const timer=setTimeout(()=>{p.kill("SIGTERM");finish({state:"TIMEOUT",message:`${script} timed out`,script})},timeout);
  });
}

export class ForgeLMBridge{
  status(){return run("self_sufficient.py",["status"],15000)}
  train(steps=80,{preset="termux-tiny",gradAccum=1}={}){return run("cli.py",["train","--steps",String(steps),"--preset",String(preset),"--grad-accum",String(gradAccum)],300000)}
  chat(prompt,max=64){return run("self_sufficient.py",["chat","--prompt",String(prompt),"--max-tokens",String(max)])}
  capability(task,prompt="",context="",max=128){return run("self_sufficient.py",[String(task),"--prompt",String(prompt),"--context",String(context),"--max-tokens",String(max)])}
  embeddings(input){return this.capability("embeddings",JSON.stringify(Array.isArray(input)?input:[String(input)]),"",1)}
  rerank(query,documents=[]){return this.capability("rerank",String(query),JSON.stringify(documents),1)}
  longContext(query,sourceText,max=192){return this.capability("long-context",String(query),String(sourceText),max)}
  selfSufficientStatus(){return run("self_sufficient.py",["status"],15000)}
}
