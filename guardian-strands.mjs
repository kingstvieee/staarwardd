import { Agent } from '@strands-agents/sdk';
import { OpenAIModel } from '@strands-agents/sdk/models/openai';

const PORTALS = ['Creativity','Work','Home','Wellbeing','Relationships','Community','Style'];

const systemPrompt = `You are the STAAR Hub Guardian, the cross-life context intelligence layer for STAARWAARDD.
Your job is not to behave like a generic chatbot. Observe a user's situation across seven portals: ${PORTALS.join(', ')}.
Detect collisions between commitments, deadlines, people, energy, location, preparation, deliveries, and dependencies.
Coordinate safe, reversible work in the background. Surface only decisions that genuinely require the human.
Never claim an external action was completed unless a connected tool actually completed it.
Messages, purchases, payments, cancellations, bookings, publishing, sharing personal information, deletion, or other consequential actions require explicit human approval before execution.
When useful, explain: (1) what changed, (2) what portals are affected, (3) what you can safely coordinate, and (4) the one decision, if any, the human needs to make.
Keep responses concise, calm, proactive, and practical.`;

function makeModel() {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAIModel({
    api: 'chat',
    apiKey: process.env.OPENAI_API_KEY,
    modelId: process.env.OPENAI_MODEL || 'gpt-5.4',
    maxTokens: 1200,
    temperature: 0.2
  });
}

let guardian;
export function getGuardian() {
  if (guardian) return guardian;
  const model = makeModel();
  if (!model) return null;
  guardian = new Agent({ model, systemPrompt });
  return guardian;
}

function resultText(result) {
  const content = result?.message?.content;
  if (Array.isArray(content)) return content.map(part => part?.text || '').join('').trim();
  if (typeof result?.message === 'string') return result.message.trim();
  if (typeof result === 'string') return result.trim();
  return '';
}

export async function guardianCoordinate(input, context = {}) {
  const agent = getGuardian();
  if (!agent) return null;
  const prompt = [
    'Analyze this as one cross-life situation rather than separate requests.',
    `USER REQUEST: ${String(input || '').slice(0,4000)}`,
    `KNOWN CONTEXT: ${JSON.stringify(context).slice(0,6000)}`,
    'Return a short Guardian briefing. Identify affected portals, collisions, safe autonomous coordination, and any approval required.'
  ].join('\n\n');
  const result = await agent.invoke(prompt);
  return {
    mode: 'strands',
    text: resultText(result),
    portals: PORTALS
  };
}
