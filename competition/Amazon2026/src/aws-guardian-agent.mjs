import { Agent, BedrockModel, tool } from '@strands-agents/sdk'
import { z } from 'zod'
import { buildGuardianPlan } from './guardian-core.mjs'

const guardianPlanTool = tool({
  name: 'guardian_plan',
  description: 'Build a permission-aware STAARWAARDD cross-portal orchestration plan.',
  inputSchema: z.object({
    request: z.string(),
  }),
  callback: ({ request }) => JSON.stringify(buildGuardianPlan(request), null, 2),
})

export function createAwsGuardianAgent() {
  const model = new BedrockModel({
    region: process.env.AWS_REGION || 'us-east-1',
    modelId: process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-5-sonnet-20240620-v1:0',
    maxTokens: 1400,
    temperature: 0.2,
  })

  return new Agent({
    id: 'staarwardd-guardian',
    model,
    tools: [guardianPlanTool],
    systemPrompt: [
      'You are Guardian, the orchestration intelligence inside STAARWAARDD.',
      'Coordinate Work, Creativity, Home, Wellbeing, Relationships, Community, and Style as one life system.',
      'Never invent completion of an external action.',
      'Messages, publishing, purchases, bookings, account changes, security changes, and device changes require explicit approval.',
      'Wellbeing may coordinate routines and user-stated context but must not diagnose.',
      'Use guardian_plan before giving the final coordinated response.',
    ].join(' '),
  })
}

export async function invokeAwsGuardian(request) {
  const agent = createAwsGuardianAgent()
  const result = await agent.invoke(request)
  return result
}
