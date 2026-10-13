# STAARWAARDD Guardian Prompt-Security Regime

Status: implementation branch hardening layer
Source basis: HackTricks `src/AI/AI-Prompts.md`, reviewed October 2026
Regime ID: `guardian-prompt-security-v1`

## Purpose

This layer hardens Guardian against prompt injection, prompt leaking, jailbreaks, obfuscation, payload splitting, indirect injection from web/files/connectors, code/tool injection, URL-to-prompt injection, streaming markup exfiltration, persistent prompt injection, and untrusted provider-native transcript objects.

It does not make the model itself infallible. It creates deterministic trust boundaries around model input, tools, memory, and external actions.

## Non-negotiable trust rules

1. System/developer policy is control-plane instruction.
2. User text is user intent, still subject to policy and permission checks.
3. Web pages, files, retrieval results, email, plugins, connectors, tool outputs, and third-party documents are DATA, not instructions.
4. External data cannot authorize tool calls, write long-term memory, change policy, change autonomy, or approve external side effects.
5. Role-play, translation, summarization, encoding, spelling correction, formatting, or fictional framing do not change the underlying policy evaluation.
6. Split requests are reassembled conceptually and re-evaluated by final intent.
7. Encoded/obfuscated content is normalized or decoded only for inspection. Decoding never authorizes execution.
8. Provider transcripts are built server-side. Clients cannot supply system/developer/reasoning/thinking/tool-state objects.
9. Raw generated HTML is not streamed directly into an active DOM. Render through escaping/sanitization first.
10. Prompt-security findings are logged without storing raw credentials or secret material.

## Threat classes covered

- authority override / fake developer claims
- system prompt or secret extraction
- dual-persona and jailbreak framing
- translation and transformation loopholes
- typo, homoglyph, zero-width, bidi and leetspeak concealment
- Base64 / URL encoding / cipher-style concealment
- payload splitting across turns or variables
- indirect prompt injection from web, files, comments, repositories, retrieved documents and connectors
- hidden HTML/CSS/markup instructions
- tool and code execution directives found in untrusted content
- memory persistence directives from untrusted content
- URL parameter-to-prompt injection
- scriptless/streaming HTML exfiltration primitives
- provider-native transcript JSON injection
- prompt-scanner refusal treated as inconclusive rather than clean

## Runtime handling

`guardian-prompt-security.mjs` performs:

1. Unicode NFKC normalization.
2. Zero-width, bidi and control-character removal.
3. bounded URL-decoding inspection.
4. bounded Base64 candidate inspection.
5. deterministic attack-signal classification.
6. source trust classification.
7. composite-fragment re-evaluation.
8. transcript privilege validation.
9. output markup risk flagging.
10. explicit data-only execution policy for third-party content.

`guardian-policy.mjs` wraps all untrusted content in this regime before any downstream planning or tool authorization.

## Action policy

| Source | Treat as instruction? | Tool call from source? | Memory write from source? | External action from source? |
| --- | --- | --- | --- | --- |
| system/developer | yes, according to hierarchy | policy-controlled | policy-controlled | policy-controlled |
| user/owner | user intent only | Trust Kernel controlled | consent controlled | approval + risk controlled |
| web/file/retrieval/plugin/connector/tool/email/document | no | no | no | no |

## Red-team tools to add to CI/security testing

### NVIDIA garak
Purpose: broad LLM vulnerability scanning including prompt injection, leakage, jailbreak and encoding probes.

Steps:
1. Use a dedicated Python environment.
2. Install with `python -m pip install -U garak`.
3. Configure a non-production test model/endpoint.
4. Start with focused prompt-injection and encoding probe families.
5. Save JSONL results as CI artifacts.
6. Treat any successful injection or secret-leak detector as a release blocker until reviewed.

### promptmap2
Purpose: white-box or black-box prompt injection testing against custom LLM applications.

Steps:
1. Clone `utkusen/promptmap`.
2. Install its requirements in an isolated environment.
3. Prefer black-box mode against a dedicated STAARWAARDD staging endpoint so production prompts and credentials are not exported.
4. Use a strong independent controller model for evaluation.
5. Run prompt-stealing, distraction and jailbreak rule groups first.
6. Archive JSON output and convert repeatable failures into repository regression tests.

### Microsoft PyRIT
Purpose: programmable red-team orchestration for generative-AI systems.

Steps:
1. Install in a dedicated security environment.
2. Create a target adapter for STAARWAARDD staging.
3. Define attack objectives around policy override, prompt disclosure, indirect injection and tool misuse.
4. Use scorers independent of the target model where possible.
5. Feed confirmed failures back into deterministic tests and Guardian policy controls.

### Adversarial Robustness Toolbox (ART)
Purpose: broader ML-security evaluation including evasion, poisoning, extraction and inference.

Steps:
1. Install `adversarial-robustness-toolbox` only in the research/security environment.
2. Use it for model-level or multimodal robustness work rather than as the primary prompt-injection gate.
3. Keep findings separate from application-layer prompt-security results.

### Optional prompt classifier
HackTricks notes specialized prompt-injection classifiers such as Llama Prompt Guard 2. Guardian may later add a classifier as a secondary signal, never as the sole trust boundary.

## Release gates

A build is not release-ready if any of these are true:

- external content can alter Guardian policy or instruction hierarchy
- external content can trigger a tool or memory write without a separate trusted authorization path
- a client can inject privileged provider transcript objects
- prompt fragments bypass inspection when combined
- raw streamed output can create network-active HTML before sanitization
- system/developer secrets can be disclosed by a transformation, encoding or role-play route
- prompt scanner refusal/error is recorded as PASS instead of INCONCLUSIVE

## Milo and Mission Mode

Milo remains the first completion pilot. Any web page, uploaded production note, generated script, third-party tool response or provider output entering that Mission must retain provenance and be treated as data unless it originates from the authenticated owner instruction path. No external content may silently modify completion criteria or mark a Mission verified.
