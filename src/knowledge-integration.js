export class KnowledgeIntegration {
  constructor({ autonomy = null, training = null, promotion = null, metrics = null } = {}) {
    this.autonomy = autonomy;
    this.training = training;
    this.promotion = promotion;
    this.metrics = metrics;
  }

  async endToEndHarvest(limit = 100) {
    if (!this.autonomy || !this.training || !this.promotion) {
      return { state: "FAILURE", message: "Integration components not configured" };
    }

    const harvestResult = { state: "SUCCESS", harvested: 0, facts: [] };
    const ingestResult = this.autonomy.filterEligible(harvestResult.facts || []);
    const batchResult = this.training.buildBatch(limit);

    const evaluation = this.promotion.evaluateBatch(batchResult, {
      score: ingestResult.length > 0 ? 0.85 : 0.0,
    });

    let promotion = null;
    if (evaluation.eligible_for_training) {
      promotion = this.promotion.promoteToTraining(batchResult.id, evaluation);
      if (this.metrics) {
        this.metrics.record({
          harvested: harvestResult.harvested,
          verified: ingestResult.length,
          training_eligible: batchResult.count,
        });
      }
    } else {
      promotion = this.promotion.rejectBatch(batchResult.id);
    }

    return {
      state: "SUCCESS",
      harvest: harvestResult,
      ingest: ingestResult,
      batch: batchResult,
      evaluation,
      promotion,
    };
  }

  status() {
    return {
      state: "SUCCESS",
      configured: Boolean(this.autonomy && this.training && this.promotion),
      components: {
        autonomy: Boolean(this.autonomy),
        training: Boolean(this.training),
        promotion: Boolean(this.promotion),
        metrics: Boolean(this.metrics),
      },
    };
  }
}

export default KnowledgeIntegration;