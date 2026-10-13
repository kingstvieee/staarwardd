import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

export class GuardianMissionStore {
  #path;

  constructor({ filePath = process.env.STAARWAARDD_MISSION_STORE || '.guardian/missions.json' } = {}) {
    this.#path = resolve(filePath);
  }

  get path() { return this.#path; }

  async load() {
    try {
      const parsed = JSON.parse(await readFile(this.#path, 'utf8'));
      if (parsed?.version !== 1 || !Array.isArray(parsed?.missions)) throw new Error('Invalid Mission store format');
      return parsed;
    } catch (error) {
      if (error.code === 'ENOENT') return { version: 1, savedAt: null, missions: [] };
      throw error;
    }
  }

  async save(missions) {
    const payload = { version: 1, savedAt: new Date().toISOString(), missions: structuredClone(missions || []) };
    await mkdir(dirname(this.#path), { recursive: true });
    const temp = `${this.#path}.${process.pid}.tmp`;
    await writeFile(temp, JSON.stringify(payload, null, 2), { encoding: 'utf8', mode: 0o600 });
    await rename(temp, this.#path);
    return { saved: payload.missions.length, savedAt: payload.savedAt, path: this.#path };
  }
}
