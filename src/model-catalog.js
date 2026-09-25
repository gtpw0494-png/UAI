// Canonical catalog for model selection. Catalog entries are capabilities and routing metadata;
// they never imply that a model is installed, licensed, reachable, or production-approved.
const entry=(id,provider,kind,capabilities,aliases=[])=>({id,provider,kind,capabilities,aliases,status:"REGISTRY_ONLY"});
export const MODEL_CATALOG=[
 entry("gpt-6","openai","frontier",["chat","code","vision"],["GPT-6"]),entry("astra-gpt-5.3","openai","chat",["chat","code"]),entry("codex-gpt-5-nano","openai","code",["chat","code"]),entry("gpt-5-nano","openai","fallback",["chat","code"],["puter-default"]),entry("gpt-image-2.5-flare","openai","image",["image"]),entry("gpt-image-2.5-sunburst","openai","image",["image"]),
 entry("claude-sonnet-5","anthropic","frontier",["chat","code","vision"]),entry("claude-opus-4.8","anthropic","frontier",["chat","code","vision"]),
 entry("gemini-3.7-flash","gemini","chat",["chat","code","vision"]),entry("gemini-3.1-pro","gemini","frontier",["chat","code","vision"]),entry("gemini-3.1-flash-image","gemini","image",["image","vision"]),entry("gemini-3-pro-image","gemini","image",["image","vision"]),entry("nano-banana","gemini","image",["image","vision"]),
 entry("grok-4.6","xai","frontier",["chat","code","vision"]),entry("grok-4.5","xai","chat",["chat","code"]),entry("grok-imagine-image","xai","image",["image"]),
 entry("command-a-plus","cohere","moe",["chat","code","structured-output"]),entry("command-a","cohere","chat",["chat","code"]),entry("north-mini-code","cohere","code",["code"]),
 entry("schematron-v2-small","inference","specialty",["structured-output","json"]),entry("schematron-v2-turbo","inference","specialty",["structured-output","html"]),entry("ling-3.0-flash-vl","inference","vision",["vision","chat"]),entry("mercury-2.5","inference","diffusion",["chat","image"]),
 entry("minimax-m3","minimax","chat",["chat","code","vision"]),entry("minimax-m2.7","minimax","chat",["chat","code"]),entry("minimax-m2.7-highspeed","minimax","fast",["chat","code"]),
 ...[
  ["llama","huggingface"],["muse","huggingface"],["flux-schnell","huggingface"],["qwen","huggingface"],["mistral","huggingface"],["deepseek-v4.1-flash","deepseek"],["deepseek-r1","deepseek"],["phi","huggingface"],["kimi","custom"],["glm","custom"],["byteplus","custom"],["nous","huggingface"]
 ].map(([id,provider])=>entry(id,provider,"open-ecosystem",["chat","code"]))
];
export function findModels(query=""){const q=String(query).toLowerCase();return MODEL_CATALOG.filter(x=>!q||[x.id,x.provider,...x.aliases].join(" ").toLowerCase().includes(q));}
export function modelCatalogStatus(){return {state:"SUCCESS",models:MODEL_CATALOG.map(x=>({...x,availability:"PROBED_AT_RUNTIME"}))};}
