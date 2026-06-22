# UI Test Harness (Detox) for IsmailNow

Overview
- End-to-end UI test harness for the React Native app using Detox on Android (and optional iOS guidance).
- Targets core MVP flows: Habit Editor, Reminders, History & Analytics.

Prerequisites
- Node.js and npm/yarn installed
- Android Studio with Android SDK and emulator configuration
- Java JDK installed
- Detox CLI installed: npm i -g detox-cli (or npx detox@latest)

Detox setup (RN app with Jest)
- Install: npm install --save-dev detox
- Init: npx detox init -r jest
- Update package.json test script to run Detox:
  - "scripts": { "test": "detox test --configuration android.emu.debug" }
- Android configuration in package.json or detox.config.js should include android.emu.debug, and testID hooks in app

Test structure (example files)
- tests/e2e/HabitEditor.e2e.js
  - Import detox, device, element, by, expect
  - Tests: create habit, validate UI changes, navigate to Habit Details
  - Use testIDs such as: habitEditorNameInput, habitEditorCadenceDaily, habitEditorSaveBtn, habitListItem-<id>, habitDetails

- tests/e2e/Reminders.e2e.js
  - Create reminder for a habit; verify notification scheduling UI (simulated) and list presence

- tests/e2e/HistoryAnalytics.e2e.js
  - Open History & Analytics; set date range; verify metrics are visible (text assertions) and trend visuals

Sample test skeletons
```js
// tests/e2e/HabitEditor.e2e.js
describe('Habit Editor', () => {
  beforeAll(async () => {
    await device.launchApp({newInstance: true});
  });

  it('should create a new habit', async () => {
    await element(by.id('habitEditorNameInput')).typeText('Morning Run');
    await element(by.id('habitEditorCadenceDaily')).tap();
    await element(by.id('habitEditorSaveBtn')).tap();
    await expect(element(by.text('Morning Run'))).toBeVisible();
  });
});
```

Running tests
- For Android: adb devices, start emulator, then run: npm test
- Detox will install native binaries; follow prompts on first run
- Use Detox logs to diagnose failures and adjust testIDs in app code accordingly

Notes
- The React Native app must expose testIDs on UI elements to enable Detox selectors.
- This harness focuses on Android MVP; iOS guidance can be added later if needed.
