# APK Analysis Automation Guide (Semi-automatic, human-guided)

Date: 2026-03-11
App: habbitnow.apk

Goal
- Provide a practical semi-automatic workflow to analyze the APK, with structured manual inputs to guide the assistant toward a high-confidence APK analysis document.

Prerequisites
- macOS or Linux environment
- Tools (install as desired): apktool, jadx, aapt/aapt2, unzip, grep, sed, awk

Automated extraction steps (run locally)
- Step 1: Basic APK facts
  - aapt dump badging habbitnow.apk > apk-info.txt
  - Inspect apk-info.txt for package name, version, SDK requirements, supported screens
- Step 2: Decode resources and manifest
  - apktool d habbitnow.apk -o apk_decoded
  - The manifest and resources folder will be decoded for inspection
- Step 3: Decompile code (optional but helpful)
  - jadx -d jadx_out habbitnow.apk
- Step 4: Gather UI hints
  - Examine: apk_decoded/res/layout/*.xml to map screens and flows
  - Notes: identify custom views and navigation patterns
- Step 5: Strings and assets
  - Check: apk_decoded/res/values/strings.xml for UI text; collect key labels
- Step 6: Data-model hints (inference)
  - From layouts and code, infer core entities (Habit, HabitInstance, Reminder, HistoryEntry, UserProfile, etc.)
- Step 7: Offline/Sync hints
  - Look for DB usage hints in code or resources; note any sync logic or references to local vs remote data
- Step 8: Notifications and permissions
  - Search for references to notifications, permissions in manifest and code
- Step 9: Third-party integrations
  - Look for libraries in manifest and ProGuard rules, and strings indicating analytics or auth
- Step 10: Risks and gaps
  - Document potential blockers for a React Native rebuild based on observed architecture

Manual guidance prompts (to ensure high-quality results)
- After each automated extraction, fill the following prompts with your findings:
- 1) App Overview: Purpose, audience, platform specifics (fill from APK clues or deduced)
- 2) UI/UX Snapshot: Main nav, key screens, flows, visual language notes
- 3) Features: List major features with short descriptions
- 4) Data Model: Core entities and fields inferred from code/resources
- 5) API/Backend: Any backend indicators; offline-first hints
- 6) Offline/Sync: DB choice hints and sync approach
- 7) Notifications: Reminders and notification logic
- 8) Integrations: Any analytics/Auth/other services
- 9) Permissions: Runtime and manifest permissions
- 10) Risks: Known blockers for RN rebuild
- 11) Next Steps: Concrete actions and data artifacts to collect

Canonical consolidation step
- When you have filled the above, paste it here and I will synthesize a polished APK Analysis document at:
- habbitNow/IsmailNow/notes/apk-analysis-2026-03-11.md

Artifacts to capture (outputs you should prepare)
- feature_map.md, ui_snapshot.md, data_model.md, screen_flows.md as needed

Notes
- This guide is meant to be used as a manual-in-the-loop process to ensure high-quality analysis.
