# Amazon Alexa+ Hackathon Friction Log

## 1. Translating the track requirement into an implementation path

**Task attempted:** Determine the smallest compliant Alexa+ implementation path for an existing application.

**Steps taken:** Reviewed the Alexa+ track requirements, identified MCP as the required integration path, isolated Amazon-specific work on a dedicated branch, and implemented a self-hosted MCP endpoint using protocol version 2025-11-25.

**Expected:** One concise path showing the minimum required architecture, protocol version, transport, and demo expectations.

**Actual:** The information was available, but it was distributed across track text, linked MCP guidance, and general submission requirements.

**Severity:** Important.

**Workaround:** Created an internal Amazon-specific implementation guide in the repository that consolidates the required protocol, endpoint, demo flow, and submission checklist.

**Suggestion:** Provide a one-page Alexa+ hackathon compliance checklist with a minimal working request/response example and a pre-submission validator.

---

## 2. Verifying MCP compliance before submission

**Task attempted:** Verify that the MCP adapter exposes the expected initialization and tool-call flow before preparing the demo.

**Steps taken:** Added a health endpoint, initialization response, `tools/list`, `tools/call`, a deterministic `staarwardd_plan` tool, and an automated Node.js self-test. Added GitHub Actions to run syntax checks, the existing test suite, and the Alexa+ self-test.

**Expected:** A lightweight official validator or conformance command for the hackathon's required MCP profile.

**Actual:** Local verification had to be assembled from the protocol requirements and our own tests.

**Severity:** Important.

**Workaround:** Wrote an explicit self-test that checks protocol version, server identity, tool discovery, cross-portal tool output, and the approval boundary.

**Suggestion:** Ship an official hackathon MCP conformance CLI or hosted checker that participants can run against their endpoint.

---

## 3. Mapping an existing product to the Amazon-specific judging story

**Task attempted:** Separate pre-existing STAARWAARDD functionality from work created during the Amazon hackathon window.

**Steps taken:** Kept the Amazon implementation in an isolated public branch and draft pull request, documented the exact new files and behavior, and created a separate Devpost project for the Amazon entry.

**Expected:** A clear place in the submission flow to compare baseline functionality with hackathon-period additions.

**Actual:** The form asks for a narrative explanation, but does not provide a structured before/after artifact.

**Severity:** Nice-to-have.

**Workaround:** Used a dedicated branch, pull request, and Amazon-specific implementation document as an auditable before/after record.

**Suggestion:** Add optional baseline commit and submission commit fields for existing projects.
