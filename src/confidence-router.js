import crypto from "node:crypto";

export const CONFIDENCE_LEVELS=Object.freeze({VERIFIED:"VERIFIED",HIGH:"HIGH",MEDIUM:"MEDIUM",LOW:"LOW",UNKNOWN:"UNKNOWN"});

function clamp(value){
  if(!Number.isFinite(value))return null;
  return Math.max(0,Math.min(1,value));
}

function classify(score,independentlyVerified){
  if(score===null)return CONFIDENCE_LEVELS.UNKNOWN;
  if(score>=0.95&&independentlyVerified===true)return CONFIDENCE_LEVELS.VERIFIED;
  if(score>=0.80)return CONFIDENCE_LEVELS.HIGH;
  if(score>=0.55)return CONFIDENCE_LEVELS.MEDIUM;
  return CONFIDENCE_LEVELS.LOW;
}

export function routeConfidence(input={}){
  const model=clamp(input.modelConfidence);
  const evidence=clamp(input.evidenceConfidence);
  const execution=clamp(input.executionConfidence);
  const available=[model,evidence,execution].filter(value=>value!==null);
  const aggregate=available.length?Math.min(...available):null;
  const independentlyVerified=input.independentlyVerified===true;
  const level=classify(aggregate,independentlyVerified);
  let requiredVerification="MANDATORY";
  if(level==="VERIFIED")requiredVerification="SATISFIED";
  else if(aggregate!==null&&aggregate>=0.80)requiredVerification="STANDARD";
  else if(aggregate!==null&&aggregate>=0.55)requiredVerification="ENHANCED";
  const envelope={version:1,type:"CAPABILITY_CONFIDENCE_ENVELOPE",modelConfidence:model,evidenceConfidence:evidence,executionConfidence:execution,aggregateConfidence:aggregate,level,independentlyVerified,requiredVerification,authorityGranted:false,executable:false,createdAt:new Date().toISOString()};
  envelope.digest=crypto.createHash("sha256").update(JSON.stringify(envelope)).digest("hex");
  return Object.freeze(envelope);
}
