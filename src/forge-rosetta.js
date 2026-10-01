import crypto from "node:crypto";
import {PlatformStateStore} from "./platform-state-store.js";

const UCL=new Set(["DISCOVER","READ","SEARCH","CREATE","TRANSFORM","MOVE","COMMUNICATE","SCHEDULE","EXECUTE","OBSERVE","VERIFY","ROLLBACK"]);
const infer=method=>({GET:"READ",HEAD:"OBSERVE",POST:"CREATE",PUT:"TRANSFORM",PATCH:"TRANSFORM",DELETE:"EXECUTE"}[String(method||"").toUpperCase()]||"EXECUTE");

export class ForgeRosetta{
  constructor({stateRoot,audit=null}={}){this.db=new PlatformStateStore(stateRoot);this.audit=audit;}
  register({provider,operation="",method="",path="",canonicalOperation=null,inputSchema={},outputSchema={},permissions=[],verification=[]}={}){
    const p=String(provider||"").trim();if(!p)return {state:"BLOCKED",message:"provider is required."};
    const canonical=String(canonicalOperation||infer(method)).toUpperCase();if(!UCL.has(canonical))return {state:"BLOCKED",message:"Unsupported UCL operation."};
    const mapping={id:"rosetta-"+crypto.randomUUID(),schema:"uai.forgerosetta.v1",provider:p,operation:String(operation||""),method:String(method||"").toUpperCase(),path:String(path||""),canonicalOperation:canonical,inputSchema:inputSchema&&typeof inputSchema==="object"?inputSchema:{},outputSchema:outputSchema&&typeof outputSchema==="object"?outputSchema:{},permissions:Array.isArray(permissions)?permissions:[],verification:Array.isArray(verification)?verification:[],status:"CANDIDATE",mappingVerified:false,authorityGranted:false,executable:false,createdAt:new Date().toISOString()};
    const out=this.db.create("forge-rosetta-mapping",mapping);this.audit?.append?.({type:"forgerosetta.mapping.created",mappingId:mapping.id,provider:p,canonical});return out.state==="SUCCESS"?{state:"SUCCESS",mapping}:out;
  }
  verify(id,{schemaPassed=false,authMapped=false,permissionsMapped=false,verificationMapped=false}={}){
    const found=this.db.get("forge-rosetta-mapping",id);if(found.state!=="SUCCESS")return {state:"UNAVAILABLE",message:"Rosetta mapping not found."};
    const checks={schemaPassed:Boolean(schemaPassed),authMapped:Boolean(authMapped),permissionsMapped:Boolean(permissionsMapped),verificationMapped:Boolean(verificationMapped)},ok=Object.values(checks).every(Boolean);
    const mapping={...found.record,checks,status:ok?"VERIFIED_MAPPING":"CANDIDATE",mappingVerified:ok,authorityGranted:false,executable:false,verifiedAt:ok?new Date().toISOString():null};
    const out=this.db.cas("forge-rosetta-mapping",id,found.version,mapping,{type:"verify-mapping",checks});this.audit?.append?.({type:"forgerosetta.mapping.verified",mappingId:id,verified:ok});return out.state==="SUCCESS"?{state:ok?"SUCCESS":"PARTIAL",mapping}:out;
  }
  translate(id,payload={}){
    const found=this.db.get("forge-rosetta-mapping",id);if(found.state!=="SUCCESS")return {state:"UNAVAILABLE",message:"Rosetta mapping not found."};
    const m=found.record;return {state:m.mappingVerified?"SUCCESS":"PARTIAL",proposal:{uclOperation:m.canonicalOperation,provider:m.provider,target:{operation:m.operation,method:m.method,path:m.path},payload,authorityGranted:false,execution:"PROPOSAL_ONLY"},message:m.mappingVerified?"Verified semantic mapping produced; execution authority is still separate.":"Candidate semantic mapping produced; verify it before relying on the translation."};
  }
  list(limit=100){return this.db.list("forge-rosetta-mapping",limit).records||[];}
  operations(){return [...UCL];}
  status(){const mappings=this.list(10000);return {state:"SUCCESS",operations:this.operations(),mappings:mappings.length,verifiedMappings:mappings.filter(x=>x.mappingVerified).length,executionAuthority:"SEPARATE"};}
}
