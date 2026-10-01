import assert from "node:assert/strict";
import os from "node:os";import fs from "node:fs";import path from "node:path";
import {ForgeMuseum} from "../src/forge-museum.js";
import {ForgeCanary} from "../src/forge-canary.js";
import {ForgeRosetta} from "../src/forge-rosetta.js";
import {ForgeCurriculum} from "../src/forge-curriculum.js";
import {ForgeDreamLab} from "../src/forgedream.js";

const root=fs.mkdtempSync(path.join(os.tmpdir(),"uai-forge-evolution-"));
const museum=new ForgeMuseum({stateRoot:root});
const exhibit=museum.retire({name:"Global context",purpose:"Share everything",failedBecause:["scope pollution"],resurrectionConditions:["scoped-context"]});
assert.equal(exhibit.state,"SUCCESS");
assert.equal(museum.resurrectionCandidates({conditions:["scoped-context"]}).candidates[0].automaticResurrection,false);

const canary=new ForgeCanary({stateRoot:root});
const profile=canary.createProfile({name:"Low-memory interrupter",device:"low-memory android",network:"variable",behaviors:["interrupts"]});
assert.equal(profile.state,"SUCCESS");
const run=canary.simulate({profileId:profile.profile.id,seed:"fixed-seed",days:4,failureArchetypes:["stale-approval"]});
assert.equal(run.run.realWorldEffects,false);assert.equal(run.run.realCredentials,false);assert.equal(run.run.events.length,4);assert.equal(run.run.trainingEligible,false);

const rosetta=new ForgeRosetta({stateRoot:root});
const mapping=rosetta.register({provider:"fixture",method:"GET",path:"/documents",canonicalOperation:"READ",permissions:["documents.read"],verification:["response-schema"]});
assert.equal(mapping.mapping.status,"CANDIDATE");
const verified=rosetta.verify(mapping.mapping.id,{schemaPassed:true,authMapped:true,permissionsMapped:true,verificationMapped:true});
assert.equal(verified.mapping.mappingVerified,true);assert.equal(verified.mapping.executable,false);assert.equal(rosetta.translate(mapping.mapping.id,{id:"x"}).proposal.execution,"PROPOSAL_ONLY");

const curriculum=new ForgeCurriculum({stateRoot:root});
curriculum.record({skill:"state",score:.4});curriculum.record({skill:"planning",score:.2,prerequisites:["state"]});
assert.equal(curriculum.next().target.skill,"state");assert.equal(curriculum.status().automaticTraining,false);

const dream=new ForgeDreamLab({stateRoot:root});
const d=dream.createFromCanary({canaryRun:run.run,objective:"Reproduce interrupted approval handling"});
assert.equal(d.state,"SUCCESS");assert.equal(d.run.realWorldEffects,false);
assert.equal(dream.finish(d.run.id,{verifiedResult:{state:"SUCCESS",verified:true},score:.9}).run.trainingEligible,true);
assert.equal(dream.trainingCandidates().some(x=>x.id===d.run.id),true);

const server=fs.readFileSync(path.join(process.cwd(),"server.js"),"utf8");
const ui=fs.readFileSync(path.join(process.cwd(),"public","app.js"),"utf8");
const html=fs.readFileSync(path.join(process.cwd(),"public","index.html"),"utf8");
for(const token of ["ForgeMuseum","ForgeCanary","ForgeRosetta","ForgeCurriculum","ForgeDream"])assert.ok(server.includes(token),"server missing "+token);
for(const route of ["/api/innovation/museum/exhibits","/api/innovation/canary/profiles","/api/innovation/canary/simulate","/api/innovation/rosetta/mappings","/api/innovation/rosetta/verify","/api/innovation/curriculum/record","/api/innovation/dream/from-canary"])assert.ok(server.includes(route),"route missing "+route);
for(const token of ["ForgeMuseum","ForgeCanary","ForgeRosetta","ForgeCurriculum","ForgeDream"])assert.ok(ui.includes(token),"UI missing "+token);
assert.ok(html.includes("Forge Evolution Lab"));
console.log("Forge Evolution Lab tests passed");
