export function calculateObservedGain({before,after,evidenceHash,independentlyVerified=false}={}){
  if(!Number.isFinite(before)||!Number.isFinite(after))throw new Error("numeric uncertainty values required");
  if(!evidenceHash)throw new Error("evidenceHash required");
  const reduction=Math.max(0,before-after),observedGain=before>0?Math.max(0,Math.min(1,reduction/before)):0;
  return Object.freeze({uncertaintyBefore:before,uncertaintyAfter:after,observedGain,evidenceHash,independentlyVerified:independentlyVerified===true,eligibleForTraining:independentlyVerified===true,authorityGranted:false});
}
