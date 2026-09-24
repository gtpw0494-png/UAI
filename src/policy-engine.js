const DECISIONS=new Set(['ALLOW','DENY','ASK','ESCALATE','BLOCK']);

export class PolicyEngine{
  evaluate({operation='',risk='low',external=false,physical=false,mutatesSource=false,requiresCredential=false}={}){
    const r=String(risk||'low').toLowerCase();
    let decision='ALLOW',reason='Low-risk local operation is allowed within declared capability scope.';
    if(physical){decision='ASK';reason='Physical-world execution requires explicit human approval and a verified connected adapter.';}
    else if(mutatesSource){decision='ASK';reason='Source mutation requires proposal-bound explicit approval plus snapshot/verification.';}
    else if(r==='critical'){decision='ESCALATE';reason='Critical-risk operation requires stronger human authorization before execution.';}
    else if(r==='high'){decision='ASK';reason='High-risk operation requires explicit approval.';}
    else if(requiresCredential&&external){decision='ASK';reason='Credentialed external action requires explicit authorized scope.';}
    if(!DECISIONS.has(decision))decision='BLOCK';
    return {state:'SUCCESS',decision,reason,operation:String(operation),risk:r};
  }
}
