import {validateSchema} from "../schema-validator.js";

const object={type:"object"};
const schemas=new Map([
  ["POST /api/auth/enroll",{type:"object",required:["email","password"],properties:{email:{type:"string",minLength:3,maxLength:320},password:{type:"string",minLength:12,maxLength:1024}},additionalProperties:false}],
  ["POST /api/auth/login",{type:"object",required:["email","password"],properties:{email:{type:"string",minLength:3,maxLength:320},password:{type:"string",minLength:1,maxLength:1024}},additionalProperties:false}],
  ["POST /api/onechat",{type:"object",required:["message"],properties:{message:{type:"string",minLength:1,maxLength:200000},chatId:{type:"string",maxLength:256}},additionalProperties:true}],
  ["POST /api/chat",{type:"object",required:["message"],properties:{message:{type:"string",minLength:1,maxLength:200000},chatId:{type:"string",maxLength:256}},additionalProperties:true}],
  ["POST /api/research/web",{type:"object",required:["query"],properties:{query:{type:"string",minLength:1,maxLength:20000},depth:{enum:["standard","deep"]},maxSources:{type:"integer",minimum:1,maximum:12},store:{type:"boolean"}},additionalProperties:false}],
  ["POST /api/documents/ingest",{type:"object",required:["source_id","text"],properties:{source_id:{type:"string",minLength:1,maxLength:512},text:{type:"string",minLength:1,maxLength:4000000},canonical_uri:{type:["string","null"],maxLength:4096},original_uri:{type:["string","null"],maxLength:4096},title:{type:["string","null"],maxLength:1024},training_approved:{type:"boolean"},retrieval_eligible:{type:"boolean"}},additionalProperties:true}],
  ["POST /api/documents/delete",{type:"object",required:["id"],properties:{id:{type:"string",pattern:"^doc-[A-Za-z0-9-]+$"},reason:{type:"string",maxLength:1000}},additionalProperties:true}],
  ["POST /api/documents/purge",{type:"object",required:["id"],properties:{id:{type:"string",pattern:"^doc-[A-Za-z0-9-]+$"},reason:{type:"string",maxLength:1000},approvalId:{type:"string",maxLength:256}},additionalProperties:true}],
  ["POST /api/plugins-v1/execute",{type:"object",required:["pluginId"],properties:{pluginId:{type:"string",minLength:1,maxLength:128},operation:{type:"string",maxLength:128},input:{type:"object"},approvalId:{type:["string","null"],maxLength:256},autonomyLeaseId:{type:["string","null"],maxLength:256},idempotencyKey:{type:["string","null"],maxLength:512}},additionalProperties:true}],
  ["POST /api/plugins-v1/register",{type:"object"}],
  ["POST /api/approvals/decide",{type:"object",required:["decision"],properties:{id:{type:"string",maxLength:256},approvalId:{type:"string",maxLength:256},decision:{enum:["APPROVE","DENY","approve","deny"]}},additionalProperties:true}],
  ["POST /api/approvals/request",{type:"object",required:["operation","capability"],properties:{operation:{type:"string",minLength:1,maxLength:512},capability:{type:"string",minLength:1,maxLength:512},arguments:{type:"object"},actor:{type:"string",maxLength:256},risk:{enum:["low","medium","high","critical"]}},additionalProperties:true}],
  ["POST /api/autonomy/grant",{type:"object",properties:{subject:{type:"string",maxLength:256},agent:{type:"string",maxLength:256},scope:{type:"array","items":{"type":"string"},"maxItems":100},riskCeiling:{enum:["low","medium","high","critical"]},maxActions:{type:"integer",minimum:1,maximum:10000},durationMs:{type:"integer",minimum:60000,maximum:604800000},approvalId:{type:"string",maxLength:256}},additionalProperties:true}],
  ["POST /api/autonomy/revoke",{type:"object",properties:{id:{type:"string",maxLength:256},leaseId:{type:"string",maxLength:256}},additionalProperties:true}],
  ["POST /api/model/train",{type:"object",properties:{steps:{type:"integer",minimum:1,maximum:1000000},preset:{type:"string",maxLength:128},gradAccum:{type:"integer",minimum:1,maximum:100000},approvalId:{type:"string",maxLength:256}},additionalProperties:true}],
  ["POST /api/model/tokenizer/train",{type:"object",properties:{vocabSize:{type:"integer",minimum:280,maximum:32000},approvalId:{type:"string",maxLength:256}},additionalProperties:true}],
  ["POST /api/develop/apply",{type:"object",required:["proposalId","approvalId"],properties:{proposalId:{type:"string",maxLength:256},approvalId:{type:"string",maxLength:256}},additionalProperties:true}],
  ["POST /api/selfdev/promote",{type:"object",required:["stageId","approvalId"],properties:{stageId:{type:"string",maxLength:256},approvalId:{type:"string",maxLength:256}},additionalProperties:true}],
  ["POST /api/web/ingest",{type:"object",required:["url"],properties:{url:{type:"string",minLength:8,maxLength:4096},license:{type:"string",maxLength:128},licenseSource:{type:"string",maxLength:128},respectRobots:{type:"boolean"},maxBytes:{type:"integer",minimum:1024,maximum:10000000},promoteTraining:{type:"boolean"}},additionalProperties:true}],
  ["POST /api/fabrication/job",{type:"object",required:["command"],properties:{command:{type:"string",minLength:1,maxLength:10000},approval:{type:"boolean"},approvalId:{type:"string",maxLength:256}},additionalProperties:true}]
]);

export function validateRequestBody(method,path,body){
  const schema=schemas.get(String(method).toUpperCase()+" "+String(path))||object;
  return validateSchema(schema,body??{});
}
export function governedRequestSchemas(){return [...schemas.keys()].sort();}
