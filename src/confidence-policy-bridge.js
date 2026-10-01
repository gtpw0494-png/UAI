export function confidencePolicyInput(envelope){
  if(!envelope)return Object.freeze({decisionHint:"ASK",reason:"missing-confidence-envelope",authorityGranted:false});
  let decisionHint="BLOCK_CANDIDATE",reason="insufficient-confidence";
  if(envelope.level==="VERIFIED"){decisionHint="ALLOW_CANDIDATE";reason="independently-verified";}
  else if(envelope.level==="HIGH"){decisionHint="VERIFY";reason="high-confidence-unverified";}
  else if(envelope.level==="MEDIUM"){decisionHint="ASK";reason="additional-evidence-required";}
  return Object.freeze({decisionHint,reason,authorityGranted:false,requiresPolicyDecision:true,requiresCapabilityFirewall:true});
}
