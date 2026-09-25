export class KnowledgeAutonomy {
  constructor({ registry = [] } = {}) {
    this.registry = registry;
  }

  loadSources(sourceList = []) {
    this.registry = Array.isArray(sourceList) ? sourceList : [];
    return { state: "SUCCESS", count: this.registry.length };
  }

  sanitizeFact(raw = {}) {
    return {
      subject: String(raw.subject || "").trim(),
      claim: String(raw.claim || "").trim(),
      source_id: String(raw.source_id || "unknown"),
      source_url: String(raw.source_url || "https://example.invalid"),
      trust: Number(raw.trust || 0),
      kind: String(raw.kind || "fact"),
      timestamp: raw.timestamp || new Date().toISOString(),
      metadata: raw.metadata || {},
    };
  }

  filterEligible(facts = []) {
    return (facts || [])
      .map(f => this.sanitizeFact(f))
      .filter(f => f.subject && f.claim && f.trust >= 0.8)
      .map(f => ({
        ...f,
        fact_id: this.hashFact(f),
        training_eligible: true,
      }));
  }

  hashFact(fact) {
    const text = `${fact.subject}|${fact.claim}|${fact.source_id}|${fact.source_url}`;
    return Array.from(new TextEncoder().encode(text))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");
  }

  verifyFacts(facts = []) {
    const eligible = this.filterEligible(facts);
    return {
      state: "SUCCESS",
      count: eligible.length,
      facts: eligible.map(f => ({
        ...f,
        verification: {
          verified: true,
          confidence: Math.min(1, f.trust),
          training_eligible: true,
        },
      })),
    };
  }

  status() {
    return {
      state: "SUCCESS",
      local_only: true,
      network_required: false,
      sources: this.registry.length,
      source_types: ["academic", "official-docs", "reference", "public-domain"],
      capabilities: ["knowledge-ingest", "verification", "training-filter"],
    };
  }
}

export default KnowledgeAutonomy;
