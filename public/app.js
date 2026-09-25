const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
const cookie=name=>document.cookie.split(";").map(x=>x.trim()).find(x=>x.startsWith(name+"="))?.slice(name.length+1)||"";
let authState={authenticated:false};
const CHAT_KEY="uai_onechat_id";
let chatId=sessionStorage.getItem(CHAT_KEY)||("chat-"+(globalThis.crypto?.randomUUID?.()||Date.now().toString(36)));
sessionStorage.setItem(CHAT_KEY,chatId);

async function api(url,{method="GET",body=null}={}){
  const headers={};
  if(body!==null)headers["content-type"]="application/json";
  const csrf=decodeURIComponent(cookie("uai_csrf")||"");if(method!=="GET"&&csrf)headers["x-uai-csrf"]=csrf;
  const r=await fetch(url,{method,headers,credentials:"same-origin",body:body===null?undefined:JSON.stringify(body)});
  const text=await r.text();let data={};try{data=text?JSON.parse(text):{};}catch{data={state:"ERROR",message:"Invalid server response."};}
  if(!r.ok){const e=new Error(data.message||("HTTP "+r.status));e.status=r.status;e.data=data;throw e;}
  return data;
}
async function post(url,body){return api(url,{method:"POST",body});}
function bubble(kind,title,html,meta=""){const el=document.createElement("article");el.className=`msg ${kind}`;el.innerHTML=`<b>${esc(title)}</b>${meta?`<small>${esc(meta)}</small>`:""}<div>${html}</div>`;$("#stream").appendChild(el);el.scrollIntoView({behavior:"smooth",block:"end"});}

async function refreshAuth(){
  try{
    const s=await api("/api/auth/status");authState=s;
    $("#authTitle").textContent=s.authenticated?"Owner authenticated":s.enrollmentRequired?"Create Owner Account":"Owner sign in";
    $("#authForm").hidden=s.authenticated;$("#logoutBtn").hidden=!s.authenticated;
    $("#authHelp").innerHTML=s.authenticated ? `Signed in as <code>${esc(s.identity?.email||"owner")}</code>. State-changing API calls are locally authorized and audited.` : s.enrollmentRequired ? "Create the one local Owner account. Enrollment closes after successful creation." : "Sign in with the Owner email and password.";
    $("#authSubmit").textContent=s.enrollmentRequired?"Create Owner":"Sign in";
  }catch(e){$("#authHelp").textContent="Identity status unavailable: "+e.message;}
}
async function refresh(){
  const s=await api("/api/status"),connected=s.capabilities.filter(x=>x.availability==="CONNECTED").length;
  $("#buildLabel").textContent=`v${s.version} · OneChat · local-first governed AI`;
  $("#topTruth").textContent=`${s.governanceKernel?.identity?.authenticated?"owner unlocked":"owner locked"} · ${s.forgelm?.checkpointExists?"ForgeLM ready":"ForgeLM unavailable"} · ${connected}/${s.capabilities.length} capabilities`;
  $("#systemContext").innerHTML=`<article><b>Version</b><span>${esc(s.version)}</span></article><article><b>Knowledge</b><span>${s.knowledgeCount}</span></article><article><b>Documents</b><span>${s.documentDataPlane?.documents||0}</span></article><article><b>Definitions</b><span>${s.languageData?.definitions||0}</span></article><article><b>Dialogue</b><span>${s.languageData?.dialogueMessages||0}</span></article><article><b>Agents</b><span>${s.agentCount}</span></article><article><b>Shadow R&D</b><span>${s.shadow?.runs||0} runs · ${s.shadow?.active||0} active</span></article><article><b>Light patches</b><span>${s.light?.patches||0} patches · ${s.light?.active||0} active</span></article><article><b>Governance stop</b><span>${s.governanceKernel?.emergencyStop?.engaged?"ENGAGED":"ready"}</span></article><article><b>Source refs</b><span>${s.sourceResearch?.count||0}</span></article><article><b>ForgeLM</b><span>${esc(s.forgelm?.state||"UNKNOWN")}</span></article><article><b>Audit</b><span>${s.auditCount}</span></article>`;
  const deps=s.neuralDependencies?.dependencies||{};$("#depSummary").innerHTML=`<p class="muted">Neural dependencies: ${Object.entries(deps).map(([k,v])=>`${esc(k)}=${esc(v)}`).join(" · ")}</p>`;
  $("#doctrine").innerHTML=`<ol>${s.doctrine.laws.map(x=>`<li>${esc(x)}</li>`).join("")}</ol><p>${esc(s.doctrine.governance.truthRule)}</p><div class="caps">${s.capabilities.map(c=>`<span class="cap ${c.availability.toLowerCase()}">${esc(c.id)} · ${esc(c.availability)}</span>`).join("")}</div>`;
}

$("#authForm").addEventListener("submit",async e=>{
  e.preventDefault();const email=$("#ownerEmail").value.trim(),password=$("#ownerPassword").value;if(!email||!password)return;
  try{const endpoint=authState.enrollmentRequired?"/api/auth/enroll":"/api/auth/login";await post(endpoint,{email,password});$("#ownerPassword").value="";await refreshAuth();await refresh();bubble("system","Security","<p>Owner session authenticated. The password is not stored in browser storage.</p>");}
  catch(err){bubble("error","Authentication",`<p>${esc(err.message)}</p>`);}
});
$("#logoutBtn").addEventListener("click",async()=>{
  try{await post("/api/auth/logout",{});await refreshAuth();await refresh();bubble("system","Security","<p>Local owner session locked.</p>");}catch(err){bubble("error","Authentication",`<p>${esc(err.message)}</p>`);}
});
$("#composer").addEventListener("submit",async e=>{
  e.preventDefault();const input=$("#chatIn"),text=input.value.trim();if(!text)return;input.value="";
  bubble("user","You",`<p>${esc(text)}</p>`);bubble("working","System","<p>Allocating collaborators and verifying result states…</p>");const wait=$("#stream .working:last-child");
  try{
    const x=await post("/api/onechat",{message:text,chatId});if(x.chatId&&x.chatId!==chatId){chatId=x.chatId;sessionStorage.setItem(CHAT_KEY,chatId);}wait.remove();const alloc=(x.allocations||[]).map(a=>a.agent).join(" + ");
    const ev=(x.contributions||[]).map(c=>`<details><summary>${esc(c.agent)} · ${esc(c.result?.state||"UNKNOWN")}</summary><pre>${esc(JSON.stringify(c.result,null,2))}</pre></details>`).join("");
    const evidenceObject=x.evidenceEnvelope||x.evidence;const evidence=evidenceObject?`<details><summary>Answer evidence</summary><pre>${esc(JSON.stringify(evidenceObject,null,2))}</pre></details>`:"";
    bubble("assistant","IntraultUniversalion",`<p>${esc(x.message)}</p>${evidence}${ev}`,`${x.state} · ${esc(x.responseMode||"response")} · ${alloc}`);refresh();
  }catch(err){
    wait.remove();if(err.status===401){await refreshAuth();bubble("error","Authentication","<p>Unlock the local owner session before using OneChat actions.</p>");}
    else if(err.status===409&&err.data?.binding){bubble("error","Approval required",`<p>${esc(err.message)}</p><pre>${esc(JSON.stringify(err.data.binding,null,2))}</pre>`);}
    else bubble("error","Error",`<p>${esc(err.message)}</p>`);
  }
});
Promise.all([refresh(),refreshAuth()]);
