export class KnowledgeScheduler {
  constructor({ intervalMs = 60000, runner = null } = {}) {
    this.intervalMs = intervalMs;
    this.runner = runner;
    this.timer = null;
    this.started = false;
  }

  async runOnce() {
    if (!this.runner || typeof this.runner !== "function") {
      return { state: "SUCCESS", scheduled: false, message: "No runner configured" };
    }
    return this.runner();
  }

  start() {
    if (this.started) return { state: "SUCCESS", started: true };
    this.started = true;
    this.timer = setInterval(() => {
      this.runOnce().catch(() => {});
    }, this.intervalMs);
    return { state: "SUCCESS", started: true, intervalMs: this.intervalMs };
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.started = false;
    return { state: "SUCCESS", stopped: true };
  }

  status() {
    return {
      state: "SUCCESS",
      started: this.started,
      intervalMs: this.intervalMs,
    };
  }
}

export default KnowledgeScheduler;