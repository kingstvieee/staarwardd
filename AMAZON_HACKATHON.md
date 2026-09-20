# Amazon Developer Hackathon — Alexa+ Track

This branch contains the Amazon-specific adaptation of STAARWAARDD for the **Alexa+** primary track.

## What was added during the hackathon window

- A self-hosted Model Context Protocol endpoint at `/mcp`.
- MCP protocol version `2025-11-25`.
- Streamable HTTP-style JSON-RPC over HTTP POST.
- A `staarwardd_plan` tool that accepts one natural-language request and coordinates it across STAARWAARDD portals.
- Human-approval boundaries remain explicit. The MCP demo does not message, buy, book, publish, register, delete, or modify external accounts.

## Run

```bash
npm install
npm run check
npm run amazon:alexa
```

The MCP endpoint is then available at:

```text
http://localhost:3333/mcp
```

Health check:

```text
http://localhost:3333/health
```

## Initialize

```bash
curl -s http://localhost:3333/mcp \
  -H "content-type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"judge-demo","version":"1.0"}}}'
```

## List tools

```bash
curl -s http://localhost:3333/mcp \
  -H "content-type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'
```

## Call STAARWAARDD Guardian

```bash
curl -s http://localhost:3333/mcp \
  -H "content-type: application/json" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"staarwardd_plan","arguments":{"request":"I have a client deadline tomorrow, I need an outfit ready, and I want time to decompress tonight."}}}'
```

## Submission positioning

Primary track: **Alexa+**

Project status: existing before August 31, 2026; significantly updated during the hackathon with an Amazon-specific Alexa+/MCP integration.

AWS Builder mini challenge is **not claimed by this branch yet**. It should only be selected after a working AWS service integration is added and demonstrated.

## Demo requirement still outstanding

The Devpost submission requires a public English YouTube or Vimeo demo under three minutes. The final video should visibly show:

1. STAARWAARDD opening.
2. The Alexa+ MCP endpoint initializing.
3. `tools/list` exposing `staarwardd_plan`.
4. A tool call coordinating multiple portals.
5. The approval boundary for sensitive external actions.
