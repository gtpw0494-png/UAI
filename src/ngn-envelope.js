import crypto from "node:crypto";
const digest=value=>crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");

export function createNGNInferenceEnvelope({artifactDigest,selectedGear,gearProbabilities,expectedComputeCost,confidence,failureProbability,capabilityScores=[]}={}){
  if(!artifactDigest)throw new Error("artifactDigest required");
  const envelope={version:1,type:"NEURAL_GEARING_INFERENCE",artifactDigest,selectedGear,gearProbabilities,expectedComputeCost,advisory:{confidence,failureProbability,capabilityScores},authorityGranted:false,executable:false,policyDecision:null,approvalId:null,capabilityToken:null};
  envelope.digest=digest(envelope);return Object.freeze(envelope);
}

export function createNGNGrowthCandidate({sourceArtifactDigest,proposedConfigDigest,reason}={}){
  if(!sourceArtifactDigest||!proposedConfigDigest)throw new Error("sourceArtifactDigest and proposedConfigDigest required");
  const candidate={version:1,type:"NEURAL_GEARING_GROWTH_CANDIDATE",sourceArtifactDigest,proposedConfigDigest,reason:String(reason||""),simulationRequired:true,canaryRequired:true,evaluationRequired:true,approvalRequiredForPromotion:true,authorityGranted:false,executable:false,promoted:false};
  candidate.digest=digest(candidate);return Object.freeze(candidate);
}
