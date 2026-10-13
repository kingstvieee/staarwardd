function keyFor(name, labels = {}) {
  const suffix = Object.entries(labels).sort(([a],[b]) => a.localeCompare(b)).map(([k,v]) => `${k}=${String(v).slice(0,80)}`).join(',');
  return suffix ? `${name}{${suffix}}` : name;
}

export class GuardianObservability {
  #counters = new Map();
  #histograms = new Map();
  #events = [];
  #maxEvents;

  constructor({ maxEvents = 250 } = {}) { this.#maxEvents = Math.max(20, Math.min(Number(maxEvents) || 250, 2000)); }

  increment(name, labels = {}, amount = 1) {
    const key = keyFor(String(name), labels);
    this.#counters.set(key, (this.#counters.get(key) || 0) + Number(amount || 1));
  }

  observe(name, value, labels = {}) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return;
    const key = keyFor(String(name), labels);
    const item = this.#histograms.get(key) || { count: 0, sum: 0, min: numeric, max: numeric };
    item.count += 1; item.sum += numeric; item.min = Math.min(item.min, numeric); item.max = Math.max(item.max, numeric);
    this.#histograms.set(key, item);
  }

  event(type, fields = {}) {
    const safe = {};
    for (const [key, value] of Object.entries(fields || {})) {
      if (/prompt|content|token|secret|password|authorization|api.?key/i.test(key)) continue;
      if (typeof value === 'string') safe[key] = value.slice(0, 300);
      else if (typeof value === 'number' || typeof value === 'boolean' || value == null) safe[key] = value;
    }
    this.#events.push({ type: String(type).slice(0,120), at: new Date().toISOString(), ...safe });
    if (this.#events.length > this.#maxEvents) this.#events.splice(0, this.#events.length - this.#maxEvents);
  }

  snapshot() {
    return {
      counters: Object.fromEntries(this.#counters),
      histograms: Object.fromEntries([...this.#histograms].map(([key, value]) => [key, { ...value, average: value.count ? value.sum / value.count : 0 }])),
      recentEvents: structuredClone(this.#events)
    };
  }
}
