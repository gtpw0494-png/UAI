import {spawn} from "node:child_process";
import path from "node:path";
import {fileURLToPath} from "node:url";
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
function run(args,timeout=120000){return new Promise(resolve=>{const p=spawn(process.env.PYTHON||"python3",[path.join(root,"model","self_sufficient.py"),...args],{cwd:path.join(root,"model")});let out="",err="";p.stdout.on("data",x=>out+=x);p.stderr.on("data",x=>err+=x);const t=setTimeout(()=>{p.kill("SIGTERM");resolve({state:"FAILURE",message:"ForgeLM operation timed out"})},timeout);p.on("close",code=>{clearTimeout(t);try{resolve(JSON.parse(out))}catch{resolve({state:code===0?"SUCCESS":"FAILURE",message:err||out||`exit ${code}`})}})})}
export class ForgeLMBridge{
 status(){return run(["status"],15000)}
 train(steps=80){return run(["train","--steps",String(steps)],180000)}
 chat(prompt,max=64){return run(["chat","--prompt",String(prompt),"--max-tokens",String(max)])}
 capability(task,prompt="",context="",max=128){return run([String(task),"--prompt",String(prompt),"--context",String(context),"--max-tokens",String(max)])}
 selfSufficientStatus(){return run(["status"],15000)}
}
