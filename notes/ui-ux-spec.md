# UI/UX Specification (IsmailNow)

Date: 2026-03-11
App: habbitnow.apk

Overview
- Catalog of screens with purpose, key interactions, and visual notes.

Screen Catalog (baseline)
- Splash/Starting: branding, loading states
- Habits Dashboard: list or cards with progress indicators
- Habit Editor: create/edit habit, cadence, notes
- Habit Details: progress, history, and quick actions
- History: date-based activity log
- Reminders: create/edit reminder times and repeats
- Settings: notifications, backups, localization
- Backup/Restore: local backups and cloud backups (Drive)

Navigation
- Primary: Bottom tab or top navigation with a stack for each flow
- Transitions: subtle, mobile-friendly; maintain consistent motion

Design Principles
- Clear typography, accessible hit targets, responsive to portrait/landscape on mobile
- Brand color palette and high-contrast for readability
- Components: reusable buttons, inputs, cards, lists, and charts

Accessibility
- Labels for controls, aria-like semantics for screen readers (where supported by RN)
- High-contrast modes and color-blind friendly palettes

Notes
- This document will be iterated as the RN implementation evolves.
- MVP source of truth: plan-2026-03-11.md
