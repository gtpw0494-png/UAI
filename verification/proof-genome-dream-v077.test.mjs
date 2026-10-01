import assert from "node:assert/strict";
import os from "node:os";import fs from "node:fs";import path from "node:path";
import {DecisionProofLedger} from "../src/decision-proof-ledger.js";
import {CapabilityGenomeRegistry} from "../src/capability-genome.js";
import {ForgeDreamLab} from "../src/forgedream.js";
import {EvolutionCoordinator} from "../src/evolution-coordinator.js";
const root=fs.mkdtempSync(path.join(os.tmpdir(),"uai-v077-"));
const sim={simulate:()=>({simulation:{overallDecision:"ASK",violations:[],approvalsRequired:[{reason:"high impact"}],saferPlan:[{action:"REQUIRE_EXPLICIT_APPROVAL"}]}})};
const proof=new DecisionProofLedger({stateRoot:root,policySimulator:sim}).create({intent:"modify code",actor:"owner",capability:"local.code.mutate",risk:"high",policyDecision:"ASK",action:{operation:"code.patch",resource:"repo"},artifact:"patch"});
assert.equal(proof.state,"SUCCESS");assert.equal(proof.proof.privateReasoningStored,false);assert.equal(proof.proof.policy.counterfactual.overallDecision,"ASK");
const genomes=new CapabilityGenomeRegistry({stateRoot:root});const cand=genomes.candidate({id:"filesystem.write",availability:"CONNECTED",tests:["write-fixture"]});assert.equal(cand.genome.status,"CANDIDATE");assert.equal(genomes.promote(cand.genome.id,{approved:false,testState:"SUCCESS"}).state,"BLOCKED");
const promoted=genomes.promote(cand.genome.id,{approved:true,testState:"SUCCESS"});assert.equal(promoted.state,"SUCCESS");assert.equal(promoted.genome.status,"ACTIVE");
const dream=new ForgeDreamLab({stateRoot:root});const run=dream.create({world:"RepoWorld",objective:"repair safely"});assert.equal(run.run.realWorldEffects,false);const fin=dream.finish(run.run.id,{verifiedResult:{state:"SUCCESS",verified:true},score:1});assert.equal(fin.run.trainingEligible,true);assert.equal(dream.list().find(x=>x.id===run.run.id).state,"SUCCESS");
const loop=new EvolutionCoordinator({genomes,dreams,proofs:new DecisionProofLedger({stateRoot:root,policySimulator:sim})});
const evo=loop.begin({capability:{id:"repo.patch",tests:["sandbox"]},world:"RepoWorld",objective:"repair fixture"});
assert.equal(evo.state,"SUCCESS");assert.equal(evo.evaluation.promotionAuthorized,false);
const concluded=loop.conclude({evaluation:evo.evaluation,result:{verifiedResult:{state:"SUCCESS",verified:true},score:0.95},actor:"owner"});
assert.equal(concluded.state,"PARTIAL");assert.equal(concluded.evaluation.state,"VERIFIED_AWAITING_APPROVAL");assert.equal(concluded.evaluation.promotionAuthorized,false);assert.equal(concluded.decisionProof.privateReasoningStored,false);
assert.equal(loop.promote({genomeId:evo.candidate.id,approved:false,verificationState:"SUCCESS"}).state,"BLOCKED");
assert.equal(loop.promote({genomeId:evo.candidate.id,approved:true,verificationState:"SUCCESS"}).state,"SUCCESS");

// UI/server integration contract
const ui=fs.readFileSync(path.join(process.cwd(),"public","app.js"),"utf8");
const html=fs.readFileSync(path.join(process.cwd(),"public","index.html"),"utf8");
const server=fs.readFileSync(path.join(process.cwd(),"server.js"),"utf8");
for(const panel of ["capabilityPanel","dreamPanel","securityPanel"])assert.ok(html.includes(panel));
assert.ok(ui.includes("/api/innovation/status"));
assert.ok(ui.includes("private reasoning"));
assert.ok(ui.includes("data-chat-command"));
assert.ok(server.includes("/api/innovation/status"));

const styles=fs.readFileSync(path.join(process.cwd(),"public","styles.css"),"utf8");
assert.ok(html.includes("themeStudio"));assert.ok(html.includes("data-theme=\"neon\""));assert.ok(ui.includes("uai_visual_theme"));assert.ok(ui.includes("applyMotion"));assert.ok(styles.includes('html[data-theme="aurora"]'));assert.ok(styles.includes("prefers-reduced-motion"));
for(const route of ["/api/tasks","/api/actions","/api/approvals","/api/model/status","/api/agents","/api/chronicle/status","/api/research/sources","/api/light/status","/api/shadow/status","/api/governance/status","/api/provider/status","/api/memory/status","/api/provenance/status","/api/mental-health/status","/api/audit/verify"])assert.ok(server.includes(route),"server route missing: "+route);
assert.ok(html.includes("liveInspector"));assert.ok(ui.includes("inspectApi"));assert.ok(ui.includes("data-api-get"));assert.ok(styles.includes(".action-bar"));
console.log("Proof/Genome/ForgeDream evolution tests passed");
