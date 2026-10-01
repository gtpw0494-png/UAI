import crypto from "node:crypto";
import {PlatformStateStore} from "./platform-state-store.js";

const clamp=x=>Math.max(0,Math.min(1,Number(x)||0));
const list=v=>[...(Array.isArray(v)?v:[])].map(x=>String(x).trim()).filter(Boolean);

export class ForgeCurriculum{
  constructor({stateRoot,audit=null}={}){this.db=new PlatformStateStore(stateRoot);this.audit=audit;}
  record({skill,score=0,prerequisites=[],evidence=[],attempts=1,notes=""}={}){
    const name=String(skill||"").trim();if(!name)return {state:"BLOCKED",message:"skill is required."};
    const existing=this.list(10000).find(x=>x.skill===name),now=new Date().toISOString();
    if(existing){
      const found=this.db.get("forge-curriculum-skill",existing.id),row={...found.record,score:clamp(score),prerequisites:list(prerequisites),evidence:Array.isArray(evidence)?evidence:[],attempts:Number(found.record.attempts||0)+Math.max(1,Number(attempts)||1),notes:String(notes||""),state:"ACTIVE",updatedAt:now};
      const out=this.db.cas("forge-curriculum-skill",existing.id,found.version,row,{type:"record-score",score:row.score});this.audit?.append?.({type:"forgecurriculum.skill.updated",skill:name,score:row.score});return out.state==="SUCCESS"?{state:"SUCCESS",skill:row}:out;
    }
    const row={id:"curriculum-"+crypto.randomUUID(),schema:"uai.forgecurriculum.v1",skill:name,score:clamp(score),prerequisites:list(prerequisites),evidence:Array.isArray(evidence)?evidence:[],attempts:Math.max(1,Number(attempts)||1),notes:String(notes||""),state:"ACTIVE",automaticTraining:false,createdAt:now,updatedAt:now};
    const out=this.db.create("forge-curriculum-skill",row);this.audit?.append?.({type:"forgecurriculum.skill.created",skill:name,score:row.score});return out.state==="SUCCESS"?{state:"SUCCESS",skill:row}:out;
  }
  list(limit=100){return this.db.list("forge-curriculum-skill",limit).records||[];}
  next({mastery=0.8}={}){
    const rows=this.list(10000);if(!rows.length)return {state:"UNAVAILABLE",message:"No curriculum skill evidence exists yet."};
    const threshold=clamp(mastery),byName=new Map(rows.map(x=>[x.skill,x])),weak=[...rows].sort((a,b)=>a.score-b.score);
    for(const skill of weak){
      const unmet=(skill.prerequisites||[]).map(p=>byName.get(p)).filter(p=>p&&p.score<threshold).sort((a,b)=>a.score-b.score);
      const target=unmet[0]||skill;if(target.score<threshold)return {state:"SUCCESS",target,reason:unmet.length?"PREREQUISITE_WEAKNESS":"LOWEST_MASTERY",masteryThreshold:threshold,automaticTraining:false};
    }
    return {state:"SUCCESS",target:weak[0],reason:"SPACED_RETEST",masteryThreshold:threshold,automaticTraining:false};
  }
  lesson(skill){
    const row=this.list(10000).find(x=>x.skill===String(skill));if(!row)return {state:"UNAVAILABLE",message:"Skill not found."};
    return {state:"SUCCESS",lesson:{skill:row.skill,objective:"Improve verified "+row.skill+" performance above the mastery threshold.",evidenceRequired:true,trainingRequiresSeparateAuthorization:true,acceptance:{minScore:Math.max(0.8,row.score)}}};
  }
  status(){const rows=this.list(10000);const next=rows.length?this.next():null;return {state:"SUCCESS",skills:rows.length,next:next?.target||null,automaticTraining:false};}
}
