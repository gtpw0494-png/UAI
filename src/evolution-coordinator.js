import crypto from "node:crypto";
export class EvolutionCoordinator{
 constructor({genomes,dreams,proofs,audit=null}={}){this.genomes=genomes;this.dreams=dreams;this.proofs=proofs;this.audit=audit;}
 begin({capability,world="ChaosWorld",objective="",constraints=[],mutations=[]}={}){
  const candidate=this.genomes.candidate(capability||{});if(candidate.state!=="SUCCESS")return candidate;
  const dream=this.dreams.create({world,objective:objective||("Evaluate "+candidate.genome.capabilityId),constraints:[...constraints,"no self approval"],mutations});
  if(dream.state!=="SUCCESS")return dream;
  const evaluation={id:"evolution-"+crypto.randomUUID(),candidateGenomeId:candidate.genome.id,dreamRunId:dream.run.id,capabilityId:candidate.genome.capabilityId,state:"AWAITING_SIMULATION",promotionAuthorized:false};
  this.audit?.append?.({type:"evolution.begin",evaluationId:evaluation.id,genomeId:evaluation.candidateGenomeId,dreamRunId:evaluation.dreamRunId});
  return {state:"SUCCESS",evaluation,candidate:candidate.genome,dream:dream.run};
 }
 conclude({evaluation,result,actor=null}={}){
  if(!evaluation?.candidateGenomeId||!evaluation?.dreamRunId)return {state:"BLOCKED",message:"evaluation required"};
  const finished=this.dreams.finish(evaluation.dreamRunId,result||{});if(finished.state!=="SUCCESS")return finished;
  const verified=finished.run.state==="SUCCESS"&&finished.run.verifiedResult?.verified===true;
  const proof=this.proofs.create({intent:"Evaluate capability candidate",actor,capability:evaluation.capabilityId,risk:"high",policyDecision:"ASK",evidence:[{type:"forgedream",runId:finished.run.id,score:finished.run.score}],action:{operation:"capability.genome.promote",resource:evaluation.candidateGenomeId},verification:{state:verified?"SUCCESS":"FAILURE",evidence:[{runId:finished.run.id}]},outcome:verified?"PARTIAL":"BLOCKED"});
  return {state:verified?"PARTIAL":"BLOCKED",evaluation:{...evaluation,state:verified?"VERIFIED_AWAITING_APPROVAL":"REJECTED",promotionAuthorized:false},dream:finished.run,decisionProof:proof.proof};
 }
 promote({genomeId,approved=false,verificationState="UNKNOWN"}={}){return this.genomes.promote(genomeId,{approved,testState:verificationState});}
}
