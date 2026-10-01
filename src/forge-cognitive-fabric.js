import fs from "node:fs";
import path from "node:path";
import {routeConfidence} from "./confidence-router.js";
import {confidencePolicyInput} from "./confidence-policy-bridge.js";
import {rankEvidenceProbes} from "./evidence-gain-scout.js";
import {optimizeEvidencePortfolio} from "./evidence-portfolio-optimizer.js";

export class ForgeCognitiveFabric{
  constructor({root=process.cwd()}={}){this.root=path.resolve(root);}
  status(){
    const file=rel=>fs.existsSync(path.join(this.root,rel));
    return Object.freeze({
      state:"EXPERIMENTAL",
      name:"Forge Cognitive Fabric",
      version:1,
      neuralGearing:{sourcePresent:file("model/neural_gearing.py"),trainerPresent:file("model/train_neural_gearing.py"),verifiedRuntime:false,promotionState:"CANDIDATE_ONLY"},
      confidenceRouter:{sourcePresent:file("src/confidence-router.js"),authorityGranted:false},
      evidenceGain:{sourcePresent:file("src/evidence-gain-scout.js"),authorityGranted:false},
      evidencePortfolio:{sourcePresent:file("src/evidence-portfolio-optimizer.js"),authorityGranted:false},
      boundaries:{authorityGranted:false,automaticPromotion:false,automaticGrowth:false,neuralPolicyAuthority:false,evidencePromotionRequiresIndependentVerification:true}
    });
  }
  analyze({confidence={},uncertaintyDigest="cognitive-fabric",probes=[],maxProbes=3,maxCost=1.0}={}){
    const confidenceEnvelope=routeConfidence(confidence);
    const policyHint=confidencePolicyInput(confidenceEnvelope);
    const ranked=rankEvidenceProbes({uncertaintyDigest,probes});
    const portfolio=optimizeEvidencePortfolio({uncertaintyDigest,probes:ranked.probes,maxProbes,maxCost});
    return Object.freeze({state:"SUCCESS",confidence:confidenceEnvelope,policyHint,evidenceProposals:ranked,evidencePortfolio:portfolio,authorityGranted:false,executable:false});
  }
}
