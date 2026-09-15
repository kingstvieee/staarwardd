# Repository Role — STAARWAARDD Prototype Lab

This repository is **not** the canonical production STAAR Hub deployment repository.

## Purpose

Use this repository for Guardian architecture experiments, specifications, recovery work, proof-of-concept runtimes, NFC foundations, and other isolated prototypes.

The canonical production application lives in `kingstvieee/cross-life-ai`.

## Branch ownership

- `main` — prototype baseline only; do not connect to the canonical STAARWAARDD production Vercel project.
- `guardian-core-v1` — Guardian Core V1 contract/specification.
- `guardian-core-v1-runtime` — executable proof-of-concept implementation of that contract.
- `native-android-recovery` — recovery/reference work only.
- `staar-hub-nfc-foundation` — NFC research/foundation work only.
- `amazon-2026`, `FixiiitAi`, and other historical branches are legacy/experimental lanes here; they are not canonical deployment branches.

## Migration rule

Production-worthy ideas from this repository must be deliberately reimplemented or migrated into a dedicated branch of `kingstvieee/cross-life-ai`, tested there, and reviewed before reaching its `main` branch. Do not deploy this repository as the real STAAR Hub.
