import crypto from "node:crypto";

export const DEFAULT_ROLES=Object.freeze([
  {id:"architect",label:"Architect",authority:"ADVISORY"},
  {id:"builder",label:"Builder",authority:"ADVISORY"},
  {id:"coder",label:"Coder",authority:"ADVISORY",specialty:"CODE_IMPLEMENTATION"},
  {id:"programmer",label:"Programmer",authority:"ADVISORY",specialty:"ALGORITHMS_RUNTIME_LOGIC"},
  {id:"software-engineer",label:"Software Engineer",authority:"ADVISORY",specialty:"SOFTWARE_ARCHITECTURE_INTEGRATION_QUALITY"},
  {id:"debugger",label:"Debugger",authority:"ADVISORY",specialty:"FAULT_ISOLATION_ROOT_CAUSE"},
  {id:"test-engineer",label:"Test Engineer",authority:"EVIDENCE_ONLY",specialty:"TEST_DESIGN_REGRESSION_VALIDATION"},
  {id:"devops-engineer",label:"DevOps Engineer",authority:"ADVISORY",specialty:"CI_CD_RELEASE_OPERATIONS"},
  {id:"database-engineer",label:"Database Engineer",authority:"ADVISORY",specialty:"DATA_MODEL_STORAGE_INTEGRITY"},
  {id:"ui-ux-engineer",label:"UI/UX Engineer",authority:"ADVISORY",specialty:"INTERACTION_ACCESSIBILITY_INTERFACE"},
  {id:"ml-engineer",label:"ML Engineer",authority:"ADVISORY",specialty:"MODEL_TRAINING_EVALUATION_RUNTIME"},
  {id:"performance-engineer",label:"Performance Engineer",authority:"ADVISORY",specialty:"PROFILING_LATENCY_RESOURCE_EFFICIENCY"},
  {id:"forgelm",label:"ForgeLM",authority:"ADVISORY"},
  {id:"security",label:"Security",authority:"VETO_RECOMMENDATION"},
  {id:"ci",label:"CI",authority:"EVIDENCE_ONLY"},
  {id:"reviewer",label:"Reviewer",authority:"ADVISORY"},
  {id:"integrator",label:"Integrator",authority:"ADVISORY"},
  {id:"chronicle",label:"Chronicle",authority:"RECORD_ONLY"},
  {id:"verifier",label:"Verifier",authority:"EVIDENCE_ONLY"}
]);

const clean=v=>String(v??"").trim();

export class MultiRoleCollaboration {
  constructor({roles=DEFAULT_ROLES,chronicle=null,audit=null}={}){
    this.roles=new Map(roles.map(r=>[r.id,Object.freeze({...r})]));
    this.chronicle=chronicle;
    this.audit=audit;
  }
  status(){return {state:"SUCCESS",version:"0.76.0",mode:"SIMULATED_MULTI_ROLE",roles:[...this.roles.values()],executionAuthority:"NONE",approvalAuthority:"NONE"};}
  handoff(decision,{target="development",requestedAction="PLAN"}={}){
    if(!decision?.id||!decision?.topic)return {state:"BLOCKED",message:"A collaboration decision is required."};
    if(decision.state==="BLOCKED")return {state:"BLOCKED",message:"Blocked collaboration decisions cannot be handed off.",collaborationId:decision.id};
    const allowed=new Set(["development","self-development","forgelm","task-planning"]);
    if(!allowed.has(clean(target)))return {state:"BLOCKED",message:"Unsupported collaboration handoff target."};
    const envelope={id:"handoff-"+crypto.randomUUID(),collaborationId:decision.id,target:clean(target),requestedAction:clean(requestedAction)||"PLAN",topic:decision.topic,state:"WAITING_APPROVAL",executionAuthority:"NONE",approvalAuthority:"EXTERNAL_GOVERNANCE",authorized:false,createdAt:new Date().toISOString()};
    this.audit?.append?.({type:"collaboration.handoff.created",handoffId:envelope.id,collaborationId:decision.id,target:envelope.target,state:envelope.state});
    this.chronicle?.record?.({eventType:"collaboration.handoff",subjectId:envelope.id,sourceId:"uai:collaboration",state:envelope.state,verified:false,trainingEligible:false,payload:{collaborationId:decision.id,target:envelope.target,requestedAction:envelope.requestedAction,authorized:false}});
    return {state:"WAITING_APPROVAL",handoff:envelope};
  }
  deliberate({topic,contributions=[],ownerId=null,chatId=null}={}){
    const subject=clean(topic);
    if(!subject)return {state:"BLOCKED",message:"topic required."};
    const rows=[];
    for(const c of Array.isArray(contributions)?contributions:[]){
      const role=this.roles.get(clean(c?.role).toLowerCase());
      if(!role)return {state:"BLOCKED",message:`Unknown collaboration role: ${clean(c?.role)||"(empty)"}`};
      const message=clean(c?.message);
      if(!message)continue;
      rows.push({role:role.id,label:role.label,authority:role.authority,message});
    }
    const securityObjections=rows.filter(x=>x.role==="security"&&/\b(block|deny|unsafe|violation|not authorized|unauthori[sz]ed)\b/i.test(x.message));
    const evidenceObjections=rows.filter(x=>["ci","verifier","test-engineer"].includes(x.role)&&/\b(fail|failed|missing|unknown|unverified|no evidence)\b/i.test(x.message));
    const state=securityObjections.length?"BLOCKED":evidenceObjections.length?"PARTIAL":"SUCCESS";
    const decision={id:"collab-"+crypto.randomUUID(),topic:subject,state,contributions:rows,executionAuthority:"NONE",approvalAuthority:"NONE",requiresExternalAuthorization:true,createdAt:new Date().toISOString()};
    this.audit?.append?.({type:"collaboration.deliberated",collaborationId:decision.id,chatId:chatId||null,ownerId:ownerId||null,state,roles:[...new Set(rows.map(x=>x.role))]});
    this.chronicle?.record?.({eventType:"collaboration.deliberation",subjectId:decision.id,sourceId:chatId?"onechat:"+chatId:"uai:collaboration",ownerId,state,verified:false,trainingEligible:false,payload:{topic:subject,roles:decision.contributions.map(x=>x.role),executionAuthority:"NONE"}});
    return {state,decision};
  }
}
