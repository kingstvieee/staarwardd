# Codex: start here

This is an implemented, tested prototype.

## Verify

~~~powershell
npm install
npm test
npm run check
npm run dev
~~~

Open http://localhost:3000.

Expected checks:

- 5 tests pass, 0 fail.
- /api/status reports openai when .env has a key, otherwise demo.
- API failures return demo-fallback instead of breaking the interface.
- The clean Toronto forward-flight sequence plays, the sword casts seven magic-bubble portals, and the StaarWardd title stays visible.
- Talk works in Edge/Chrome after microphone permission.
- Sensitive tasks open the approval dialog.
- Every portal/action appears in the action log.

## Core files

- server.mjs: deterministic planner plus optional GPT-5.6 Responses API, web search, and citations.
- public/index.html: accessible application structure.
- public/styles.css: responsive cinematic design and portal workspace.
- public/app.js: reveal, sound, particles, portal logic, voice, plans, approval, and local log.
- test/server.test.mjs: deterministic safety and HTTP integration tests.
- .env.example: optional AI configuration.
- output/pdf/STAARWARDD_BUILD_WEEK_COMPETITION_GUIDE.pdf: verified competition checklist and submission sequence.
- outputs/STAARWARDD_FIRST_PLACE_PITCH_DECK.pptx: editable 10-slide judge narrative and production-app handoff.
- outputs/STAARWARDD_DEVPOST_DEMO_1080P.mp4: obsolete pre-v9 recording; do not upload. Record the current localhost build after visual QA.

## Product contract

- Preserve deterministic no-key behavior.
- Never expose .env or an API key to the browser, repository, ZIP, screenshots, logs, or PDF.
- Never claim an external action occurred.
- Require explicit approval before every sensitive simulation.
- Keep all seven portal names stable.
- Keep live sources visible and clickable.
- Run npm run check and npm test after code changes.
- Keep the demo video under 3 minutes and explain Codex plus GPT-5.6 in the voiceover.


