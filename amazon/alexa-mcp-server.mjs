import http from "node:http";

const PORT = Number(process.env.ALEXA_MCP_PORT || 3333);
const PROTOCOL_VERSION = "2025-11-25";

const portalKeywords = {
  Creativity: ["create", "creative", "design", "write", "idea", "content"],
  Work: ["work", "meeting", "deadline", "project", "client", "task"],
  Home: ["home", "house", "lights", "door", "security", "routine"],
  Wellbeing: ["wellbeing", "stress", "sleep", "rest", "health", "energy"],
  Relationships: ["relationship", "partner", "friend", "family", "message"],
  Community: ["community", "event", "local", "neighbourhood", "volunteer"],
  Style: ["style", "outfit", "wardrobe", "clothes", "fashion"]
};

function detectPortals(input) {
  const text = String(input || "").toLowerCase();
  const hits = Object.entries(portalKeywords)
    .filter(([, words]) => words.some((word) => text.includes(word)))
    .map(([portal]) => portal);
  return hits.length ? hits : ["Work", "Home", "Wellbeing"];
}

function buildPlan(input) {
  const portals = detectPortals(input);
  return {
    guardian: "STAARWAARDD",
    request: input,
    portals,
    now: [
      `Identify the immediate objective across ${portals.join(", ")}.`,
      "Flag any step that would message, buy, book, publish, register, delete, or change an external account for human approval."
    ],
    today: [
      "Sequence non-sensitive preparation steps.",
      "Surface conflicts across active portals before execution."
    ],
    thisWeek: [
      "Review outcomes and update the Life Map.",
      "Keep external actions approval-gated."
    ],
    approvalRequired: true,
    note: "Alexa+ hackathon simulation. No external action is executed by this MCP server."
  };
}

function json(res, status, body) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  res.end(JSON.stringify(body));
}

function rpcResult(id, result) {
  return { jsonrpc: "2.0", id, result };
}

function rpcError(id, code, message) {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message } };
}

const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    return json(res, 200, { ok: true, service: "staarwaardd-alexa-mcp", protocolVersion: PROTOCOL_VERSION });
  }

  if (req.url !== "/mcp") {
    return json(res, 404, { error: "Not found" });
  }

  if (req.method !== "POST") {
    res.writeHead(405, { allow: "POST" });
    return res.end();
  }

  let raw = "";
  for await (const chunk of req) raw += chunk;
  let message;
  try {
    message = JSON.parse(raw || "{}");
  } catch {
    return json(res, 400, rpcError(null, -32700, "Parse error"));
  }

  const { id, method, params } = message;

  if (method === "initialize") {
    return json(res, 200, rpcResult(id, {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: { tools: {} },
      serverInfo: { name: "staarwaardd-guardian", version: "0.1.0" }
    }));
  }

  if (method === "notifications/initialized") {
    res.writeHead(204);
    return res.end();
  }

  if (method === "tools/list") {
    return json(res, 200, rpcResult(id, {
      tools: [{
        name: "staarwardd_plan",
        title: "STAARWAARDD Guardian Plan",
        description: "Coordinate one request across STAARWAARDD life portals while preserving explicit human approval for sensitive external actions.",
        inputSchema: {
          type: "object",
          properties: {
            request: { type: "string", minLength: 1 }
          },
          required: ["request"],
          additionalProperties: false
        }
      }]
    }));
  }

  if (method === "tools/call") {
    if (params?.name !== "staarwardd_plan") {
      return json(res, 200, rpcError(id, -32602, "Unknown tool"));
    }
    const request = params?.arguments?.request;
    if (!request || typeof request !== "string") {
      return json(res, 200, rpcError(id, -32602, "request must be a non-empty string"));
    }
    const plan = buildPlan(request);
    return json(res, 200, rpcResult(id, {
      content: [{ type: "text", text: JSON.stringify(plan, null, 2) }],
      structuredContent: plan,
      isError: false
    }));
  }

  return json(res, 200, rpcError(id, -32601, "Method not found"));
});

server.listen(PORT, () => {
  console.log(`STAARWAARDD Alexa+ MCP simulation listening on http://localhost:${PORT}/mcp`);
});
