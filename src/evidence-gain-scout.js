import crypto from "node:crypto";
const clamp=value=>Number.isFinite(value)?Math.max(0,Math.min(1,value)):0;
const digest=value=>crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");

export function rankEvidenceProbes({uncertaintyDigest,probes=[]}={}){
  if(!uncertaintyDigest)throw new Error("uncertaintyDigest required");
  const ranked=probes.map((probe,index)=>{
    const expectedGain=clamp(probe.expectedGain),cost=clamp(probe.cost);
    const candidate={id:probe.id||`probe-${index+1}`,description:String(probe.description||""),capability:String(probe.capability||""),expectedGain,cost,utility:expectedGain/Math.max(0.05,cost+0.05),targets:[...new Set(probe.targets||[])],evidenceSource:probe.evidenceSource||null,readOnlyClaim:probe.readOnlyClaim===true,requiresCapabilityCheck:true,requiresPolicyDecision:true,requiresScopeBinding:true,authorityGranted:false,executable:false};
    candidate.digest=digest(candidate);return candidate;
  }).sort((a,b)=>b.utility-a.utility);
  const result={version:1,type:"EVIDENCE_GAIN_PROPOSALS",uncertaintyDigest,probes:ranked,authorityGranted:false,executable:false,selectedForExecution:null};
  result.digest=digest(result);return Object.freeze(result);
}
