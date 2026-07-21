# StaarWardd

StaarWardd is a working whole-life AI prototype that turns one natural-language request into a coordinated plan across seven life portals: Creativity, Work, Home, Wellbeing, Relationships, Community, and Style.

The experience begins with a Toronto cinematic awakening, then becomes a practical assistant with voice input, spoken replies, cross-domain activation, structured Now / Today / This Week results, human approval for sensitive actions, clickable live sources, and a transparent action log.

## Quick start on Windows

Requirements: Windows 10 or 11 and Node.js 20 LTS or newer.

1. Extract the ZIP.
2. Open the extracted staarwardd-prototype folder.
3. Double-click START_WINDOWS.bat.
4. Open http://localhost:3000 if the browser does not open automatically.

PowerShell alternative:

~~~powershell
cd "C:\path\to\staarwardd-prototype"
npm install
npm test
npm run check
npm run dev
~~~

Keep that PowerShell window open. Press Ctrl+C to stop the app.

No API key is required. Deterministic demo mode is complete, repeatable, and judge-testable offline.

## Optional GPT-5.6 Responses API

Copy .env.example to .env, add your project key, and restart the server:

~~~text
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-5.6
PORT=3000
~~~

The key stays server-side and .env is ignored by Git. StaarWardd uses the Responses API, a strict JSON schema, and the built-in web search tool when a request depends on current facts. Source links from live searches are displayed under the plan. If the API is unavailable, rate-limited, or out of quota, the server safely returns deterministic demo output.

API billing is separate from Codex credits. A valid key with no API quota will produce HTTP 429 and trigger the safe fallback; see TROUBLESHOOTING.md.

## Voice

After the cinematic reveal, press Talk. In Microsoft Edge or Chrome:

- Browser speech recognition transcribes the request into the command box.
- The form submits automatically after the final transcript.
- StaarWardd reads a concise version of the answer aloud using browser speech synthesis.
- Live factual answers show clickable sources when GPT-5.6 web search is available.

Microphone permission is controlled by the browser. Typing remains fully functional if speech recognition is unavailable.

## What genuinely works

- Full-screen Toronto and CN Tower cinematic opening with a clean identity-consistent guardian in a forward-flight composition, seven sword-cast magic-bubble portal summons, unique procedural audio signatures, a visible StaarWardd title, and an original maple-energy finale.
- Seven visible, keyboard-accessible portals.
- All seven portals are fully interactive and produce distinct specialist plans.
- Relationships includes a connection compass, boundary rehearsal, and approval-aware message studio.
- Community includes a local impact map, energy budget, and outreach planner.
- Style includes an outfit studio, wardrobe edit, and event-ready planner.
- One natural-language request activates multiple relevant portals.
- Deterministic and GPT-5.6 planning both return Now, Today, and This Week.
- Sensitive intent is marked and paused for explicit human approval.
- Approval remains a simulation: no email, purchase, deletion, booking, payment, publish, or share is performed.
- Persistent action log in browser local storage.
- Voice input and spoken output in supported browsers.
- Optional GPT-5.6 Responses API with strict structured output, current-information web search, and clickable citations.
- Automatic demo fallback when the API is missing or unavailable.
- Responsive desktop/mobile layout, semantic landmarks, skip link, keyboard controls, visible focus, live regions, reduced-motion mode, and on-screen FX/Sound controls.
- Automated deterministic planner, safety, static/media serving, and HTTP API tests.

## Architecture

StaarWardd deliberately has zero production npm dependencies:

- server.mjs - Node HTTP server, .env loader, deterministic planner, secure GPT-5.6 adapter, structured output schema, web search, and source extraction.
- public/index.html - accessible application structure.
- public/styles.css - responsive cinematic and workspace design.
- public/app.js - reveal choreography, theatrical Web Audio score, seven specialist portals, voice, results, approval, and action log.
- test/server.test.mjs - deterministic and HTTP integration tests.

The automated tests force STAARWARDD_DEMO_ONLY=1, preventing accidental API-credit usage.

## From prototype to a real consumer app

The judged build stays intentionally self-contained and safe. After Build Week, the production version should keep one OpenAI Agents SDK orchestrator rather than splitting StaarWardd into seven disconnected assistants. That orchestrator will route requests to narrowly scoped portal tools while preserving the same approval boundary.

The production build is designed to add:

- OpenAI Realtime voice for low-latency, interruptible conversation.
- Secure accounts and encrypted, user-controlled memory.
- Permission-scoped calendar, task, messaging, and home connectors.
- Server-enforced approval policies, audit logs, evaluations, and observability.
- An installable PWA first, followed by native mobile packaging after the interaction and privacy model are proven.

External actions will remain opt-in and reversible wherever possible. No connector will inherit broader authority merely because a portal was activated.

## How Codex and GPT-5.6 were used

Codex with GPT-5.6 was the primary implementation environment for the repository. It was used to:

- Translate the product vision into a working architecture.
- Iterate on cinematic motion, audio choreography, responsiveness, and accessibility.
- Implement deterministic and live-AI planning paths.
- Add human-approval and transparent-log safety boundaries.
- Write and run syntax checks and automated tests.
- Inspect screenshots, diagnose Windows setup issues, and package the final deliverables.
- Verify Build Week rules and submission requirements through the Devpost Hackathons plugin.
- Create purpose-built guardian, Toronto skyline, portal, summoning-bubble, sword, and maple-medallion assets through OpenAI Image Generation inside Codex, then integrate them into a lightweight, watermark-free cinematic sequence.

At runtime, optional gpt-5.6 calls use the OpenAI Responses API. GPT-5.6 selects relevant life domains, returns schema-constrained plans, decides when current facts require web search, and supplies source URLs. It never executes external actions.

## OpenAI Build Week fit

Recommended category: **Apps for Your Life**.

StaarWardd directly covers everyday productivity, creativity, home, relationships, wellbeing, community, and personal style. Its judging story maps to the official criteria:

1. Technological Implementation - working server, deterministic fallback, GPT-5.6 structured output, web search citations, voice, safety controls, testing, and cinematic state orchestration.
2. Design - one coherent product experience from memorable reveal to practical results.
3. Potential Impact - reduces the coordination burden created by fragmented single-domain apps.
4. Quality of Idea - one whole-life command surface with visible human agency.

The companion output/pdf/STAARWARDD_BUILD_WEEK_COMPETITION_GUIDE.pdf contains the full official checklist, compliance audit, two-day submission sequence, and demo shot list.

The editable judge presentation is included at outputs/STAARWARDD_FIRST_PLACE_PITCH_DECK.pptx.

The earlier narrated video in `outputs/` predates the final v9 clean cinematic rebuild and should not be uploaded. Record the current app at `http://localhost:3000`, keep the final edit under three minutes, include audible Codex and GPT-5.6 disclosure, upload it to YouTube, verify the public or unlisted link in a private browser window, and paste that URL into Devpost.

## Commands

| Command | Purpose |
|---|---|
| npm install | Install/verify package metadata |
| npm test | Run automated tests without API usage |
| npm run check | Syntax-check server and browser code |
| npm run dev | Run at http://localhost:3000 |

## Privacy and safety

- API keys never enter browser code.
- The local action log remains in the browser.
- No analytics, accounts, databases, or external action provider are connected.
- Voice recognition may use the browser vendor's speech service; the UI says when it is listening.
- Current-information search runs only in optional OpenAI mode.
- Sensitive actions always require approval and remain simulations in this prototype.

## Media licensing

The StaarWardd visuals are project-specific assets. The submitted runtime soundtrack, impacts, portal earcons, finale, and ambient release are synthesized in the browser from original Web Audio code; no third-party song or downloaded sound-effect track is included. The source-code license does not relicense project media. See LICENSE.md and THIRD_PARTY_NOTICES.md.

StaarWardd does not ship franchise logos, characters, dialogue, or franchise music.

## Known limitations

- Optional OpenAI mode requires a valid API key with available quota. When it is unavailable, StaarWardd safely falls back to deterministic demo mode.
- Voice recognition support varies. Edge or Chrome on Windows is recommended.
- The guardian opening uses a high-resolution original hero composition with lightweight browser choreography rather than a live real-time 3D rig. This keeps the judged experience consistent and avoids video stutter; it is cinematic motion design, not independently rigged limbs or a generative character video.
- Approvals and task actions are intentionally simulated; no external connector is authorized.
- Calendar, messaging, shopping, booking, and community-provider connections remain approval-gated simulations until production credentials and privacy controls exist.

See CODEX_START_HERE.md, TROUBLESHOOTING.md, and DEMO_SCENARIOS.md.


## Working-name clearance

The exact spelling StaarWardd produced no meaningful exact-match results in preliminary open-web, handle, AI-app, or public trademark-index searches performed on July 19, 2026. That is useful evidence of distinctiveness, not a guarantee of worldwide availability or legal ownership. Before commercial launch, run formal Canadian and international trademark clearance, secure the domain and key social handles, and file in the relevant software and AI service classes.
