# STAARWAARDD Expanded Implementation M3 — Guardian Runtime + Mission Mode

## Purpose

M3 folds the competitive JARVIS review into the existing STAARWAARDD implementation without changing the core product thesis. The target is not a desktop-only assistant. STAARWAARDD Guardian is person-centric, device-adaptive, evidence-driven, and whole-life across the canonical seven portals: Creativity, Work, Home, Well-being, Relationships, Events, and Style.

## Product differentiation

The competitor pattern worth borrowing is the visible HUD, voice-first control, screen/device context, local memory option, action history, model-provider flexibility, diagnostics, and remote presence. STAARWAARDD must go further by making the primary object a **Mission** rather than a chat session.

A Mission owns an outcome from request to verified completion:

PLANNED -> IN_PROGRESS -> IMPLEMENTED_UNVERIFIED -> VERIFIED -> USER_ACCEPTED

BLOCKED and CANCELLED are explicit terminal/intermediate states. Guardian must never label a Mission complete because work was merely generated, attempted, submitted, or partially executed.

## New runtime modules implemented in this branch

### `guardian-mission-engine.mjs`

Adds an evidence-backed Mission contract with:

- explicit objective and portal scope
- required completion criteria
- artifact/evidence hashes
- per-criterion evidence links
- blocker reporting with severity, permission need, and suggested next action
- independent verification result
- explicit owner acceptance gate
- Milo Episode Completion Pilot factory

### `guardian-presence-contract.mjs`

Adds the first device-adaptive Guardian presence contract with:

- phone, desktop, browser, home-display, and assistive surfaces
- Guardian-visible HUD/workspace modes rather than chat-log-first UI
- input preferences including voice, touch, keyboard, switch control, and eye-control compatibility
- accessibility adaptation for screen readers, reduced motion, high contrast, and larger interaction targets
- microphone, camera, screen, and location defaulting to ASK
- no ambient surveillance
- authenticated-session and approval requirements for consequential actions

### `test/guardian-mission-engine.test.mjs`

Adds deterministic tests for:

- refusal to accept unverified work
- evidence-backed verification
- blocker enforcement
- Milo pilot completeness criteria
- adaptive presence defaults
- accessibility-first presence behavior

## Required integration into the existing application

The new core modules are intentionally provider-neutral and do not directly execute external actions. The next implementation pass must wire them into the existing server and UI while keeping the Safety Controller and Trust Kernel authoritative.

### API work

Add Mission endpoints under `/api/guardian/missions` for create, list, get, start, evidence, criterion update, blocker report/resolve, verify, accept, and cancel. Owner acceptance must require authenticated owner context. Mission verification must not bypass the existing policy boundary.

Add presence endpoints under `/api/guardian/presence` for explicit device enrollment, active-surface state, capability negotiation, sensor grants, and revocation. No camera, microphone, screen, or location access may be inferred from presence alone.

### HUD / visual Guardian work

Add a Guardian Mission surface to the current cinematic Hub. It must show:

- visible Guardian state
- Mission title and objective
- current status
- requirement count and pass/fail state
- active blockers
- tools/adapters currently involved
- permission requests
- evidence artifacts
- Guardian recommendation / next executable action
- action timeline
- explicit VERIFY and OWNER ACCEPT controls where appropriate

The Guardian stays visually present while the workspace changes around it. Do not replace the approved cinematic Guardian, portal composition, Toronto identity, routes, assets, or startup sequence.

### Device-adaptive presentation

- phone: compact Guardian presence, mission progress, voice/touch-first interaction
- desktop/browser: HUD workspace, action timeline, evidence panel, mission lanes
- home display: glanceable status and voice-first controls
- assistive surface: accessibility-first navigation with explicit sensor permissions

## Milo as first Mission acceptance pilot

Milo must be represented as a Mission, not a loose creative task. The initial required criteria are:

1. coherent story from opening through problem, cause/effect, solution, and resolution
2. character design and wardrobe continuity
3. required character dialogue and lip sync
4. natural action/environment sound design
5. approved opening theme and closing credits format
6. approved runtime
7. full visual review for missing, duplicated, frozen, or inconsistent shots
8. full audio review for dialogue, mix, silence gaps, and clipping
9. successful final export and beginning-to-end playback
10. explicit owner acceptance after verification

Each required criterion needs linked evidence. A Mission with a missing criterion, failed criterion, unresolved blocker, or absent evidence must not become VERIFIED.

## Safety and authority

The existing architecture remains authoritative:

Owner authority > independent Safety Controller / Trust Kernel > Guardian Mission/Presence runtime > model router > provider adapters.

Mission Mode does not grant execution rights. Presence does not grant sensor rights. Model output does not grant approval. External actions remain behind the isolated action gateway and scoped owner consent.

## Tool and provider roadmap

The runtime should remain provider-neutral. Candidate adapters include OpenAI, Gemini, Anthropic, Groq, OpenRouter, Ollama, LM Studio, Tavily, DuckDuckGo/web research, calendar, communications, creative production providers, and device/OS accessibility APIs. Add one provider at a time behind the same capability contract with dry-run mode, scopes, budgets, timeouts, receipts, and explicit integration status.

## Acceptance criteria for M3 integration

M3 is not complete until:

- Mission API is wired and tested
- Mission HUD is visible in the current Hub
- presence registry is wired without ambient surveillance
- owner acceptance requires authenticated owner context
- current seven portal routes and cinematic assets remain intact
- existing safety tests continue to pass
- new Mission/presence tests pass
- Milo can be created as a Mission and cannot reach USER_ACCEPTED without all required evidence and owner approval
- implementation report identifies IMPLEMENTED, PARTIAL, BLOCKED, and FUTURE items truthfully

## Non-negotiable product principle

A desktop assistant operates a computer. STAARWAARDD Guardian coordinates the user's world. The system must increase capability while preserving user authority, accessibility, privacy, and evidence-based completion.
