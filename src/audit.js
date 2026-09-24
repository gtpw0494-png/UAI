import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export class AuditLog {
  constructor(root) {
    fs.mkdirSync(root, { recursive: true });
    this.file = path.join(root, "audit.jsonl");
  }
  append(event) {
    const record = { id: crypto.randomUUID(), at: new Date().toISOString(), ...event };
    fs.appendFileSync(this.file, JSON.stringify(record) + "\n");
    return record;
  }
  list(limit = 100) {
    if (!fs.existsSync(this.file)) return [];
    return fs.readFileSync(this.file, "utf8").trim().split("\n").filter(Boolean).slice(-limit).map(line => JSON.parse(line));
  }
}
