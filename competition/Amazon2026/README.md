# STAARWAARDD Guardian — Amazon Developer Hackathon 2026

This directory contains the isolated Amazon 2026 competition layer. It is developed on the `amazon-2026` branch so the existing `main` prototype remains unchanged.

## Competition target

- Primary track: Alexa+
- Mini challenge: AWS Builder
- Product: STAARWAARDD Guardian
- Goal: turn Guardian into a whole-life orchestration layer that can coordinate the seven established portals: Creativity, Work, Home, Wellbeing, Relationships, Community, and Style.

## Architecture target

Alexa+ / simulated Alexa+ experience
→ self-hosted MCP layer (spec 2025-11-25+ / Streamable HTTP)
→ Guardian orchestrator
→ portal capability router
→ approval policy
→ safe tool execution / result reporting

## Protection rule

Do not merge competition changes into `main` until they are independently reviewed and verified. Existing cinematic, Guardian, portal visuals, portal behavior, and production work remain the baseline.

## Judging targets

1. Tech Implementation: required Alexa+/MCP technology visibly runs in code; AWS integration is documented and real.
2. Design: cinematic opening transitions into a coherent Guardian-led task flow.
3. Potential Impact: demonstrate measurable reduction in fragmented multi-app coordination.
4. Quality of Idea: Guardian is positioned as a whole-life orchestration layer, not a generic chatbot.
5. Bonus: maintain a friction log with reproducible issues, workarounds, and actionable product feedback.
