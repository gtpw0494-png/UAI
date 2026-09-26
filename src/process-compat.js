import path from "node:path";

export function termuxSafeEnv(extra={}){
  const env={...process.env,...extra};
  const preload=String(env.LD_PRELOAD||"");
  if(process.platform==="android"||env.TERMUX_VERSION||preload.includes("libtermux-exec")){
    delete env.LD_PRELOAD;
  }
  return env;
}

export function absoluteNodeScript(root,script){
  return path.resolve(root,script);
}
