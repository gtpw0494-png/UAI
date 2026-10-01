import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {routeConfidence} from "../src/confidence-router.js";
import {confidencePolicyInput} from "../src/confidence-policy-bridge.js";
import {rankEvidenceProbes} from "../src/evidence-gain-scout.js";
import {calculateObservedGain} from "../src/evidence-gain-verifier.js";
import {optimizeEvidencePortfolio} from "../src/evidence-portfolio-optimizer.js";
import {verifyPortfolioOutcome} from "../src/evidence-portfolio-verifier.js";
import {createNGNInferenceEnvelope,createNGNGrowthCandidate} from "../src/ngn-envelope.js";
import {ForgeCognitiveFabric} from "../src/forge-cognitive-fabric.js";

const unverified=routeConfidence({modelConfidence:.99,evidenceConfidence:.98,executionConfidence:.97});
assert.equal(unverified.level,"HIGH");
assert.equal(unverified.authorityGranted,false);
assert.equal(confidencePolicyInput(unverified).decisionHint,"VERIFY");

const verified=routeConfidence({modelConfidence:.99,evidenceConfidence:.98,executionConfidence:.97,independentlyVerified:true});
assert.equal(verified.level,"VERIFIED");
assert.equal(verified.requiredVerification,"SATISFIED");

const weak=routeConfidence({modelConfidence:.99,evidenceConfidence:.95,executionConfidence:.31});
assert.equal(weak.level,"LOW");

const ranked=rankEvidenceProbes({uncertaintyDigest:"u1",probes:[
  {description:"registry",capability:"capability.registry.read",expectedGain:.9,cost:.1,targets:["runtime"],readOnlyClaim:true},
  {description:"remote",capability:"network.read",expectedGain:.6,cost:.8,targets:["runtime"],readOnlyClaim:true},
  {description:"tests",capability:"test.execute",expectedGain:.85,cost:.2,targets:["behavior"]}
]});
assert.equal(ranked.probes[0].description,"registry");
assert.ok(ranked.probes.every(x=>x.executable===false&&x.authorityGranted===false));

const portfolio=optimizeEvidencePortfolio({uncertaintyDigest:"u1",probes:ranked.probes,maxProbes:2,maxCost:.5});
assert.ok(portfolio.selected.length<=2);
assert.ok(portfolio.totalCost<=.5);
assert.equal(portfolio.executionOrder,null);

const first=portfolio.selected[0];
const portfolioResult=verifyPortfolioOutcome({portfolio,observations:[
  {authorized:true,verified:true,evidenceHash:"e1",resolvedTargets:first.resolvedTargets},
  {authorized:false,verified:true,evidenceHash:"bad",resolvedTargets:["behavior"]}
]});
assert.equal(portfolioResult.verifiedObservations,1);
assert.equal(portfolioResult.authorityGranted,false);

const gain=calculateObservedGain({before:80,after:32,evidenceHash:"e2",independentlyVerified:true});
assert.equal(gain.observedGain,.6);
assert.equal(gain.eligibleForTraining,true);

const inference=createNGNInferenceEnvelope({artifactDigest:"sha256:test",selectedGear:1,gearProbabilities:[.1,.8,.1],expectedComputeCost:2.5,confidence:.8,failureProbability:.2});
assert.equal(inference.executable,false);
assert.equal(inference.capabilityToken,null);

const growth=createNGNGrowthCandidate({sourceArtifactDigest:"sha256:a",proposedConfigDigest:"sha256:b",reason:"plateau"});
assert.equal(growth.promoted,false);
assert.equal(growth.simulationRequired,true);
assert.equal(growth.canaryRequired,true);

const fabric=new ForgeCognitiveFabric({root:process.cwd()});
const status=fabric.status();
assert.equal(status.state,"EXPERIMENTAL");
assert.equal(status.boundaries.neuralPolicyAuthority,false);
assert.equal(status.boundaries.automaticGrowth,false);

const analysis=fabric.analyze({confidence:{modelConfidence:.9,evidenceConfidence:.8,executionConfidence:.7},uncertaintyDigest:"u2",probes:[{description:"local test",capability:"test.execute",expectedGain:.9,cost:.2,targets:["behavior"]}]});
assert.equal(analysis.authorityGranted,false);
assert.equal(analysis.executable,false);

for(const file of ["server.js","src/onechat.js","src/capabilities.js","package.json","governance/feature-evidence.json",".github/workflows/ci.yml"]){
  assert.ok(fs.existsSync(path.join(process.cwd(),file)),`missing ${file}`);
}
const server=fs.readFileSync("server.js","utf8");
const onechat=fs.readFileSync("src/onechat.js","utf8");
const capabilities=fs.readFileSync("src/capabilities.js","utf8");
assert.ok(server.includes("ForgeCognitiveFabric"));
assert.ok(server.includes("/api/innovation/cognitive-fabric/status"));
assert.ok(onechat.includes("Forge Cognitive Fabric"));
assert.ok(capabilities.includes("local.forge.cognitive_fabric"));
console.log("Forge Cognitive Fabric verification passed");
