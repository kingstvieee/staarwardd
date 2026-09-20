import assert from "node:assert/strict";
import { spawn } from "node:child_process";

const child = spawn(process.execPath, ["amazon/alexa-mcp-server.mjs"], {
  env: { ...process.env, ALEXA_MCP_PORT: "3344" },
  stdio: ["ignore", "pipe", "pipe"]
});

async function post(body) {
  const response = await fetch("http://127.0.0.1:3344/mcp", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  assert.equal(response.status, 200);
  return response.json();
}

async function waitForHealth() {
  for (let i = 0; i < 30; i += 1) {
    try {
      const response = await fetch("http://127.0.0.1:3344/health");
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Alexa+ MCP server did not become ready");
}

try {
  await waitForHealth();

  const init = await post({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2025-11-25",
      capabilities: {},
      clientInfo: { name: "self-test", version: "1.0.0" }
    }
  });
  assert.equal(init.result.protocolVersion, "2025-11-25");
  assert.equal(init.result.serverInfo.name, "staarwaardd-guardian");

  const listed = await post({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });
  assert.equal(listed.result.tools[0].name, "staarwardd_plan");

  const called = await post({
    jsonrpc: "2.0",
    id: 3,
    method: "tools/call",
    params: {
      name: "staarwardd_plan",
      arguments: {
        request: "I have a client deadline and need an outfit ready tomorrow."
      }
    }
  });
  assert.equal(called.result.isError, false);
  assert.ok(called.result.structuredContent.portals.includes("Work"));
  assert.ok(called.result.structuredContent.portals.includes("Style"));
  assert.equal(called.result.structuredContent.approvalRequired, true);

  console.log("Amazon Alexa+ MCP self-test passed.");
} finally {
  child.kill("SIGTERM");
}
