import assert from "node:assert/strict";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import {spawn} from "node:child_process";
import {LocalIdentity} from "../src/governance/identity.js";
import {AuditLog} from "../src/audit.js";

const bootstrapRoot=fs.mkdtempSync(path.join(os.tmpdir(),"uai-auth-bootstrap-"));
try{
  const audit=new AuditLog(bootstrapRoot);
  const local=new LocalIdentity(bootstrapRoot,audit,{ownerToken:null,sessionHours:1});
  const s=local.status();
  assert.equal(s.identityConfigured,true);
  assert.ok(s.bootstrapTokenPath);
  assert.ok(fs.existsSync(s.bootstrapTokenPath));
  const token=fs.readFileSync(s.bootstrapTokenPath,"utf8").trim();
  assert.ok(token.length>=32);
  assert.equal(local.verifyOwnerToken(token),true);
  const mode=fs.statSync(s.bootstrapTokenPath).mode&0o777;
  assert.equal(mode&0o077,0);
}finally{fs.rmSync(bootstrapRoot,{recursive:true,force:true});}

const root=fs.mkdtempSync(path.join(os.tmpdir(),"uai-api-v046-"));
const db=path.join(root,"knowledge.sqlite3");
const objects=path.join(root,"objects");
const state=path.join(root,"state");
const OWNER="TEST_OWNER_TOKEN_v046_0123456789abcdef";
const port=await new Promise((resolve,reject)=>{
  const s=net.createServer();s.once("error",reject);
  s.listen(0,"127.0.0.1",()=>{const p=s.address().port;s.close(()=>resolve(p));});
});
const child=spawn(process.execPath,["server.js"],{
  cwd:path.resolve(path.dirname(new URL(import.meta.url).pathname),".."),
  env:{...process.env,PORT:String(port),IUV_STATE_DIR:state,IUV_DB_PATH:db,IUV_OBJECT_ROOT:objects,IUV_OWNER_TOKEN:OWNER,IUV_RATE_LIMIT_PER_MINUTE:"10"},
  stdio:["ignore","pipe","pipe"]
});
let stdout="",stderr="";child.stdout.on("data",d=>stdout+=d);child.stderr.on("data",d=>stderr+=d);
const base=`http://127.0.0.1:${port}`;
const bearer={"authorization":"Bearer "+OWNER};

async function parse(r){const t=await r.text();let x={};try{x=t?JSON.parse(t):{};}catch{x={raw:t};}return {r,x};}
async function req(url,{method="GET",headers={},body}={}){
  return parse(await fetch(base+url,{method,headers,body:body===undefined?undefined:JSON.stringify(body)}));
}
try{
  let ready=false;
  for(let i=0;i<80;i++){
    try{const r=await fetch(base+"/api/status");if(r.ok){ready=true;break;}}catch{}
    await new Promise(r=>setTimeout(r,100));
  }
  assert.equal(ready,true,`server did not start\nstdout=${stdout}\nstderr=${stderr}`);

  const statusRaw=await fetch(base+"/api/status",{headers:{"x-correlation-id":"corr-v046"}});
  const status=await statusRaw.json();
  assert.equal(status.governanceKernel.authorityModel,"LOCAL_SELF_GOVERNED");
  assert.equal(status.governanceKernel.externalGovernanceRequired,false);
  assert.equal(statusRaw.headers.get("x-content-type-options"),"nosniff");
  assert.match(statusRaw.headers.get("content-security-policy")||"",/default-src 'self'/);
  assert.equal(statusRaw.headers.get("x-correlation-id"),"corr-v046");
  assert.match(statusRaw.headers.get("x-request-id")||"",/^req-/);

  const noAuth=await req("/api/onechat",{method:"POST",headers:{"content-type":"application/json"},body:{message:"hello"}});
  assert.equal(noAuth.r.status,401);
  assert.equal(noAuth.x.state,"UNAUTHENTICATED");

  const badShape=await req("/api/auth/login",{method:"POST",headers:{"content-type":"application/json"},body:{token:"short"}});
  assert.equal(badShape.r.status,400);
  assert.equal(badShape.x.state,"BLOCKED");

  const badOrigin=await req("/api/auth/login",{method:"POST",headers:{"content-type":"application/json","origin":"https://evil.example"},body:{token:OWNER}});
  assert.equal(badOrigin.r.status,403);
  assert.equal(badOrigin.x.state,"BLOCKED");

  const wrong=await req("/api/auth/login",{method:"POST",headers:{"content-type":"application/json"},body:{token:"WRONG_OWNER_TOKEN_0123456789abcdef"}});
  assert.equal(wrong.r.status,401);

  const loginRaw=await fetch(base+"/api/auth/login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({token:OWNER})});
  const login=await loginRaw.json();
  assert.equal(loginRaw.status,200);
  assert.equal(login.state,"SUCCESS");
  assert.ok(login.csrfToken);
  assert.equal(login.sessionToken,undefined);
  const setCookie=loginRaw.headers.get("set-cookie")||"";
  const session=setCookie.match(/uai_session=([^;,]+)/)?.[1];
  const csrf=setCookie.match(/uai_csrf=([^;,]+)/)?.[1];
  assert.ok(session&&csrf);
  const cookie=`uai_session=${session}; uai_csrf=${csrf}`;

  const cookieNoCsrf=await req("/api/onechat",{method:"POST",headers:{"content-type":"application/json","cookie":cookie},body:{message:"hello"}});
  assert.equal(cookieNoCsrf.r.status,403);
  assert.match(cookieNoCsrf.x.message,/CSRF/i);

  const chat=await req("/api/onechat",{method:"POST",headers:{"content-type":"application/json","cookie":cookie,"x-uai-csrf":decodeURIComponent(csrf)},body:{message:"hello"}});
  assert.equal(chat.r.status,200);
  assert.ok(["SUCCESS","PARTIAL","UNAVAILABLE"].includes(chat.x.state));

  const authStatus=await req("/api/auth/status",{headers:{"cookie":cookie}});
  assert.equal(authStatus.x.authenticated,true);
  assert.equal(authStatus.x.identity.id,"owner-local");

  const grantBody={scope:["test.operation"],riskCeiling:"low",maxActions:1,durationMs:60000};
  const ask=await req("/api/autonomy/grant",{method:"POST",headers:{"content-type":"application/json",...bearer},body:grantBody});
  assert.equal(ask.r.status,409);
  assert.equal(ask.x.state,"ASK");
  assert.equal(ask.x.binding.actor,"owner-local");
  assert.equal(ask.x.binding.capability,"governance.autonomy");

  const approvalReq=await req("/api/approvals/request",{method:"POST",headers:{"content-type":"application/json",...bearer},body:{...ask.x.binding,risk:"high",reason:"v0.46 exact HTTP authorization test"}});
  assert.equal(approvalReq.r.status,200);
  assert.equal(approvalReq.x.state,"SUCCESS");
  const approvalId=approvalReq.x.approval.id;

  const decision=await req("/api/approvals/decide",{method:"POST",headers:{"content-type":"application/json",...bearer},body:{id:approvalId,decision:"APPROVE"}});
  assert.equal(decision.r.status,200);
  assert.equal(decision.x.state,"SUCCESS");

  const granted=await req("/api/autonomy/grant",{method:"POST",headers:{"content-type":"application/json",...bearer},body:{...grantBody,approvalId}});
  assert.equal(granted.r.status,200);
  assert.equal(granted.x.state,"SUCCESS");

  for(let i=0;i<10;i++){
    const r=await req("/api/models",{headers:bearer});
    assert.equal(r.r.status,200);
  }
  const limited=await req("/api/models",{headers:bearer});
  assert.equal(limited.r.status,429);
  assert.equal(limited.x.state,"BLOCKED");

  const auditRes=await req("/api/audit?limit=500",{headers:bearer});
  assert.equal(auditRes.r.status,200);
  assert.ok(auditRes.x.some(x=>x.type==="api.authorize"&&x.actor==="owner-local"&&x.requestId&&x.correlationId));

  const logout=await req("/api/auth/logout",{method:"POST",headers:{"content-type":"application/json","cookie":cookie,"x-uai-csrf":decodeURIComponent(csrf)},body:{}});
  assert.equal(logout.r.status,200);
  const afterLogout=await req("/api/auth/status",{headers:{"cookie":cookie}});
  assert.equal(afterLogout.x.authenticated,false);
}finally{
  child.kill("SIGTERM");
  await new Promise(resolve=>{child.once("close",resolve);setTimeout(resolve,1000);});
  fs.rmSync(root,{recursive:true,force:true});
}
console.log("v0.46 secure API identity and authorization tests passed");
