describe('Habit Editor - Detox', () => {
  beforeAll(async () => {
    await device.launchApp({newInstance: true});
  });

  it('should create a new habit', async () => {
    // Open Habit Editor
    // Assumes a button exists to open editor; fallback to direct navigation if needed
    await element(by.id('openHabitEditorBtn')).tap();
    await element(by.id('habitEditorNameInput')).tap();
    await element(by.id('habitEditorNameInput')).typeText('Morning Run');
    // Cadence: daily
    await element(by.id('habitEditorCadenceDaily')).tap();
    // Save
    await element(by.id('habitEditorSaveBtn')).tap();
    await expect(element(by.text('Morning Run'))).toBeVisible();
  });
});
