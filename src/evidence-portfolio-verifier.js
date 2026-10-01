export function verifyPortfolioOutcome({portfolio,observations=[]}={}){
  if(!portfolio)throw new Error("portfolio required");
  const verified=observations.filter(x=>x.authorized===true&&x.verified===true&&typeof x.evidenceHash==="string");
  const resolved=new Set(verified.flatMap(x=>x.resolvedTargets||[]));
  const expected=new Set((portfolio.selected||[]).flatMap(x=>x.resolvedTargets||[]));
  const covered=[...expected].filter(x=>resolved.has(x)).length;
  const verifiedCoverage=expected.size?covered/expected.size:0;
  return Object.freeze({portfolioDigest:portfolio.digest,verifiedObservations:verified.length,verifiedCoverage,complete:expected.size>0&&verifiedCoverage===1,authorityGranted:false});
}
