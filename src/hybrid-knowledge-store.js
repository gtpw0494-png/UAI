export class HybridKnowledgeStore {
  constructor({local,cloud=null,audit=null}={}){this.local=local;this.cloud=cloud;this.audit=audit}
  filterTrainingEligible(limit=100){return this.local.filterTrainingEligible(limit)}
  snapshot(){return{state:"SUCCESS",local:this.local.snapshot(),cloud:this.cloud?.status?.()||{state:"UNAVAILABLE",configured:false}}}
  async upsertMany(facts=[]){
    const local=this.local.upsertMany(facts);
    const accepted=this.local.filterTrainingEligible(Math.max(1000,facts.length*2));
    const cloud=this.cloud?await this.cloud.putMany(accepted):{state:"UNAVAILABLE",written:0};
    this.audit?.append?.({type:"knowledge.persist",local_written:local.written,cloud_state:cloud.state,cloud_written:cloud.written||0});
    return{state:local.state,local,cloud,durability:cloud.state==="SUCCESS"?"LOCAL_AND_CLOUD":"LOCAL_ONLY"};
  }
}
export default HybridKnowledgeStore;
