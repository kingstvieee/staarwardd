# STAARWAARDD Expanded Implementation — Persistent Audit, Portal Integration, and Policy Boundaries

## Implemented

The Guardian audit ledger now supports durable local JSONL storage through `STAARWAARDD_AUDIT_PATH`, defaults to `data/guardian-audit.jsonl`, replays records on process start, and rejects tampered hash chains. Runtime audit records are excluded from Git. Completion tasks reconstruct from persisted task, evidence, verification, and acceptance receipts.

The portal registry exposes the intended seven canonical portals with controlled aliases and configuration-driven capabilities. Every capability is explicitly marked `NOT_CONNECTED` and `PREPARE_ONLY`. The portal-action endpoint resolves `Community` to `Events`, validates the requested capability, records a prepare-only authorization receipt, and never executes a provider action.

The Guardian Constitution policy layer adds L0–L5 severity decisions, deny-by-default approval rules, lockdown precedence, and an untrusted-content boundary. External pages, documents, transcripts, messages, videos, and tool outputs are treated as data only; they cannot change policy or authorize tools.

## Verification

- Full test suite: **19/19 passed**.
- Syntax check: passed for `server.mjs` and `public/app.js`.
- Diff check: passed.
- Persistence tests cover replay and tamper rejection.
- Completion tests cover reconstruction after a fresh ledger instance.
- HTTP tests cover policy, untrusted-content inspection, contract, integration registry, alias resolution, prepare-only portal action, authorization denial, and completion lifecycle.

## Boundaries

This remains a local durable prototype store, not a production database or tamper-resistant remote ledger. The audit file requires filesystem protection and backup policy before production use. Provider connectors, physical devices, external accounts, communications, purchases, bookings, publishing, and background automation remain disabled. Portal actions are preparation receipts only.

Owner authentication remains a prototype bearer-token gate using `STAARWAARDD_OWNER_TOKEN`; a production session/identity provider and account recovery flow are not claimed as implemented.

## Locked-surface impact

Existing cinematic assets, app identity, routes, audio defaults, legacy Community/Wellbeing behavior, and deterministic planner tests remain preserved. Canonical Events and Well-being identities are available through contract and integration APIs with backward-compatible aliases; visible portal-card migration remains staged to avoid replacing approved visual surfaces without a dedicated UI review.
