const API = '/api/guardian';

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key.startsWith('aria-')) node.setAttribute(key, value);
    else node[key] = value;
  }
  for (const child of Array.isArray(children) ? children : [children]) {
    if (child) node.append(child);
  }
  return node;
}

function statusTone(status) {
  if (status === 'USER_ACCEPTED') return 'accepted';
  if (status === 'VERIFIED') return 'verified';
  if (status === 'BLOCKED') return 'blocked';
  if (status === 'IMPLEMENTED_UNVERIFIED') return 'unverified';
  return 'active';
}

function detectSurface() {
  const coarse = matchMedia('(pointer: coarse)').matches;
  if (window.innerWidth <= 760 || coarse) return 'phone';
  return 'browser';
}

async function request(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}

class GuardianRuntimeHUD {
  constructor() {
    this.open = false;
    this.state = { missions: [], activeSurfaces: [] };
    this.surface = detectSurface();
    this.root = null;
    this.panel = null;
  }

  mount() {
    if (document.getElementById('guardianRuntimeHud')) return;
    const controls = document.querySelector('.experience-controls');
    const trigger = el('button', {
      id: 'guardianMissionToggle',
      type: 'button',
      class: 'guardian-mission-toggle',
      'aria-expanded': 'false',
      text: 'Mission'
    });
    trigger.append(el('b', { text: '●' }));
    if (controls) controls.append(trigger);

    this.root = el('section', {
      id: 'guardianRuntimeHud',
      class: 'guardian-runtime-hud',
      'aria-hidden': 'true',
      'aria-label': 'Guardian Mission interface'
    });

    this.panel = el('div', { class: 'guardian-runtime-panel' });
    this.root.append(this.panel);
    document.body.append(this.root);

    trigger.addEventListener('click', () => this.toggle(trigger));
    this.render();
    this.refresh();
    this.timer = setInterval(() => this.refresh({ silent: true }), 15000);
  }

  toggle(trigger) {
    this.open = !this.open;
    this.root.classList.toggle('open', this.open);
    this.root.setAttribute('aria-hidden', String(!this.open));
    trigger.setAttribute('aria-expanded', String(this.open));
    if (this.open) this.refresh();
  }

  async refresh({ silent = false } = {}) {
    try {
      const data = await request(`${API}/runtime`);
      this.state = data;
      this.render();
    } catch (error) {
      if (!silent) this.showMessage(error.message, 'error');
    }
  }

  async ensureMilo() {
    try {
      await request(`${API}/missions/milo-pilot`, { method: 'POST', body: '{}' });
      await this.refresh();
      this.showMessage('Milo Mission loaded. Guardian will not call it done without evidence and acceptance.', 'ok');
    } catch (error) {
      this.showMessage(error.message, 'error');
    }
  }

  async missionAction(operation, missionId) {
    try {
      await request(`${API}/missions`, {
        method: 'POST',
        body: JSON.stringify({ operation, missionId })
      });
      await this.refresh();
    } catch (error) {
      this.showMessage(error.message, 'error');
    }
  }

  showMessage(message, kind = 'ok') {
    let node = this.root.querySelector('.guardian-runtime-message');
    if (!node) {
      node = el('div', { class: 'guardian-runtime-message', 'aria-live': 'polite' });
      this.panel.prepend(node);
    }
    node.className = `guardian-runtime-message ${kind}`;
    node.textContent = message;
    setTimeout(() => { if (node) node.textContent = ''; }, 5000);
  }

  renderMission(mission) {
    const card = el('article', { class: `guardian-mission-card ${statusTone(mission.status)}` });
    const head = el('header');
    head.append(el('div', {}, [
      el('p', { text: 'MISSION' }),
      el('h3', { text: mission.title })
    ]));
    head.append(el('span', { class: 'guardian-status-pill', text: mission.status.replaceAll('_', ' ') }));
    card.append(head);

    const progress = mission.progress || { passed: 0, required: 0 };
    const pct = progress.required ? Math.round((progress.passed / progress.required) * 100) : 0;
    const meter = el('div', { class: 'guardian-mission-progress', 'aria-label': `${pct}% criteria verified` });
    const bar = el('i');
    bar.style.width = `${pct}%`;
    meter.append(bar);
    card.append(meter);

    card.append(el('div', { class: 'guardian-mission-meta' }, [
      el('span', { text: `${progress.passed}/${progress.required} criteria` }),
      el('span', { text: `${mission.evidence || 0} evidence` }),
      el('span', { text: `${mission.blockers || 0} blockers` })
    ]));

    const actions = el('div', { class: 'guardian-mission-actions' });
    if (mission.status === 'PLANNED') {
      const start = el('button', { type: 'button', text: 'Start mission' });
      start.addEventListener('click', () => this.missionAction('start', mission.id));
      actions.append(start);
    }
    const inspect = el('button', { type: 'button', text: 'Inspect evidence' });
    inspect.addEventListener('click', async () => {
      try {
        const data = await request(`${API}/missions`, {
          method: 'POST',
          body: JSON.stringify({ operation: 'get', missionId: mission.id })
        });
        this.renderMissionDetail(data.mission);
      } catch (error) {
        this.showMessage(error.message, 'error');
      }
    });
    actions.append(inspect);
    card.append(actions);
    return card;
  }

  renderMissionDetail(mission) {
    const existing = this.root.querySelector('.guardian-mission-detail');
    if (existing) existing.remove();
    const detail = el('div', { class: 'guardian-mission-detail' });
    const close = el('button', { class: 'guardian-detail-close', type: 'button', text: '×', 'aria-label': 'Close mission details' });
    close.addEventListener('click', () => detail.remove());
    detail.append(close);
    detail.append(el('p', { text: 'COMPLETION CONTRACT' }));
    detail.append(el('h3', { text: mission.title }));
    detail.append(el('small', { text: mission.objective }));

    const list = el('ol', { class: 'guardian-criteria-list' });
    for (const criterion of mission.criteria || []) {
      const item = el('li', { class: criterion.state.toLowerCase() });
      item.append(el('b', { text: criterion.state === 'PASSED' ? '✓' : criterion.state === 'FAILED' ? '!' : '○' }));
      item.append(el('span', { text: criterion.text }));
      item.append(el('em', { text: `${criterion.evidenceIds.length} evidence` }));
      list.append(item);
    }
    detail.append(list);

    const blockers = (mission.blockers || []).filter((blocker) => !blocker.resolved);
    if (blockers.length) {
      const section = el('div', { class: 'guardian-blockers' });
      section.append(el('p', { text: 'ACTIVE BLOCKERS' }));
      blockers.forEach((blocker) => section.append(el('span', { text: blocker.reason })));
      detail.append(section);
    }
    this.panel.append(detail);
  }

  render() {
    if (!this.panel) return;
    this.panel.innerHTML = '';

    const top = el('header', { class: 'guardian-runtime-header' });
    top.append(el('div', {}, [
      el('p', { text: 'GUARDIAN RUNTIME · M3' }),
      el('h2', { text: 'Mission Control' }),
      el('span', { text: 'Outcome ownership, evidence, verification, acceptance.' })
    ]));
    const pulse = el('div', { class: 'guardian-runtime-core', 'aria-hidden': 'true' });
    pulse.append(el('i'));
    top.append(pulse);
    this.panel.append(top);

    const runtime = el('div', { class: 'guardian-runtime-status' }, [
      el('span', { text: `Surface: ${this.surface}` }),
      el('span', { text: 'Sensors: ASK' }),
      el('span', { text: 'Ambient surveillance: OFF' })
    ]);
    this.panel.append(runtime);

    const missions = this.state.missions || [];
    if (!missions.length) {
      const empty = el('div', { class: 'guardian-runtime-empty' }, [
        el('p', { text: 'No active Mission yet.' }),
        el('span', { text: 'Milo is the first end-to-end completion pilot.' })
      ]);
      const button = el('button', { type: 'button', text: 'Load Milo Mission' });
      button.addEventListener('click', () => this.ensureMilo());
      empty.append(button);
      this.panel.append(empty);
    } else {
      const list = el('div', { class: 'guardian-mission-list' });
      missions.slice().reverse().forEach((mission) => list.append(this.renderMission(mission)));
      this.panel.append(list);
    }

    const footer = el('footer', { class: 'guardian-runtime-footer' }, [
      el('b', { text: 'DONE means verified + owner accepted.' }),
      el('span', { text: 'Guardian may coordinate broadly. Consequential action remains permission-gated.' })
    ]);
    this.panel.append(footer);
  }
}

function boot() {
  const hud = new GuardianRuntimeHUD();
  hud.mount();
  window.STAAR_GUARDIAN_RUNTIME = hud;
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
else boot();
