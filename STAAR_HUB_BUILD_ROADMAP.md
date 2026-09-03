# STAAR Hub — Real Product Build Roadmap

This roadmap separates the competition prototype from the real STAAR Hub product.

## Product North Star

STAAR Hub is the central experience inside STAARWAARDD. The Guardian coordinates seven stable life portals:

1. Creativity
2. Work
3. Home
4. Wellbeing
5. Relationships
6. Community
7. Style

STAAR Access is a component within the Hub, not the Hub itself.

The intended opening remains cinematic: Toronto and the CN Tower, the Guardian arriving through a shield-like entrance with lightning, the Guardian at the centre, then seven portals opening around him.

## Phase 1 — Stabilize the existing Hub

Goal: turn the current tested prototype into a dependable foundation rather than rebuilding from zero.

- Preserve all seven portal names.
- Preserve the existing deterministic fallback and approval safeguards.
- Audit the cinematic opening against the intended Guardian/Toronto/shield/portal sequence.
- Audit mobile layout, sound, voice, portal navigation, and replay.
- Separate judge/demo shortcuts from normal product entry.
- Create a persistent product roadmap and issue list.

Exit condition: the Hub opens reliably on phone and desktop and every portal can be entered without a contest walkthrough.

## Phase 2 — First physical-space pilot: Home NFC

Goal: prove that a physical place can become an entrance into STAAR Hub.

The current app already accepts a portal query parameter. The first NFC tag should store a public Hub URL using this pattern:

`https://YOUR-LIVE-HUB-URL/?autoplay=1&portal=Home&entry=nfc&zone=home-pilot-01`

When tapped with a compatible phone, the tag opens STAAR Hub, starts the awakening, and opens Home after the portals are ready. The `entry` and `zone` parameters are reserved for later analytics/context handling.

### First tag placement

Use one inexpensive rewritable NFC tag inside the home. Do not automate locks, purchases, appliances, or other sensitive actions in this first pilot.

Suggested first action: tap the tag, enter Home, then ask the Guardian for a home reset, room plan, groceries/dinner sequence, or another Home task.

### NFC hardware

Buy rewritable NFC Forum-compatible tags such as NTAG213, NTAG215, or NTAG216. One tag is enough for the pilot; a small multipack is practical for later portal zones.

### Programming the tag

1. Publish or otherwise expose the Hub at a stable HTTPS URL.
2. Install an NFC tag-writing app on the phone.
3. Create a URL/URI record using the Home pilot URL above.
4. Hold the phone to the tag until the write succeeds.
5. Test the tag before permanently mounting it.
6. Keep the tag rewritable during development.

## Phase 3 — Guardian context layer

Goal: make the Guardian coordinate across portals instead of behaving like seven isolated assistants.

- Create a user context/profile layer.
- Create cross-portal events and conflicts.
- Add permissioned memory controls.
- Add a Guardian briefing surface: what changed, what conflicts, what needs attention.
- Keep sensitive external actions behind explicit approval.

Exit condition: one request can correctly involve multiple portals and explain why.

## Phase 4 — Real integrations

Goal: replace simulations selectively with permissioned connections.

Potential integrations are added one at a time and only after the core Hub is stable. Calendar, messages, commerce, smart-home/NFC, travel, and other connectors must expose what data they read and what actions they can take.

## Phase 5 — Kaia and Atlas companion layer

Kaia and Atlas remain distinct existing companion concepts. They should use the same STAAR Hub context/permission system rather than becoming disconnected apps.

Future hardware concepts, including watch projection, private voice phrase, travel awareness, backup communication, translation, and personality, come after the software context layer is dependable.

## Phase 6 — Partnership-ready pilot

Do not pitch the Hub as only an idea. Prepare evidence:

- Stable live Hub.
- Cinematic Guardian entrance and seven portals.
- One real NFC Home interaction.
- One cross-life Guardian scenario.
- Short architecture diagram.
- Privacy/approval model.
- 2–3 minute product demonstration.
- Specific non-equity pilot ask before considering any ownership change.

The first partnership objective is technical/product acceleration while preserving STAARWAARDD's creative direction and ownership unless Steven explicitly chooses otherwise.
