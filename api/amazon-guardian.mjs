import { guardianPlan, judgeScenario } from '../competition/Amazon2026/src/guardian-core.mjs';

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  if (request.method === 'GET') {
    return response.status(200).json({
      ok: true,
      product: 'STAARWAARDD Guardian',
      track: 'Alexa+',
      miniChallenge: 'AWS Builder',
      mode: 'competition-judge-api',
      portals: ['Creativity','Work','Home','Wellbeing','Relationships','Community','Style']
    });
  }
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const body = request.body || {};
  const mode = body.mode === 'judge' ? 'judge' : 'plan';
  const result = mode === 'judge'
    ? judgeScenario()
    : guardianPlan(String(body.input || '').slice(0, 2000), { source: 'Alexa+ simulated experience' });

  return response.status(200).json({
    ok: true,
    mode,
    architecture: {
      interface: 'Alexa+',
      protocol: 'MCP Streamable HTTP',
      orchestrator: 'Guardian',
      aws: 'Strands + Amazon Bedrock'
    },
    ...result
  });
}
