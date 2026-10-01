import crypto from "node:crypto";
const hash=value=>crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
const clamp=value=>Number.isFinite(value)?Math.max(0,Math.min(1,value)):0;

export function optimizeEvidencePortfolio({uncertaintyDigest,probes=[],maxProbes=3,maxCost=1.0}={}){
  if(!uncertaintyDigest)throw new Error("uncertaintyDigest required");
  const unresolved=new Set(probes.flatMap(probe=>probe.targets||[]));
  const selected=[];let totalCost=0;
  const remaining=probes.map((probe,index)=>({id:probe.id||`probe-${index+1}`,description:String(probe.description||""),capability:String(probe.capability||""),expectedGain:clamp(probe.expectedGain),cost:clamp(probe.cost),targets:[...new Set(probe.targets||[])],evidenceSource:probe.evidenceSource||null,digest:probe.digest||null}));
  while(remaining.length&&selected.length<Math.max(1,maxProbes)&&totalCost<maxCost){
    let bestIndex=-1,bestUtility=-Infinity;
    for(let i=0;i<remaining.length;i++){
      const probe=remaining[i];if(totalCost+probe.cost>maxCost)continue;
      const newTargets=probe.targets.filter(target=>unresolved.has(target));if(!newTargets.length)continue;
      const coverage=newTargets.length/Math.max(1,probe.targets.length),diversityBonus=newTargets.length*0.15;
      const utility=(probe.expectedGain*coverage)+diversityBonus-(probe.cost*0.35);
      if(utility>bestUtility){bestUtility=utility;bestIndex=i;}
    }
    if(bestIndex<0)break;
    const chosen=remaining.splice(bestIndex,1)[0],resolvedTargets=chosen.targets.filter(target=>unresolved.has(target));
    for(const target of resolvedTargets)unresolved.delete(target);
    totalCost+=chosen.cost;
    selected.push({...chosen,resolvedTargets,portfolioUtility:bestUtility,authorityGranted:false,executable:false,requiresPolicyDecision:true,requiresCapabilityCheck:true,requiresScopeBinding:true});
  }
  const result={version:1,type:"EVIDENCE_PORTFOLIO",uncertaintyDigest,selected,unresolvedTargets:[...unresolved],totalCost:Math.round(totalCost*1000)/1000,authorityGranted:false,executable:false,executionOrder:null};
  result.digest=hash(result);return Object.freeze(result);
}
