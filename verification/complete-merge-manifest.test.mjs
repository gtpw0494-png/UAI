import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const manifestPath=path.join(root,"integration","COMPLETE-MERGE-MANIFEST.json");
assert.equal(fs.existsSync(manifestPath),true,"complete merge manifest must exist");
const m=JSON.parse(fs.readFileSync(manifestPath,"utf8"));

const packageVersion=JSON.parse(fs.readFileSync(path.join(root,"package.json"),"utf8")).version;
const releaseVersion=JSON.parse(fs.readFileSync(path.join(root,"release-manifest.json"),"utf8")).version;
assert.equal(m.version,packageVersion,"complete merge manifest version must match package.json");
assert.equal(releaseVersion,packageVersion,"release manifest version must match package.json");

assert.equal(m.schema,"uai.complete-merge.v1");
assert.equal(m.authoritativeBranch,"main");
assert.equal(m.policy.blindBranchMerge,false);
assert.equal(m.policy.historicalEvidenceProjectedToCurrent,false);
assert.equal(m.policy.privateChatsPublishedByDefault,false);
assert.equal(m.policy.archivesExecutedByDefault,false);
assert.equal(m.policy.modelPromotionRequiresGovernedApproval,true);

const byId=new Map(m.subsystems.map(x=>[x.id,x]));
for(const id of ["governance","decision-proof","chronicle","onechat","ui","forgelm","multimodal","evolution","cognitive","snake","wellbeing","integrations","android-4h3","arena-economy","release"]){
  assert.ok(byId.has(id),"missing reconciled subsystem: "+id);
}
assert.notEqual(byId.get("forgelm").status,"VERIFIED","current ForgeLM must not be overclaimed");
assert.notEqual(byId.get("android-4h3").status,"VERIFIED","Android/4H3 must remain evidence-gated");
assert.equal(byId.get("arena-economy").authority,"HISTORICAL_PROVENANCE");
assert.equal(byId.get("release").status,"UNVERIFIED");

const historical=new Map(m.historicalEvidence.map(x=>[x.id,x]));
assert.equal(historical.get("witforge-v2.22")?.status,"HISTORICAL_VERIFIED");
assert.equal(historical.get("witforge-v2.26-archive")?.sha256,"da1911bada830cd9e0389d584ca4335180860482b647d53ca0b420d656fb9030");

console.log("Complete merge reconciliation manifest tests passed");
