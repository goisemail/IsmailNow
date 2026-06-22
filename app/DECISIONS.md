# IsmailNow Build Decisions

This document captures implementation decisions made during development.
If a decision is pending, it stays open until we need it.

## Locked decisions

- Platform baseline: React Native CLI (bare) for Android + iOS.
- Source structure: app implementation lives under `app`, documentation remains in root `docs`, `notes`, `tests`.
- Navigation: React Navigation native stack.
- Approach: documentation-driven development with incremental feature delivery.

## Open decisions (defer until needed)

- SQLite package and migration helper details.
- State management boundaries for feature modules.
- Local notifications/reminder implementation package.
- Drive OAuth implementation details for backups.
- Analytics formula edge-case handling.
