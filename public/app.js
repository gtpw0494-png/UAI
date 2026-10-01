const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
const cookie=name=>document.cookie.split(";").map(x=>x.trim()).find(x=>x.startsWith(name+"="))?.slice(name.length+1)||"";
let authState={authenticated:false};
const CHAT_KEY="uai_onechat_id",ACTIVE_TURN_KEY="uai_onechat_active_turn";
let chatId=sessionStorage.getItem(CHAT_KEY)||("chat-"+(globalThis.crypto?.randomUUID?.()||Date.now().toString(36)));
sessionStorage.setItem(CHAT_KEY,chatId);
const MAX_ATTACHMENTS=16,UPLOAD_CHUNK_BYTES=1_500_000;
let pendingAttachments=[];
let historyLoadedFor=null;
let activeTurnSession=null;
let activeEventSource=null;
let activeEventSeq=0;

const WORKSPACES=[
 ["chat","OneChat"],["operations","Actions & Tasks"],["capabilities","Capabilities"],["models","ForgeLM & Models"],["collaboration","Agents & Collaboration"],["knowledge","Knowledge & Chronicle"],["research","Research & Web"],["development","Forge Lab & Development"],["dream","ForgeDream & Snake"],["security","Security & Approvals"],["integrations","Integrations & Devices"],["memory","Memory & Provenance"],["wellbeing","Wellbeing"],["evidence","Evidence & Audit"]
];
let latestStatus=null,latestDashboard=null;
function openPanel(id){
 document.querySelectorAll("[data-panel-view]").forEach(x=>x.classList.toggle("active",x.dataset.panelView===id));
 document.querySelectorAll(".nav-item[data-panel]").forEach(x=>x.classList.toggle("active",x.dataset.panel===id));
 $("#leftNav")?.classList.remove("open");sessionStorage.setItem("uai_workspace",id);
 if(id!=="chat")refreshWorkspacePanels();
}
function truthClass(v){return String(v||"unknown").toLowerCase().replace(/[^a-z0-9_-]/g,"-");}
function cards(rows=[]){return '<div class="dashboard-grid">'+rows.map(x=>'<article class="metric-card"><b>'+esc(x[0])+'</b><strong>'+esc(x[1])+'</strong><span class="muted">'+esc(x[2]||"")+'</span></article>').join("")+'</div>';}
function commandToChat(text){openPanel("chat");$("#chatIn").value=text;$("#chatIn").focus();}
function renderCommandPalette(q=""){
 const root=$("#commandList");if(!root)return;const query=String(q).toLowerCase();
 const commands=[...WORKSPACES.map(([id,label])=>({label,kind:"workspace",value:id})),
 {label:"Show system status",kind:"chat",value:"system status"},{label:"Show capability truth",kind:"chat",value:"capability availability"},
 {label:"ForgeLM model status",kind:"chat",value:"model status"},{label:"List collaboration roles",kind:"chat",value:"collaboration roles"},
 {label:"Chronicle status",kind:"chat",value:"chronicle status"},{label:"Snake Overwatch status",kind:"chat",value:"snake lab status"},
 {label:"Policy simulation",kind:"chat",value:"policy simulation status"},{label:"List agents",kind:"chat",value:"list agents"}].filter(x=>!query||x.label.toLowerCase().includes(query)||x.value.toLowerCase().includes(query));
 root.innerHTML=commands.map((x,i)=>'<button class="command-option" data-kind="'+x.kind+'" data-value="'+esc(x.value)+'"><span>'+esc(x.label)+'</span><small>'+esc(x.kind)+'</small></button>').join("");
}
function actionBar(items=[]){return '<div class="action-bar">'+items.map(x=>'<button class="secondary-btn" data-api-get="'+esc(x[1])+'" data-api-title="'+esc(x[0])+'">'+esc(x[0])+'</button>').join("")+'</div>';}
async function refreshWorkspacePanels(){
 if(!latestStatus)try{latestStatus=await api("/api/status");}catch{}
 if(authState.authenticated&&!latestDashboard)try{latestDashboard=await api("/api/control-plane/dashboard");}catch{}
 const s=latestStatus||{},d=latestDashboard||{},caps=s.capabilities||[];let innovation={};if(authState.authenticated)try{innovation=await api("/api/innovation/status");}catch{}
 const capCounts={};for(const x of caps)capCounts[x.availability]=(capCounts[x.availability]||0)+1;
 if($("#capabilityPanel")){const genomes=innovation.capabilityGenomes||[];$("#capabilityPanel").innerHTML=cards(Object.entries(capCounts).map(([k,v])=>[k,v,"capability truth"]))+'<div class="status-block"><div class="block-head"><h3>Capability registry</h3><button class="secondary-btn" data-chat-command="capability availability">Inspect</button></div><div class="caps">'+caps.map(x=>'<span class="cap '+truthClass(x.availability)+'">'+esc(x.id)+' · '+esc(x.availability)+'</span>').join("")+'</div></div><div class="status-block"><div class="block-head"><h3>Capability Genome</h3><span class="truth-pill">'+esc(String(genomes.length))+' records</span></div><div class="record-list">'+(genomes.length?genomes.slice(0,30).map(g=>'<article class="record-card"><div><b>'+esc(g.capabilityId||g.id)+'</b><small>'+esc(g.version||"candidate")+' · '+esc(g.risk||"unknown")+'</small></div><span class="state-badge '+truthClass(g.status)+'">'+esc(g.status||"UNKNOWN")+'</span><p>'+esc((g.tests||[]).length)+' tests · '+esc((g.evidence||[]).length)+' evidence · confidence '+esc(g.confidence??0)+'</p><code>'+esc(String(g.digest||"").slice(0,20))+'</code></article>').join(""):'<p class="muted">No capability genomes have been recorded yet.</p>')+'</div><p class="muted">Candidate genomes require successful verification and explicit external approval before ACTIVE promotion.</p></div>';}
 if($("#operations")){}
 if($("#modelPanel"))$("#modelPanel").innerHTML=cards([["ForgeLM",s.forgelm?.state||"UNKNOWN",s.forgelm?.checkpointExists?"checkpoint present":"checkpoint unavailable"],["Models",d.models?.models?.length||0,"registered"],["Evaluations",(d.evaluations?.verified||0)+"/"+(d.evaluations?.runs||0),"verified"],["Artifacts",d.modelArtifacts?.total||0,stateText(d.modelArtifacts?.states||{})]]);
 if($("#collaborationPanel"))$("#collaborationPanel").innerHTML='<div class="status-block"><h3>Multi-role council</h3><p>Architect · Builder · Coder · Programmer · Software Engineer · Debugger · Test Engineer · DevOps · Database · UI/UX · ML · Performance · ForgeLM · Security · CI · Reviewer · Integrator · Chronicle · Verifier</p><p class="muted">Advisory/evidence roles do not grant execution or approval authority.</p><button onclick="document.querySelector(\'#chatIn\').value=\'collaboration roles\';document.querySelector(\'#chatIn\').focus()">Open in OneChat</button></div>';
 if($("#knowledgePanel"))$("#knowledgePanel").innerHTML=cards([["Knowledge",s.knowledgeCount||0,"records"],["Documents",s.documentDataPlane?.documents||0,"revisions"],["Provenance",d.provenance?.nodes||0,(d.provenance?.edges||0)+" edges"],["Memory",d.memory?.active||0,d.memory?.encryption||"UNKNOWN"]])+'<div class="status-block"><h3>Chronicle</h3><p class="muted">Chronicle provides history/evidence/recall while memory remains a separate consent boundary.</p></div>';
 if($("#researchPanel"))$("#researchPanel").innerHTML=cards([["Source refs",s.sourceResearch?.count||0,"registered"],["Web corpus",s.webCorpus?.records||0,"local records"],["Documents",s.documentDataPlane?.documents||0,"retrievable"]])+'<div class="status-block"><p class="muted">External web content is untrusted input and cannot grant authority.</p></div>';
 if($("#developmentPanel"))$("#developmentPanel").innerHTML=cards([["Light patches",d.light?.patches||0,stateText(d.light?.states||{})],["Shadow runs",d.shadow?.runs||0,stateText(d.shadow?.states||{})],["Worker queue",d.scheduler?.queued||0,(d.scheduler?.running||0)+" running"],["Feature evidence",d.evidence?.total||0,stateText(d.evidence?.statuses||{})]])+'<div class="status-block"><h3>Promotion boundary</h3><p class="muted">Candidate changes remain isolated until tests, evidence and approval gates succeed.</p></div>';
 if($("#dreamPanel")){const runs=innovation.forgeDream?.runs||[],worlds=innovation.forgeDream?.worlds||[];$("#dreamPanel").innerHTML='<div class="status-block"><div class="block-head"><h3>ForgeDream worlds</h3><span class="truth-pill">'+esc(String(runs.length))+' runs</span></div><div class="world-grid">'+worlds.map(w=>'<button class="world-card" data-chat-command="ForgeDream '+esc(w)+' status and safe simulation plan"><b>'+esc(w)+'</b><small>isolated · no real-world effects</small></button>').join("")+'</div></div><div class="status-block"><h3>Recent simulations</h3><div class="record-list">'+(runs.length?runs.slice(0,20).map(r=>'<article class="record-card"><div><b>'+esc(r.world||"ForgeDream")+'</b><small>'+esc(r.id||"")+'</small></div><span class="state-badge '+truthClass(r.state)+'">'+esc(r.state||"UNKNOWN")+'</span><p>'+esc(r.objective||"No objective recorded")+'</p><small>score '+esc(r.score??"—")+' · training '+esc(r.trainingEligible===true?"eligible":"not eligible")+'</small></article>').join(""):'<p class="muted">No ForgeDream runs recorded yet.</p>')+'</div></div><div class="status-block"><div class="block-head"><h3>Snake Overwatch</h3><button class="secondary-btn" data-chat-command="snake lab status">Inspect</button></div><p class="muted">Bounded experimentation only. Authority NONE; no source patch or security mutation authority.</p></div>';}
 if($("#securityPanel")){const proofs=innovation.decisionProofs||[],pendingApprovals=Object.entries(d.approvals?.states||{}).find(([k])=>k==="PENDING")?.[1]||0;$("#securityPanel").innerHTML=cards([["Emergency stop",s.governanceKernel?.emergencyStop?.engaged?"ENGAGED":"READY","governance"],["Approvals",d.approvals?.total||0,stateText(d.approvals?.states||{})],["Policy simulations",d.policySimulations?.total||0,stateText(d.policySimulations?.decisions||{})],["Audit",d.audit?.total||0,d.audit?.integrity?.state||"UNKNOWN"]])+'<div class="status-block"><div class="block-head"><h3>Approval Center</h3><button class="secondary-btn" data-api-get="/api/approvals?status=PENDING" data-api-title="Pending approvals">'+esc(String(pendingApprovals))+' pending</button></div><p class="muted">Approval decisions remain exact-operation bound. Use OneChat to review and decide with the existing governance flow.</p><button class="secondary-btn" data-chat-command="Review pending approvals and explain each exact operation before I decide">Review in OneChat</button></div>'+'<div class="status-block"><div class="block-head"><h3>Proof-of-Thought Ledger</h3><span class="truth-pill">'+esc(String(proofs.length))+' proofs</span></div><div class="decision-flow"><span>Intent</span><i>→</i><span>Evidence</span><i>→</i><span>Capability</span><i>→</i><span>Risk</span><i>→</i><span>Policy</span><i>→</i><span>Approval</span><i>→</i><span>Action</span><i>→</i><span>Verification</span><i>→</i><span>Outcome</span></div><div class="record-list">'+(proofs.length?proofs.slice(0,25).map(p=>'<article class="record-card"><div><b>'+esc(p.intent||p.id)+'</b><small>'+esc(p.capability||"no capability")+' · risk '+esc(p.risk||"unknown")+'</small></div><span class="state-badge '+truthClass(p.outcome)+'">'+esc(p.outcome||"UNKNOWN")+'</span><p>policy '+esc(p.policy?.decision||"UNKNOWN")+' · verification '+esc(p.verification?.state||"UNKNOWN")+' · private reasoning '+esc(p.privateReasoningStored===false?"not stored":"UNKNOWN")+'</p><code>'+esc(String(p.integrityHash||"").slice(0,24))+'</code></article>').join(""):'<p class="muted">No Decision Proofs recorded yet.</p>')+'</div></div>';}
 if($("#integrationPanel"))$("#integrationPanel").innerHTML='<div class="status-block"><h3>Capability-backed integrations</h3><div class="caps">'+caps.filter(x=>/provider|plugin|billing|android|device|github|google|web|physical|reference/.test(x.id)).map(x=>'<span class="cap '+truthClass(x.availability)+'">'+esc(x.id)+' · '+esc(x.availability)+'</span>').join("")+'</div><p class="muted">Unpaired or unverified device bridges remain unavailable/configured rather than being shown as functional.</p></div>';
 if($("#memoryPanel"))$("#memoryPanel").innerHTML=cards([["Active memory",d.memory?.active||0,d.memory?.encryption||"UNKNOWN"],["Provenance nodes",d.provenance?.nodes||0,(d.provenance?.edges||0)+" edges"]])+'<div class="status-block"><p class="muted">Memory is consent-controlled. Chronicle history and provenance do not silently become training data.</p></div>';
 if($("#wellbeingPanel"))$("#wellbeingPanel").innerHTML='<div class="status-block"><h3>Support roles</h3><p>Psychological Evaluator · Psychiatry Support · Counsellor · Emotional Self-Improvement</p><p class="muted">Explicit consent. No diagnosis or prescribing authority. Training and retrieval boundaries remain enforced.</p></div>';
 if($("#evidencePanel"))$("#evidencePanel").innerHTML=cards([["Features",d.evidence?.total||0,stateText(d.evidence?.statuses||{})],["Audit records",d.audit?.total||0,d.audit?.integrity?.state||"UNKNOWN"],["Evaluations",d.evaluations?.runs||0,(d.evaluations?.verified||0)+" verified"]])+'<details class="status-block"><summary>Feature evidence registry</summary><pre>'+esc(JSON.stringify(d.evidence?.features||[],null,2))+'</pre></details>';
 const liveBars={opsDashboard:[["Tasks","/api/tasks"],["Actions","/api/actions"],["Worker jobs","/api/control-plane/jobs"],["Approvals","/api/approvals"]],modelPanel:[["Model status","/api/model/status"],["Model catalog","/api/models"],["Evaluations","/api/evaluations"],["Artifacts","/api/model-artifacts"]],collaborationPanel:[["Agents","/api/agents"],["Light agents","/api/light/agents"],["Shadow agents","/api/shadow/agents"]],knowledgePanel:[["Chronicle","/api/chronicle/status"],["Today digest","/api/chronicle/digest"],["Knowledge","/api/knowledge"],["Documents","/api/documents"]],researchPanel:[["Research sources","/api/research/sources"],["Web corpus","/api/web/status"],["Knowledge research","/api/knowledge/research/status"]],developmentPanel:[["Light status","/api/light/status"],["Light patches","/api/light/patches"],["Shadow status","/api/shadow/status"],["Shadow runs","/api/shadow/runs"]],securityPanel:[["Governance","/api/governance/status"],["Approvals","/api/approvals"],["Policy simulations","/api/policy/simulations"],["Audit verify","/api/audit/verify"]],integrationPanel:[["Plugins","/api/plugins"],["Providers","/api/provider/status"],["Local runtime","/api/local/status"],["WitForge","/api/witforge/status"]],memoryPanel:[["Memory status","/api/memory/status"],["Memory records","/api/memory"],["Provenance","/api/provenance/status"],["Lifecycle","/api/data-lifecycle"]],wellbeingPanel:[["Support status","/api/mental-health/status"]],evidencePanel:[["Audit records","/api/audit"],["Audit integrity","/api/audit/verify"],["Evaluations","/api/evaluations"],["Innovation","/api/innovation/status"]]};
 for(const [id,items] of Object.entries(liveBars)){const el=document.getElementById(id);if(el)el.insertAdjacentHTML("afterbegin",actionBar(items));}

}


const humanBytes=n=>{n=Number(n||0);if(n<1024)return n+" B";if(n<1024**2)return (n/1024).toFixed(1)+" KB";if(n<1024**3)return (n/1024**2).toFixed(1)+" MB";return (n/1024**3).toFixed(1)+" GB";};
function fileKey(f){return [f.name,f.size,f.lastModified].join(":");}
function attachmentContentUrl(id){return "/api/media/content?id="+encodeURIComponent(String(id||""));}
function resetStream(message="Local-first workspace ready."){
  $("#stream").innerHTML=`<article class="msg system"><b>System</b><p>${esc(message)}</p></article>`;
}
function newChatId(){return "chat-"+(globalThis.crypto?.randomUUID?.()||Date.now().toString(36));}
async function refreshConversations(){
  const list=$("#conversationList");if(!list)return;
  if(!authState.authenticated){list.innerHTML='<p class="muted">Unlock the owner session to load conversations.</p>';return;}
  try{
    const q=$("#conversationSearch")?.value.trim()||"",archived=$("#showArchived")?.checked===true;
    const x=await api("/api/onechat/conversations?q="+encodeURIComponent(q)+"&archived="+String(archived)+"&limit=100");
    const rows=x.conversations||[];
    list.innerHTML=rows.length?rows.map(c=>`<article class="conversation-row ${c.chatId===chatId?"active":""}" data-chat-id="${esc(c.chatId)}"><button type="button" class="conversation-main" data-action="switch"><b>${esc(c.title||c.preview||"Untitled chat")}</b><small>${esc(String(c.turns||0))} turns · ${esc(String(c.attachments||0))} attachments · ${esc(String(c.evidence||0))} evidence</small></button><div class="conversation-actions"><button type="button" data-action="rename">Rename</button><button type="button" data-action="archive">${c.archived?"Unarchive":"Archive"}</button><button type="button" data-action="export">Export</button><button type="button" data-action="delete">Delete</button></div></article>`).join(""):'<p class="muted">No conversations match this view.</p>';
  }catch(e){list.innerHTML=`<p class="muted">Conversation list unavailable: ${esc(e.message)}</p>`;}
}
async function switchConversation(id){
  chatId=String(id);sessionStorage.setItem(CHAT_KEY,chatId);historyLoadedFor=null;resetStream("Loading governed conversation history…");await loadConversationHistory({force:true});await refreshConversations();
}
function turnControls(turnId){
  const id=String(turnId||"");if(!id)return "";
  return `<div class="turn-controls" data-turn-id="${esc(id)}"><button type="button" data-turn-action="edit">Edit</button><button type="button" data-turn-action="retry">Retry</button><button type="button" data-turn-action="regenerate">Regenerate</button><button type="button" data-turn-action="branch">Branch</button><button type="button" data-turn-action="copy">Copy</button><button type="button" data-turn-action="export">Export</button><button type="button" data-turn-action="evidence">Evidence</button></div><div class="turn-evidence" hidden></div>`;
}
async function fetchTurn(id){
  const x=await api("/api/onechat/turn?turnId="+encodeURIComponent(id));
  if(x.state!=="SUCCESS")throw new Error(x.message||"Turn unavailable.");
  return x.turn;
}
function renderLiveProgress(container,event){
  if(!container)return;
  const body=container.querySelector("div")||container;
  let log=body.querySelector(".live-progress");
  if(!log){log=document.createElement("div");log.className="live-progress";body.appendChild(log);}
  if(event.type==="token"){
    let answer=body.querySelector(".live-answer");
    if(!answer){answer=document.createElement("p");answer.className="live-answer";body.insertBefore(answer,log);}
    answer.textContent=String(event.text||"");
  }else if(event.type==="allocations"){
    const names=(event.allocations||[]).map(x=>x.agent).join(" + ");
    log.insertAdjacentHTML("beforeend",`<div><b>Collaborators</b><span>${esc(names||"none")}</span></div>`);
  }else if(event.type==="tool"){
    log.insertAdjacentHTML("beforeend",`<div><b>${esc(event.agent||"tool")}</b><span>${esc(event.state||"UNKNOWN")} · ${esc(event.message||"")}</span></div>`);
  }else if(["phase","model","state","persisted"].includes(event.type)){
    log.insertAdjacentHTML("beforeend",`<div><b>${esc(event.phase||event.type)}</b><span>${esc(event.state||"")} ${esc(event.message||"")}</span></div>`);
  }
  log.scrollTop=log.scrollHeight;
}
function finishLiveTurn(session,wait){
  activeTurnSession=null;activeEventSeq=0;sessionStorage.removeItem(ACTIVE_TURN_KEY);
  if(activeEventSource){activeEventSource.close();activeEventSource=null;}
  $("#stopBtn").hidden=true;$("#sendBtn").hidden=false;$("#sendBtn").disabled=false;$("#attachBtn").disabled=false;
  const x=session?.result||null;
  if(wait?.isConnected)wait.remove();
  if(x){
    const alloc=(x.allocations||[]).map(a=>a.agent).join(" + ");
    bubble(x.state==="SUCCESS"?"assistant":x.state==="PARTIAL"?"partial":x.state==="CANCELLED"?"system":"error","IntraultUniversalion",`<p>${esc(x.message||"No response")}</p>${turnControls(x.knowledgeId)}`,`${esc(x.state||session.state||"UNKNOWN")} · ${esc(x.responseMode||"response")} · ${esc(alloc)}`);
    historyLoadedFor=chatId;refreshConversations();refresh();
  }else if(session?.state==="CANCELLED"){
    bubble("system","Generation stopped","<p>The turn was cancelled. A cancelled result was not persisted as a completed answer.</p>","CANCELLED");
  }else{
    bubble("error","Turn session",`<p>${esc(session?.error||("Turn ended in "+(session?.state||"UNKNOWN")))}</p>`);
  }
}
function connectTurnEvents(sessionId,wait){
  if(activeEventSource)activeEventSource.close();
  const es=new EventSource("/api/onechat/events?id="+encodeURIComponent(sessionId)+"&since="+encodeURIComponent(activeEventSeq));
  activeEventSource=es;
  es.onmessage=e=>{
    let event=null;try{event=JSON.parse(e.data);}catch{return;}
    if(event.seq)activeEventSeq=Math.max(activeEventSeq,event.seq);
    renderLiveProgress(wait,event);
    if(event.type==="done")finishLiveTurn(event.session,wait);
  };
  es.onerror=()=>{
    es.close();
    if(activeTurnSession===sessionId)setTimeout(()=>connectTurnEvents(sessionId,wait),500);
  };
}
async function startLiveTurn(payload,wait){
  const started=await post("/api/onechat/start",payload),session=started.session;
  if(!session?.id)throw new Error("Turn session did not return an ID.");
  activeTurnSession=session.id;activeEventSeq=0;sessionStorage.setItem(ACTIVE_TURN_KEY,session.id);$("#sendBtn").hidden=true;$("#stopBtn").hidden=false;
  connectTurnEvents(session.id,wait);
}
async function recoverActiveTurn(){
  const id=sessionStorage.getItem(ACTIVE_TURN_KEY);if(!id||!authState.authenticated)return;
  try{
    const snap=await api("/api/onechat/session?id="+encodeURIComponent(id)+"&since=0"),session=snap.session;
    if(!session){sessionStorage.removeItem(ACTIVE_TURN_KEY);return;}
    if(["QUEUED","RUNNING","CANCEL_REQUESTED"].includes(session.state)){
      activeTurnSession=id;activeEventSeq=0;$("#sendBtn").hidden=true;$("#stopBtn").hidden=false;
      bubble("working","Recovered live turn","<p>Reconnected to a durable OneChat generation session.</p>");const wait=$("#stream .working:last-child");
      for(const e of snap.events||[]){if(e.seq)activeEventSeq=Math.max(activeEventSeq,e.seq);renderLiveProgress(wait,e);}
      connectTurnEvents(id,wait);return;
    }
    if(session.state==="INTERRUPTED"){
      sessionStorage.removeItem(ACTIVE_TURN_KEY);
      bubble("system","Interrupted generation",`<p>The previous live turn was interrupted by a server/process restart and was not marked completed.</p><button type="button" class="resume-session" data-session-id="${esc(id)}">Resume interrupted turn</button>`,"INTERRUPTED");
      return;
    }
    sessionStorage.removeItem(ACTIVE_TURN_KEY);
  }catch{sessionStorage.removeItem(ACTIVE_TURN_KEY);}
}
async function downloadJson(name,data){
  const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"}),a=document.createElement("a");
  a.href=URL.createObjectURL(blob);a.download=String(name||"uai-export").replace(/[^A-Za-z0-9._-]/g,"_")+".json";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
function attachmentCards(items=[]){
  if(!items.length)return "";
  return `<div class="history-attachments">${items.map(a=>{
    const label=esc(a.label||a.sourceId||a.id||"attachment"),meta=`${esc(a.modality||"file")} · ${esc(humanBytes(a.bytes||0))}`,src=attachmentContentUrl(a.id);
    let preview="";
    if(a.modality==="image")preview=`<img loading="lazy" src="${src}" alt="${label}">`;
    else if(a.modality==="audio")preview=`<audio controls preload="metadata" src="${src}"></audio>`;
    else if(a.modality==="video")preview=`<video controls preload="metadata" src="${src}"></video>`;
    else preview=`<a class="attachment-open" href="${src}" target="_blank" rel="noopener">Open</a>`;
    return `<article class="history-attachment"><div class="history-preview">${preview}</div><div><b>${label}</b><small>${meta}</small></div></article>`;
  }).join("")}</div>`;
}
async function loadConversationHistory({force=false}={}){
  if(!authState.authenticated)return;
  if(!force&&historyLoadedFor===chatId)return;
  try{
    const h=await api("/api/onechat/history?chatId="+encodeURIComponent(chatId)+"&limit=80");
    const turns=h.turns||[];
    if(!turns.length){resetStream("New local OneChat conversation.");}
    if(turns.length){
      $("#stream").innerHTML='<article class="msg system"><b>System</b><p>Restored governed OneChat history for this local session.</p></article>';
      for(const t of turns){
        const x=t,evidence=x.evidenceEnvelope||x.evidence||x.evidenceSummary||null;
        const evidenceMeta=evidence?` · evidence ${esc(evidence.id||evidence.claims||t.evidenceId||"available")}`:"";
        bubble("user","You",`<p>${esc(t.user||"")}</p>${attachmentCards(t.attachments||[])}`,t.createdAt||"");
        bubble("assistant","IntraultUniversalion",`<p>${esc(t.answer||"")}</p>${turnControls(t.id)}`,`${esc(t.state||"UNKNOWN")} · ${esc(t.responseMode||"history")}${evidenceMeta}`);
      }
    }
    historyLoadedFor=chatId;
  }catch(e){bubble("error","History",`<p>Conversation history unavailable: ${esc(e.message)}</p>`);}
}
function renderAttachmentTray(){
  const tray=$("#attachmentTray");if(!tray)return;
  tray.hidden=!pendingAttachments.length;
  tray.innerHTML=pendingAttachments.map((x,i)=>`<div class="attachment-chip ${esc(x.state||"ready")}"><div><b>${esc(x.file.name)}</b><small>${esc(humanBytes(x.file.size))} · ${esc(x.file.type||"file")}</small><div class="upload-bar"><span style="width:${Math.max(0,Math.min(100,Number(x.progress||0)))}%"></span></div></div><span class="attachment-state">${esc(x.state||"ready")}</span><button type="button" class="remove-attachment" data-index="${i}" aria-label="Remove attachment">×</button></div>`).join("");
}
function bytesToBase64(buffer){
  const bytes=new Uint8Array(buffer);let binary="",step=0x8000;
  for(let i=0;i<bytes.length;i+=step)binary+=String.fromCharCode(...bytes.subarray(i,Math.min(i+step,bytes.length)));
  return btoa(binary);
}
async function uploadAttachment(item){
  if(item.mediaId)return item;
  const file=item.file,total=Math.max(1,Math.ceil(file.size/UPLOAD_CHUNK_BYTES));
  if(total>256)throw new Error(`${file.name} exceeds the 400 MB governed media limit.`);
  const uploadId=(globalThis.crypto?.randomUUID?.()||("upload-"+Date.now()+"-"+Math.random().toString(36).slice(2))).replace(/[^A-Za-z0-9_-]/g,"_");
  item.state="uploading";item.progress=0;renderAttachmentTray();
  for(let index=0;index<total;index++){
    const part=file.slice(index*UPLOAD_CHUNK_BYTES,Math.min(file.size,(index+1)*UPLOAD_CHUNK_BYTES));
    const data=bytesToBase64(await part.arrayBuffer());
    const out=await post("/api/media/upload",{uploadId,index,total,name:file.name,mime:file.type||"application/octet-stream",sourceId:"onechat-upload:"+file.name,data});
    item.progress=Math.round(((index+1)/total)*100);item.state=out.state==="PARTIAL"?"uploading":"registered";
    if(out.upload?.mediaId){item.mediaId=out.upload.mediaId;item.artifact=out.artifact||null;item.sha256=out.upload.sha256||null;}
    renderAttachmentTray();
  }
  if(!item.mediaId)throw new Error("Upload completed without a governed media ID.");
  item.state="ready";item.progress=100;renderAttachmentTray();return item;
}

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
function stateText(states={}){return Object.entries(states).map(([k,v])=>`${k} ${v}`).join(" · ")||"none";}
async function refreshOperations(){
  const el=$("#opsDashboard");if(!el)return;
  if(!authState.authenticated){el.innerHTML='<p class="muted">Unlock the local owner session to inspect governed operations.</p>';return;}
  try{
    const d=await api("/api/control-plane/dashboard"),modelCount=d.models?.models?.length||0,jobRecent=d.scheduler?.recent||[],featureRows=d.evidence?.features||[],auditRecent=d.audit?.recent||[];
    el.innerHTML=`<div class="context-grid">
      <article><b>Tasks</b><span>${d.tasks?.total||0} · ${esc(stateText(d.tasks?.states))}</span></article>
      <article><b>Capabilities</b><span>${d.capabilities?.total||0} · ${esc(stateText(d.capabilities?.availability))}</span></article>
      <article><b>Models</b><span>${modelCount} registered · ${esc(stateText(Object.fromEntries(Object.entries(d.models?.runtimes||{}).map(([k,v])=>[k,v.availability]))))}</span></article>
      <article><b>Plugins</b><span>${d.plugins?.enabled||0}/${d.plugins?.total||0} enabled</span></article>
      <article><b>Approvals</b><span>${d.approvals?.total||0} · ${esc(stateText(d.approvals?.states))}</span></article>
      <article><b>Shadow runs</b><span>${d.shadow?.runs||0} · ${esc(stateText(d.shadow?.states))}</span></article>
      <article><b>Light patches</b><span>${d.light?.patches||0} · ${esc(stateText(d.light?.states))}</span></article>
      <article><b>Worker queue</b><span>${d.scheduler?.queued||0} queued · ${d.scheduler?.running||0} running · max ${d.scheduler?.maxWorkers||0}</span></article>
      <article><b>Private memory</b><span>${d.memory?.active||0} active · ${esc(d.memory?.encryption||"UNKNOWN")}</span></article>
      <article><b>Provenance graph</b><span>${d.provenance?.nodes||0} nodes · ${d.provenance?.edges||0} edges</span></article>
      <article><b>Evaluations</b><span>${d.evaluations?.verified||0}/${d.evaluations?.runs||0} verified</span></article>
      <article><b>Model artifacts</b><span>${d.modelArtifacts?.total||0} · ${esc(stateText(d.modelArtifacts?.states))}</span></article>
      <article><b>Policy simulations</b><span>${d.policySimulations?.total||0} · ${esc(stateText(d.policySimulations?.decisions))}</span></article>
      <article><b>Feature evidence</b><span>${d.evidence?.total||0} · ${esc(stateText(d.evidence?.statuses))}</span></article>
      <article><b>Audit</b><span>${d.audit?.total||0} records · ${esc(d.audit?.integrity?.state||"UNKNOWN")}</span></article>
    </div>
    <details><summary>Recent scheduler jobs</summary><pre>${esc(JSON.stringify(jobRecent,null,2))}</pre></details>
    <details><summary>Feature evidence registry · ${esc(d.generatedFor||"unknown")}</summary><pre>${esc(JSON.stringify(featureRows,null,2))}</pre></details>
    <details><summary>Recent audit records</summary><pre>${esc(JSON.stringify(auditRecent,null,2))}</pre></details>`;
  }catch(e){el.innerHTML=`<p class="muted">Operations dashboard unavailable: ${esc(e.message)}</p>`;}
}

async function refreshAuth(){
  try{
    const s=await api("/api/auth/status");authState=s;
    $("#authTitle").textContent=s.authenticated?"Owner authenticated":s.enrollmentRequired?"Create Owner Account":"Owner sign in";
    $("#authForm").hidden=s.authenticated;$("#logoutBtn").hidden=!s.authenticated;
    $("#authHelp").innerHTML=s.authenticated ? `Signed in as <code>${esc(s.identity?.email||"owner")}</code>. State-changing API calls are locally authorized and audited.` : s.enrollmentRequired ? "Create the one local Owner account. Enrollment closes after successful creation." : "Sign in with the Owner email and password.";
    $("#authSubmit").textContent=s.enrollmentRequired?"Create Owner":"Sign in";
    await refreshOperations();if(s.authenticated){await loadConversationHistory();await refreshConversations();await recoverActiveTurn();}
  }catch(e){$("#authHelp").textContent="Identity status unavailable: "+e.message;}
}
async function refresh(){
  const s=await api("/api/status"),connected=s.capabilities.filter(x=>x.availability==="CONNECTED").length;latestStatus=s;
  $("#buildLabel").textContent=`v${s.version} · OneChat · local-first governed AI`;
  $("#topTruth").textContent=`${s.governanceKernel?.identity?.authenticated?"owner unlocked":"owner locked"} · ${s.forgelm?.checkpointExists?"ForgeLM ready":"ForgeLM unavailable"} · ${connected}/${s.capabilities.length} capabilities`;
  $("#systemContext").innerHTML=`<article><b>Version</b><span>${esc(s.version)}</span></article><article><b>Knowledge</b><span>${s.knowledgeCount}</span></article><article><b>Documents</b><span>${s.documentDataPlane?.documents||0}</span></article><article><b>Definitions</b><span>${s.languageData?.definitions||0}</span></article><article><b>Dialogue</b><span>${s.languageData?.dialogueMessages||0}</span></article><article><b>Agents</b><span>${s.agentCount}</span></article><article><b>Shadow R&D</b><span>${s.shadow?.runs||0} runs · ${s.shadow?.active||0} active</span></article><article><b>Light patches</b><span>${s.light?.patches||0} patches · ${s.light?.active||0} active</span></article><article><b>Governance stop</b><span>${s.governanceKernel?.emergencyStop?.engaged?"ENGAGED":"ready"}</span></article><article><b>Source refs</b><span>${s.sourceResearch?.count||0}</span></article><article><b>ForgeLM</b><span>${esc(s.forgelm?.state||"UNKNOWN")}</span></article><article><b>Audit</b><span>${s.auditCount}</span></article>`;
  const deps=s.neuralDependencies?.dependencies||{};$("#depSummary").innerHTML=`<p class="muted">Neural dependencies: ${Object.entries(deps).map(([k,v])=>`${esc(k)}=${esc(v)}`).join(" · ")}</p>`;
  $("#doctrine").innerHTML=`<ol>${s.doctrine.laws.map(x=>`<li>${esc(x)}</li>`).join("")}</ol><p>${esc(s.doctrine.governance.truthRule)}</p><div class="caps">${s.capabilities.map(c=>`<span class="cap ${c.availability.toLowerCase()}">${esc(c.id)} · ${esc(c.availability)}</span>`).join("")}</div>`;
  const runtime=s.governanceKernel?.emergencyStop?.engaged?"blocked":activeTurnSession?"executing":s.forgelm?.checkpointExists?"ready":"available";$("#avatar")?.setAttribute("data-state",runtime);$("#avatarLarge")?.setAttribute("data-state",runtime);if($("#runtimeState"))$("#runtimeState").textContent=runtime.toUpperCase()+" · "+connected+"/"+s.capabilities.length+" connected";
  if(authState.authenticated){refreshOperations().then(()=>{latestDashboard=null;refreshWorkspacePanels();});}else refreshWorkspacePanels();
}

$("#authForm").addEventListener("submit",async e=>{
  e.preventDefault();const email=$("#ownerEmail").value.trim(),password=$("#ownerPassword").value;if(!email||!password)return;
  try{const endpoint=authState.enrollmentRequired?"/api/auth/enroll":"/api/auth/login";await post(endpoint,{email,password});$("#ownerPassword").value="";await refreshAuth();await refresh();bubble("system","Security","<p>Owner session authenticated. The password is not stored in browser storage.</p>");}
  catch(err){bubble("error","Authentication",`<p>${esc(err.message)}</p>`);}
});
$("#logoutBtn").addEventListener("click",async()=>{
  try{await post("/api/auth/logout",{});await refreshAuth();await refresh();bubble("system","Security","<p>Local owner session locked.</p>");}catch(err){bubble("error","Authentication",`<p>${esc(err.message)}</p>`);}
});
$("#newChatBtn").addEventListener("click",async()=>{
  chatId=newChatId();sessionStorage.setItem(CHAT_KEY,chatId);historyLoadedFor=null;pendingAttachments=[];renderAttachmentTray();resetStream("New local OneChat conversation.");await refreshConversations();$("#chatIn").focus();
});
$("#conversationSearch").addEventListener("input",()=>refreshConversations());
$("#showArchived").addEventListener("change",()=>refreshConversations());
$("#conversationList").addEventListener("click",async e=>{
  const btn=e.target.closest("button[data-action]");if(!btn)return;
  const row=btn.closest(".conversation-row"),id=row?.dataset.chatId;if(!id)return;
  const action=btn.dataset.action;
  try{
    if(action==="switch")return await switchConversation(id);
    if(action==="rename"){const title=prompt("Conversation name:","");if(title!==null)await post("/api/onechat/conversation",{chatId:id,title:title.trim()});}
    if(action==="archive")await post("/api/onechat/conversation",{chatId:id,archived:btn.textContent.trim()==="Archive"});
    if(action==="export"){
      const data=await api("/api/onechat/export?chatId="+encodeURIComponent(id));
      const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"}),a=document.createElement("a");
      a.href=URL.createObjectURL(blob);a.download=(data.title||id).replace(/[^A-Za-z0-9._-]/g,"_")+".json";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
    }
    if(action==="delete"){
      if(!confirm("Delete this conversation's local chat records? Registered media artifacts are retained."))return;
      await post("/api/onechat/delete",{chatId:id});
      if(id===chatId){chatId=newChatId();sessionStorage.setItem(CHAT_KEY,chatId);historyLoadedFor=null;resetStream("Conversation deleted. Started a new local chat.");}
    }
    await refreshConversations();
  }catch(err){bubble("error","Conversation",`<p>${esc(err.message)}</p>`);}
});
$("#stream").addEventListener("click",async e=>{
  const resume=e.target.closest(".resume-session");
  if(resume){
    try{
      const out=await post("/api/onechat/resume",{id:resume.dataset.sessionId});
      const session=out.session;if(!session?.id)throw new Error("Resume did not return a new session.");
      activeTurnSession=session.id;activeEventSeq=0;sessionStorage.setItem(ACTIVE_TURN_KEY,session.id);
      $("#sendBtn").hidden=true;$("#stopBtn").hidden=false;
      bubble("working","Resumed turn","<p>Restarted the interrupted turn as a new governed session.</p>");const wait=$("#stream .working:last-child");
      connectTurnEvents(session.id,wait);resume.disabled=true;
    }catch(err){bubble("error","Resume generation",`<p>${esc(err.message)}</p>`);}
    return;
  }
  const btn=e.target.closest("button[data-turn-action]");if(!btn)return;
  const controls=btn.closest(".turn-controls"),turnId=controls?.dataset.turnId;if(!turnId)return;
  const action=btn.dataset.turnAction;
  try{
    if(action==="copy"){
      const t=await fetchTurn(turnId);await navigator.clipboard.writeText(t.answer||"");btn.textContent="Copied";setTimeout(()=>btn.textContent="Copy",1200);return;
    }
    if(action==="export"){
      const data=await api("/api/onechat/turn-export?turnId="+encodeURIComponent(turnId));await downloadJson("uai-turn-"+turnId,data);return;
    }
    if(action==="evidence"){
      const panel=controls.parentElement.querySelector(".turn-evidence");if(!panel)return;
      if(!panel.hidden){panel.hidden=true;return;}
      const t=await fetchTurn(turnId),evidence=t.evidenceEnvelope||{message:"No structured evidence envelope stored for this turn."};
      panel.innerHTML=`<pre>${esc(JSON.stringify(evidence,null,2))}</pre>`;panel.hidden=false;return;
    }
    if(action==="branch"){
      const b=await post("/api/onechat/branch",{turnId,includeTurn:true});await switchConversation(b.chatId);return;
    }
    if(action==="edit"){
      const t=await fetchTurn(turnId),edited=prompt("Edit this message and create a branch:",t.user||"");
      if(edited===null||!edited.trim())return;
      const out=await post("/api/onechat/retry",{turnId,message:edited.trim()});chatId=out.chatId;sessionStorage.setItem(CHAT_KEY,chatId);historyLoadedFor=null;await loadConversationHistory({force:true});await refreshConversations();return;
    }
    if(action==="retry"||action==="regenerate"){
      const out=await post("/api/onechat/retry",{turnId});chatId=out.chatId;sessionStorage.setItem(CHAT_KEY,chatId);historyLoadedFor=null;await loadConversationHistory({force:true});await refreshConversations();return;
    }
  }catch(err){bubble("error","Turn control",`<p>${esc(err.message)}</p>`);}
});
$("#stopBtn").addEventListener("click",async()=>{
  if(!activeTurnSession)return;
  const id=activeTurnSession;$("#stopBtn").disabled=true;
  try{await post("/api/onechat/stop",{id});}
  catch(err){bubble("error","Stop generation",`<p>${esc(err.message)}</p>`);}
  finally{$("#stopBtn").disabled=false;}
});
$("#attachBtn").addEventListener("click",()=>$("#filePicker").click());
$("#filePicker").addEventListener("change",e=>{
  const files=[...e.target.files||[]];
  for(const file of files){
    if(pendingAttachments.length>=MAX_ATTACHMENTS)break;
    if(!pendingAttachments.some(x=>fileKey(x.file)===fileKey(file)))pendingAttachments.push({file,state:"ready",progress:0,mediaId:null});
  }
  e.target.value="";renderAttachmentTray();
});
$("#attachmentTray").addEventListener("click",e=>{
  const btn=e.target.closest(".remove-attachment");if(!btn)return;
  const i=Number(btn.dataset.index);if(Number.isInteger(i))pendingAttachments.splice(i,1);renderAttachmentTray();
});
$("#composer").addEventListener("submit",async e=>{
  e.preventDefault();const input=$("#chatIn"),text=input.value.trim(),send=$("#sendBtn"),attach=$("#attachBtn");if((!text&&!pendingAttachments.length)||activeTurnSession)return;
  send.disabled=true;attach.disabled=true;
  const shownText=text||"Analyse the attached evidence.";
  const names=pendingAttachments.map(x=>`<span class="inline-file">${esc(x.file.name)}</span>`).join(" ");
  bubble("user","You",`<p>${esc(shownText)}</p>${names?`<div class="inline-files">${names}</div>`:""}`);
  bubble("working","System","<p>Securing attachments and starting governed turn execution…</p>");const wait=$("#stream .working:last-child");
  try{
    const uploaded=[];
    for(const item of pendingAttachments){await uploadAttachment(item);uploaded.push({mediaId:item.mediaId,label:item.file.name,sourceId:item.artifact?.sourceId||("onechat-upload:"+item.file.name)});}
    await startLiveTurn({message:shownText,chatId,attachments:uploaded},wait);
    input.value="";pendingAttachments=[];renderAttachmentTray();
  }catch(err){
    wait.remove();if(err.status===401){await refreshAuth();bubble("error","Authentication","<p>Unlock the local owner session before using OneChat actions.</p>");}
    else if(err.status===409&&err.data?.binding){bubble("error","Approval required",`<p>${esc(err.message)}</p><pre>${esc(JSON.stringify(err.data.binding,null,2))}</pre>`);}
    else bubble("error","Error",`<p>${esc(err.message)}</p>`);
  }finally{if(!activeTurnSession){send.disabled=false;attach.disabled=false;}}
});
Promise.all([refresh(),refreshAuth()]);

document.querySelectorAll(".nav-item[data-panel]").forEach(b=>b.addEventListener("click",()=>openPanel(b.dataset.panel)));
$("#navToggle")?.addEventListener("click",()=>$("#leftNav")?.classList.toggle("open"));
$("#conversationsBtn")?.addEventListener("click",()=>{const p=$("#conversationPane");p.hidden=!p.hidden;if(!p.hidden)refreshConversations();});
$("#commandBtn")?.addEventListener("click",()=>{$("#commandPalette").hidden=false;renderCommandPalette();setTimeout(()=>$("#commandSearch")?.focus(),0);});
$("#commandClose")?.addEventListener("click",()=>$("#commandPalette").hidden=true);
$("#commandSearch")?.addEventListener("input",e=>renderCommandPalette(e.target.value));
$("#commandList")?.addEventListener("click",e=>{const b=e.target.closest(".command-option");if(!b)return;if(b.dataset.kind==="workspace")openPanel(b.dataset.value);else commandToChat(b.dataset.value);$("#commandPalette").hidden=true;});
document.addEventListener("keydown",e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();$("#commandPalette").hidden=false;renderCommandPalette();$("#commandSearch")?.focus();}if(e.key==="Escape"){$("#commandPalette").hidden=true;$("#leftNav")?.classList.remove("open");}});
openPanel(sessionStorage.getItem("uai_workspace")||"chat");

// Unified workspace delegated actions
addEventListener("click",e=>{const b=e.target.closest("[data-chat-command]");if(!b)return;commandToChat(b.dataset.chatCommand||"");});


// Persistent visual theme + motion controls
const THEME_KEY="uai_visual_theme",MOTION_KEY="uai_visual_motion";
function applyTheme(name){const allowed=new Set(["forge","neon","ember","aurora","light"]);const theme=allowed.has(name)?name:"forge";document.documentElement.dataset.theme=theme;localStorage.setItem(THEME_KEY,theme);document.querySelectorAll("[data-theme]").forEach(x=>x.classList.toggle("active",x.dataset.theme===theme));}
function applyMotion(enabled){document.documentElement.dataset.motion=enabled?"on":"off";localStorage.setItem(MOTION_KEY,enabled?"on":"off");const x=$("#motionToggle");if(x)x.checked=enabled;}
applyTheme(localStorage.getItem(THEME_KEY)||"forge");applyMotion(localStorage.getItem(MOTION_KEY)!=="off");
$("#themeBtn")?.addEventListener("click",()=>{$("#themeStudio").hidden=false;});
$("#themeClose")?.addEventListener("click",()=>{$("#themeStudio").hidden=true;});
$("#themeStudio")?.addEventListener("click",e=>{if(e.target===$("#themeStudio"))$("#themeStudio").hidden=true;const b=e.target.closest("[data-theme]");if(b)applyTheme(b.dataset.theme);});
$("#motionToggle")?.addEventListener("change",e=>applyMotion(e.target.checked));
addEventListener("keydown",e=>{if(e.key==="Escape"&&$("#themeStudio")&&!$("#themeStudio").hidden)$("#themeStudio").hidden=true;});

// Universal connected read-control inspector
function closeInspector(){if($("#liveInspector"))$("#liveInspector").hidden=true;}
async function inspectApi(path,title){const modal=$("#liveInspector"),body=$("#inspectorBody");if(!modal||!body)return;modal.querySelector(".inspector-links")?.remove();$("#inspectorTitle").textContent=title||"Live inspector";$("#inspectorMeta").textContent=path;body.textContent="Loading governed runtime data…";modal.hidden=false;try{const out=await api(path);body.textContent=JSON.stringify(out,null,2);renderInspectorLinks(out,body);}catch(e){body.textContent="UNAVAILABLE\n"+String(e.message||e);}}\nfunction renderInspectorLinks(out,body){const ids=[];const walk=v=>{if(!v||typeof v!=="object")return;if(Array.isArray(v)){v.forEach(walk);return;}for(const [k,x] of Object.entries(v)){if(typeof x==="string"&&/^(action-|approval-|task-|chronicle-)/.test(x))ids.push([k,x]);else walk(x);}};walk(out);const unique=[...new Map(ids.map(x=>[x[1],x])).values()].slice(0,30);if(!unique.length)return;const nav=document.createElement("div");nav.className="inspector-links";nav.innerHTML=unique.map(([k,id])=>`<button class="secondary-btn" data-linked-id="${esc(id)}">${esc(k)} · ${esc(id.slice(0,22))}</button>`).join("");body.after(nav);}\nasync function inspectLinked(id){if(id.startsWith("action-"))return inspectApi("/api/actions?id="+encodeURIComponent(id),"Action Envelope");if(id.startsWith("approval-"))return inspectApi("/api/approvals","Approvals");if(id.startsWith("task-"))return inspectApi("/api/tasks","Tasks");if(id.startsWith("chronicle-"))return inspectApi("/api/chronicle/timeline?subjectId="+encodeURIComponent(id),"Chronicle timeline");}
addEventListener("click",e=>{const b=e.target.closest("[data-api-get]");if(b){inspectApi(b.dataset.apiGet,b.dataset.apiTitle);return;}if(e.target===$("#liveInspector"))closeInspector();});
$("#inspectorClose")?.addEventListener("click",closeInspector);
addEventListener("keydown",e=>{if(e.key==="Escape")closeInspector();});

addEventListener("click",e=>{const b=e.target.closest("[data-linked-id]");if(b)inspectLinked(b.dataset.linkedId);});
