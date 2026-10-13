import { appendFileSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export class PersistentAuditStore {
  #path;

  constructor(path = process.env.STAARWAARDD_AUDIT_PATH || resolve('data/guardian-audit.jsonl')) {
    this.#path = resolve(path);
  }

  get path() { return this.#path; }

  load() {
    try {
      const text = readFileSync(this.#path, 'utf8');
      return text.split('\n').filter(Boolean).map((line, index) => {
        try { return JSON.parse(line); }
        catch { throw new Error(`Invalid audit record at line ${index + 1}`); }
      });
    } catch (error) {
      if (error.code === 'ENOENT') return [];
      throw error;
    }
  }

  append(entry) {
    mkdirSync(dirname(this.#path), { recursive: true });
    appendFileSync(this.#path, `${JSON.stringify(entry)}\n`, { encoding: 'utf8', mode: 0o600 });
  }
}
