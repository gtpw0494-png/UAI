import assert from "node:assert/strict";
import {MultiRoleCollaboration} from "../src/collaboration/multi-role.js";

const records=[];
const c=new MultiRoleCollaboration({chronicle:{record:x=>{records.push(x);return {state:"SUCCESS"};}}});
assert.equal(c.status().executionAuthority,"NONE");
for(const id of ["coder","programmer","software-engineer","debugger","test-engineer","devops-engineer","database-engineer","ui-ux-engineer","ml-engineer","performance-engineer"]) assert.ok(c.status().roles.some(r=>r.id===id),`missing specialist ${id}`);
const ok=c.deliberate({topic:"continue UAI build",chatId:"test",contributions:[
 {role:"architect",message:"Keep the build additive."},
 {role:"builder",message:"Implement the next bounded module."},
 {role:"ci",message:"Tests pass for this proposal."}
]});
assert.equal(ok.state,"SUCCESS");
assert.equal(ok.decision.approvalAuthority,"NONE");
const handoff=c.handoff(ok.decision,{target:"self-development",requestedAction:"STAGE"});
assert.equal(handoff.state,"WAITING_APPROVAL");
assert.equal(handoff.handoff.authorized,false);
assert.equal(handoff.handoff.executionAuthority,"NONE");
assert.equal(records[0].trainingEligible,false);
const blocked=c.deliberate({topic:"unsafe mutation",contributions:[{role:"security",message:"Block: not authorized."}]});
assert.equal(blocked.state,"BLOCKED");
const partial=c.deliberate({topic:"claim review",contributions:[{role:"test-engineer",message:"Failed regression: missing evidence."}]});
assert.equal(partial.state,"PARTIAL");
assert.equal(c.deliberate({topic:"x",contributions:[{role:"invented",message:"hi"}]}).state,"BLOCKED");
console.log("Multi-role collaboration tests passed");
