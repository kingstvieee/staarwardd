import http from 'node:http'
import { createMcpHandler, McpServer } from '@modelcontextprotocol/server'
import { toNodeHandler } from '@modelcontextprotocol/node'
import { z } from 'zod'
import { buildGuardianPlan, judgeScenario, PORTALS } from './guardian-core.mjs'

const handler = createMcpHandler(() => {
  const server = new McpServer(
    { name: 'staarwardd-guardian', version: '0.1.0' },
    { capabilities: { tools: {} } },
  )

  server.registerTool(
    'guardian_orchestrate',
    {
      description: 'Coordinate one user request across the relevant STAARWAARDD life portals while preserving approval boundaries.',
      inputSchema: z.object({
        request: z.string().min(1),
        context: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
      }),
    },
    async ({ request, context = {} }) => ({
      content: [{ type: 'text', text: JSON.stringify(buildGuardianPlan(request, context), null, 2) }],
      structuredContent: buildGuardianPlan(request, context),
    }),
  )

  server.registerTool(
    'guardian_judge_scenario',
    {
      description: 'Run the official Amazon hackathon judge scenario across Guardian and the seven established portals.',
      inputSchema: z.object({}),
    },
    async () => ({
      content: [{ type: 'text', text: JSON.stringify(judgeScenario(), null, 2) }],
      structuredContent: judgeScenario(),
    }),
  )

  server.registerTool(
    'guardian_capabilities',
    {
      description: 'List the seven STAARWAARDD portal capability domains available to Guardian.',
      inputSchema: z.object({}),
    },
    async () => ({
      content: [{ type: 'text', text: PORTALS.join(', ') }],
      structuredContent: { portals: PORTALS },
    }),
  )

  return server
})

const nodeHandler = toNodeHandler(handler)
const port = Number(process.env.GUARDIAN_MCP_PORT || 3100)

const server = http.createServer(async (req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ ok: true, service: 'staarwardd-guardian-mcp', protocol: 'MCP Streamable HTTP' }))
    return
  }

  if (req.url?.startsWith('/mcp')) {
    await nodeHandler(req, res)
    return
  }

  res.writeHead(404, { 'content-type': 'application/json' })
  res.end(JSON.stringify({ error: 'Not found' }))
})

server.listen(port, () => {
  console.log(`STAARWAARDD Guardian MCP listening on http://localhost:${port}/mcp`)
})
