const $ = (s) => document.querySelector(s);

async function run(mode) {
  const status = $('#status');
  const result = $('#result');
  status.textContent = 'Guardian is coordinating across the relevant portals…';
  result.hidden = true;
  try {
    const response = await fetch('/api/amazon-guardian', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({mode, input: $('#request').value})
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Judge scenario failed');
    render(data);
    status.textContent = 'Guardian coordination complete. Sensitive actions remain approval-gated.';
  } catch (error) {
    status.textContent = error.message;
  }
}

function render(data) {
  const plan = data.plan || data;
  const coordination = plan.coordination || {};
  const domains = plan.domains || [];
  $('#summary').textContent = plan.summary || 'Guardian coordinated the request.';
  $('#decision').textContent = coordination.decision || 'Prepared actions only; approval required for external changes.';

  $('#techProof').textContent = `${data.architecture?.interface || 'Alexa+'} → ${data.architecture?.protocol || 'MCP'} → Guardian → ${data.architecture?.aws || 'AWS'}`;
  $('#designProof').textContent = 'One request produces a coherent briefing, portal trace, approval state, and completed outcome.';
  $('#impactProof').textContent = 'Cross-portal work is reduced from multiple app handoffs to one Guardian coordination flow.';
  $('#ideaProof').textContent = 'Guardian acts as a whole-life orchestration layer rather than a single-purpose chatbot.';

  $('#portals').innerHTML = domains.map((domain, index) => `
    <article class="portal-card">
      <span>${String(index + 1).padStart(2,'0')}</span>
      <b>${esc(domain)}</b>
      <small>ACTIVE AGENT</small>
    </article>`).join('');

  $('#exchanges').innerHTML = (coordination.exchanges || []).map((x) => `
    <li><b>${esc(x.from)}</b><span>${esc(x.signal)}</span><b>${esc(x.to)}</b></li>`).join('') || '<li>No unnecessary cross-portal exchange was required.</li>';

  const actions = [...(plan.now || []), ...(plan.today || []), ...(plan.week || [])];
  $('#actionsList').innerHTML = actions.map((item) => `
    <article class="action-card ${item.sensitive ? 'approval' : ''}">
      <div><span>${esc(item.domain)}</span>${item.sensitive ? '<em>APPROVAL REQUIRED</em>' : '<em>SAFE TO PREPARE</em>'}</div>
      <h3>${esc(item.title)}</h3>
      <p>${esc(item.detail)}</p>
      <small>${esc(item.time || '')}</small>
    </article>`).join('');

  const metrics = data.metrics || {
    portalsActivated: domains.length,
    externalActionsExecuted: 0,
    approvalsRequired: actions.filter(a => a.sensitive).length,
    userRequests: 1
  };
  $('#metrics').innerHTML = [
    ['User requests', metrics.userRequests ?? 1],
    ['Relevant portals', metrics.portalsActivated ?? domains.length],
    ['Cross-portal exchanges', metrics.crossPortalExchanges ?? (coordination.exchanges || []).length],
    ['External actions without approval', metrics.externalActionsExecuted ?? 0]
  ].map(([label, value]) => `<div><b>${esc(String(value))}</b><span>${esc(label)}</span></div>`).join('');

  $('#result').hidden = false;
  $('#result').scrollIntoView({behavior:'smooth', block:'start'});
}

function esc(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}

$('#runJudge').addEventListener('click', () => run('judge'));
$('#runCustom').addEventListener('click', () => run('plan'));
