# Amazon 2026 Friction Log

Use this file during the hackathon. Each entry should be reproducible and include the task, expected result, actual result, severity, workaround, and an actionable product suggestion.

## Entry 001 — MCP protocol version compatibility

- Task: expose Guardian through a self-hosted MCP endpoint compatible with Amazon's Alexa+ requirement.
- Steps: reviewed current MCP TypeScript SDK protocol-version guidance; selected the v2 `createMcpHandler` HTTP entry that also supports 2025-era stateless traffic.
- Expected: one implementation path that satisfies current MCP while remaining compatible with the hackathon's stated 2025-11-25+ requirement.
- Actual: the SDK distinguishes 2025-era and 2026-era protocol behavior, so version compatibility must be explicit in the server architecture.
- Severity: Medium.
- Workaround: use the current v2 handler with legacy/stateless compatibility rather than maintaining two independent servers.
- Suggestion: hackathon documentation should include one canonical sample showing a 2026 SDK server configured to accept 2025-11-25+ Alexa+ traffic.

## Entry 002 — Existing prototype isolation

- Task: significantly update an existing project without destabilizing the working prototype.
- Steps: created the `amazon-2026` branch and placed competition-specific source under `competition/Amazon2026/`.
- Expected: preserve the production prototype while creating a clean judging delta.
- Actual: branch isolation works and also gives judges a clear change boundary.
- Severity: Low.
- Workaround: none needed.
- Suggestion: Devpost could encourage a dedicated competition branch for existing projects because it makes judging of significant updates easier.

## Template for new entries

- Task:
- Steps:
- Expected:
- Actual:
- Severity: Critical / High / Medium / Low
- Workaround:
- Suggestion:
