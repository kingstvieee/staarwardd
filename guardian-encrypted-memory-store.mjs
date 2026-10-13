import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

function deriveKey(secret) {
  if (!secret || String(secret).length < 32) throw new Error('Memory encryption secret must be at least 32 characters');
  return createHash('sha256').update(String(secret)).digest();
}

function encryptJson(key, value) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const plaintext = Buffer.from(JSON.stringify(value));
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return { v: 1, iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: ciphertext.toString('base64') };
}

function decryptJson(key, envelope) {
  if (!envelope || envelope.v !== 1) throw new Error('Unsupported encrypted memory envelope');
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(envelope.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(envelope.tag, 'base64'));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(envelope.data, 'base64')), decipher.final()]);
  return JSON.parse(plaintext.toString('utf8'));
}

export class EncryptedMemoryStore {
  #filePath;
  #key;
  #records = new Map();

  constructor({ filePath = '.guardian/memory.enc.json', secret } = {}) {
    this.#filePath = filePath;
    this.#key = deriveKey(secret);
  }

  async load() {
    try {
      const raw = JSON.parse(await readFile(this.#filePath, 'utf8'));
      const records = decryptJson(this.#key, raw);
      this.#records = new Map(records.map((item) => [item.memoryId, item]));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    return this.list();
  }

  async #persist() {
    await mkdir(dirname(this.#filePath), { recursive: true });
    await writeFile(this.#filePath, JSON.stringify(encryptJson(this.#key, [...this.#records.values()])), { mode: 0o600 });
  }

  async put({ memoryId = `memory-${randomUUID()}`, content, category = 'general', source = 'owner', metadata = {} } = {}) {
    if (!String(content || '').trim()) throw new Error('content is required');
    const now = new Date().toISOString();
    const previous = this.#records.get(memoryId);
    const record = {
      memoryId,
      content: String(content).slice(0, 20000),
      category: String(category).slice(0, 120),
      source: String(source).slice(0, 120),
      metadata: structuredClone(metadata),
      createdAt: previous?.createdAt || now,
      updatedAt: now
    };
    this.#records.set(memoryId, record);
    await this.#persist();
    return structuredClone(record);
  }

  get(memoryId) {
    const value = this.#records.get(String(memoryId));
    return value ? structuredClone(value) : null;
  }

  list() {
    return [...this.#records.values()].map((item) => structuredClone(item));
  }

  async delete(memoryId) {
    const deleted = this.#records.delete(String(memoryId));
    if (deleted) await this.#persist();
    return { deleted };
  }
}
