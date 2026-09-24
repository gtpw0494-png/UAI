import {buildSourceResearchCapabilities} from "./source-capabilities.js";
export function buildCapabilityRegistry(providerHub,extras={}){
  const model=extras.model||{},deps=extras.deps?.dependencies||{},langgraph=extras.langgraph||{},runtime=extras.runtimeServices||{};
  const modelReady=model.state==="SUCCESS"&&model.checkpointExists===true;
  const service=(name,fallback)=>runtime?.[name]||fallback;
  const billing=service("billing",{availability:"UNAVAILABLE",executable:false,reason:"Live billing adapter has not been probed."});
  const oxford=service("oxford",{availability:"UNAVAILABLE",executable:false,reason:"Oxford API adapter has not been configured."});
  const fabrication=service("fabrication",{availability:"UNAVAILABLE",executable:false,reason:"No verified physical fabrication controller is connected."});
  const base=[
    {id:"local.onechat",availability:"CONNECTED",executable:true},
    {id:"local.release.integrity",availability:"CONNECTED",executable:true,reason:"Shipped source/support files are bound to a SHA-256 release manifest."},
    {id:"local.hardware.profile",availability:"CONNECTED",executable:true,reason:"Reports local CPU/RAM/Torch/CUDA facts and conservative preset candidates."},
    {id:"local.agent.collaboration",availability:"CONNECTED",executable:true},
    {id:"local.knowledge.read",availability:"CONNECTED",executable:true},
    {id:"local.knowledge.write",availability:"CONNECTED",executable:true},
    {id:"local.knowledge.binary.export",availability:"CONNECTED",executable:true},
    {id:"local.knowledge.binary.import",availability:"CONNECTED",executable:true},
    {id:"local.source.registry",availability:"CONNECTED",executable:true},
    {id:"local.web.registry",availability:"CONNECTED",executable:true,reason:"Governed registry for bulk/open web corpus sources."},
    {id:"local.web.url_ingest",availability:"CONNECTED",executable:true,reason:"Direct public http/https ingestion with robots check, private-network blocking, provenance and license state."},
    {id:"local.web.bulk_import",availability:"CONNECTED",executable:true,reason:"Streaming importers for Common Crawl WET, Wikimedia XML, Stack Exchange XML and FineWeb-style JSONL; Parquet requires optional pyarrow."},
    {id:"local.learning.verified_export",availability:"CONNECTED",executable:true},
    {id:"local.forgelm.architecture",availability:"CONNECTED",executable:true,reason:"Original local ForgeLM source is present."},
    {id:"local.forgelm.dataset.v2",availability:"CONNECTED",executable:true,reason:"Verified-trace + license-gated web dataset builder with provenance, deduplication, deterministic splits and hashes."},
    {id:"local.web.training_bridge",availability:"CONNECTED",executable:true,reason:"Only web records explicitly marked trainingEligible=true enter ForgeLM dataset construction."},
    {id:"local.forgelm.trainer.v2",availability:model.state==="SUCCESS"?"CONNECTED":"UNAVAILABLE",executable:model.state==="SUCCESS",reason:model.state==="SUCCESS"?"ForgeLM trainer is backed by the detected PyTorch runtime.":"Install the official Termux python-torch package or another compatible PyTorch runtime."},
    {id:"local.source.snapshot",availability:"CONNECTED",executable:true,reason:"Records locally fetched reference repo commits and license-file hashes."},
    {id:"local.forgelm.infer",availability:modelReady?"CONNECTED":"UNAVAILABLE",executable:modelReady,reason:modelReady?"Local checkpoint and neural runtime verified by ForgeLM status.":(model.message||"ForgeLM checkpoint/runtime unavailable.")},
    {id:"local.forgelm.train",availability:model.state==="SUCCESS"?"CONNECTED":"UNAVAILABLE",executable:model.state==="SUCCESS",reason:model.state==="SUCCESS"?"Local neural training runtime verified.":"Training requires a working PyTorch runtime; Termux provides python-torch."},
    {id:"local.langgraph.orchestration",availability:langgraph.availability||"UNAVAILABLE",executable:langgraph.availability==="CONNECTED",reason:langgraph.reason||"Install @langchain/langgraph and @langchain/core; built-in OneChat orchestration remains available without it."},
    {id:"local.ui.serve",availability:"CONNECTED",executable:true},
    {id:"local.dev.propose",availability:"CONNECTED",executable:true},
    {id:"local.selfdev.sandbox",availability:"CONNECTED",executable:true,constraints:["isolated candidate workspace","syntax checks","repository tests","approval before promotion"]},
    {id:"local.code.inspect",availability:"CONNECTED",executable:true},
    {id:"local.code.snapshot",availability:"CONNECTED",executable:true},
    {id:"local.code.mutate",availability:"CONNECTED",executable:true,constraints:["explicit proposal approval","workspace-bound paths","snapshot before write","hash conflict check"]},
    {id:"local.code.rollback",availability:"CONNECTED",executable:true,constraints:["explicit approval"]},
    {id:"local.agent.spawn",availability:"CONNECTED",executable:true,constraints:["child capabilities cannot exceed parent capabilities"]},
    {id:"local.task.orchestrate",availability:"CONNECTED",executable:true},
    {id:"local.accounts.metadata",availability:"CONNECTED",executable:true,reason:"Non-secret local account metadata only."},
    {id:"local.subscriptions.metadata",availability:"CONNECTED",executable:true,reason:"User-recorded subscription metadata; independent of live billing."},
    {id:"local.plugins.registry",availability:"CONNECTED",executable:true},
    {id:"billing.live.read",availability:billing.availability||"UNAVAILABLE",executable:billing.availability==="CONNECTED",reason:billing.reason},
    {id:"reference.oxford.compare",availability:oxford.availability||"UNAVAILABLE",executable:oxford.availability==="CONNECTED",reason:oxford.reason},
    {id:"physical.matter.fabricate",availability:fabrication.availability||"UNAVAILABLE",executable:fabrication.availability==="CONNECTED",reason:fabrication.reason,constraints:["real connected printer/controller","explicit FABRICATION_ENABLE=1","approval before physical job command"]}
  ];
  const research=buildSourceResearchCapabilities(extras.sourceRegistry||[]);
  return [...base,...research];
}
